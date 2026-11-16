jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryStock } from './entities/inventory-stock.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { Part } from './entities/part.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoLineItem } from './entities/po-line-item.entity';

/**
 * Minimal in-memory stand-in for Postgres row locking under READ COMMITTED:
 *  - plain reads return a snapshot copy immediately (no blocking)
 *  - `lock: { mode: 'pessimistic_write' }` reads block until the row's lock is
 *    free, and the lock is held until the transaction ends
 * That is enough to reproduce the lost-update bug and prove the fix.
 */
class FakeDb {
  stock = new Map<string, any>();
  txLog: any[] = [];
  private locks = new Map<string, Promise<void>>();
  lockRequests: any[] = [];
  pos = new Map<string, any>();

  key(w: any) {
    return `${w.tenantId}:${w.partId}:${w.storeroomId}`;
  }

  private async acquire(key: string, held: Array<() => void>) {
    while (this.locks.has(key)) await this.locks.get(key);
    let release!: () => void;
    this.locks.set(key, new Promise<void>((r) => (release = r)));
    held.push(() => {
      this.locks.delete(key);
      release();
    });
  }

  manager(held: Array<() => void>): any {
    const db = this;
    const tick = () => new Promise((r) => setImmediate(r));
    return {
      getRepository(entity: any) {
        if (entity === InventoryStock) {
          return {
            async findOne(opts: any) {
              if (opts.lock) {
                db.lockRequests.push(opts.lock);
                await db.acquire(db.key(opts.where), held);
              }
              await tick();
              const row = db.stock.get(db.key(opts.where));
              return row ? { ...row } : null;
            },
            async find(opts: any) {
              return [...db.stock.values()].filter((r) => r.partId === opts.where.partId).map((r) => ({ ...r }));
            },
            create: (o: any) => ({ ...o }),
            async save(o: any) {
              await tick();
              for (const r of Array.isArray(o) ? o : [o]) db.stock.set(db.key(r), { ...r });
              return o;
            },
          };
        }
        if (entity === InventoryTransaction) {
          return { create: (o: any) => ({ ...o }), save: async (o: any) => (db.txLog.push(o), o) };
        }
        if (entity === Part) {
          return { findOne: async () => ({ id: 'p1', name: 'Filter', unitCost: 10 }) };
        }
        if (entity === PurchaseOrder) {
          return {
            async findOne(opts: any) {
              if (opts.lock) {
                db.lockRequests.push(opts.lock);
                await db.acquire(`po:${opts.where.id}`, held);
              }
              await tick();
              const po = db.pos.get(opts.where.id);
              return po ? JSON.parse(JSON.stringify(po)) : null;
            },
            save: async (o: any) => {
              const stored = db.pos.get(o.id);
              db.pos.set(o.id, { ...stored, status: o.status });
              return o;
            },
          };
        }
        if (entity === PoLineItem) {
          return {
            save: async (li: any) => {
              const po = [...db.pos.values()].find((p) => p.lineItems.some((l: any) => l.id === li.id));
              const stored = po.lineItems.find((l: any) => l.id === li.id);
              stored.qtyReceived = li.qtyReceived;
              return li;
            },
          };
        }
        throw new Error(`unexpected repo ${entity?.name}`);
      },
      createQueryBuilder() {
        let values: any;
        const qb: any = {
          insert: () => qb,
          into: () => qb,
          values: (v: any) => ((values = v), qb),
          orIgnore: () => qb,
          execute: async () => {
            if (!db.stock.has(db.key(values))) db.stock.set(db.key(values), { ...values });
          },
        };
        return qb;
      },
    };
  }

  dataSource(): any {
    return {
      transaction: async (fn: any) => {
        const held: Array<() => void> = [];
        try {
          return await fn(this.manager(held));
        } finally {
          held.forEach((r) => r());
        }
      },
    };
  }
}

function makeService(db: FakeDb) {
  const notifications = { onLowStock: jest.fn() };
  const svc = new InventoryService(
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    db.dataSource(),
    notifications as any,
  );
  return svc;
}

const T = 't1';
const seed = (db: FakeDb, onHand: number, reserved = 0) =>
  db.stock.set(`${T}:p1:s1`, { tenantId: T, partId: 'p1', storeroomId: 's1', qtyOnHand: onHand, qtyReserved: reserved, qtyOnOrder: 0 });
const row = (db: FakeDb, store = 's1') => db.stock.get(`${T}:p1:${store}`);

describe('InventoryService stock locking', () => {
  it('two concurrent issues cannot both consume the same stock (no lost update)', async () => {
    const db = new FakeDb();
    seed(db, 6);
    const svc = makeService(db);

    const results = await Promise.allSettled([
      svc.issueStock({ partId: 'p1', storeroomId: 's1', qty: 5 }, 'u1', T),
      svc.issueStock({ partId: 'p1', storeroomId: 's1', qty: 5 }, 'u2', T),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(BadRequestException);
    expect(row(db).qtyOnHand).toBe(1);
  });

  it('concurrent receipts all land', async () => {
    const db = new FakeDb();
    seed(db, 0);
    const svc = makeService(db);
    await Promise.all(
      [1, 2, 3, 4].map(() => svc.receiveStock({ partId: 'p1', storeroomId: 's1', qty: 5 } as any, 'u', T)),
    );
    expect(row(db).qtyOnHand).toBe(20);
  });

  it('concurrent reservations cannot over-reserve', async () => {
    const db = new FakeDb();
    seed(db, 5);
    const svc = makeService(db);
    const results = await Promise.allSettled([
      svc.reserveStock({ partId: 'p1', storeroomId: 's1', qty: 3, workOrderId: 'w1' }, 'u', T),
      svc.reserveStock({ partId: 'p1', storeroomId: 's1', qty: 3, workOrderId: 'w2' }, 'u', T),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(row(db).qtyReserved).toBe(3);
  });

  it('opposite-direction transfers complete without deadlock and conserve stock', async () => {
    const db = new FakeDb();
    seed(db, 10);
    db.stock.set(`${T}:p1:s2`, { tenantId: T, partId: 'p1', storeroomId: 's2', qtyOnHand: 10, qtyReserved: 0, qtyOnOrder: 0 });
    const svc = makeService(db);
    await Promise.all([
      svc.transferStock({ partId: 'p1', fromStoreroomId: 's1', toStoreroomId: 's2', qty: 4 } as any, 'u', T),
      svc.transferStock({ partId: 'p1', fromStoreroomId: 's2', toStoreroomId: 's1', qty: 3 } as any, 'u', T),
    ]);
    expect(row(db, 's1').qtyOnHand).toBe(9);
    expect(row(db, 's2').qtyOnHand).toBe(11);
  });

  it('every stock mutation takes a pessimistic_write lock', async () => {
    const db = new FakeDb();
    seed(db, 10);
    const svc = makeService(db);
    await svc.issueStock({ partId: 'p1', storeroomId: 's1', qty: 1 }, 'u', T);
    await svc.reserveStock({ partId: 'p1', storeroomId: 's1', qty: 1, workOrderId: 'w' }, 'u', T);
    await svc.releaseReservation({ partId: 'p1', storeroomId: 's1', qty: 1, workOrderId: 'w' }, 'u', T);
    await svc.adjustStock({ partId: 'p1', storeroomId: 's1', adjustmentQty: 1, reason: 'count' } as any, 'u', T);
    await svc.receiveStock({ partId: 'p1', storeroomId: 's1', qty: 1 } as any, 'u', T);
    expect(db.lockRequests).toHaveLength(5);
    expect(db.lockRequests.every((l) => l.mode === 'pessimistic_write')).toBe(true);
  });
});

describe('InventoryService.issueReservedStock', () => {
  it('consumes stock fully reserved by the same work order', async () => {
    // Before the fix this was the failing case: on hand 5, reserved 5.
    const db = new FakeDb();
    seed(db, 5, 5);
    const svc = makeService(db);
    await svc.issueReservedStock({ partId: 'p1', storeroomId: 's1', qty: 5, workOrderId: 'w1' }, 'u', T);
    expect(row(db)).toMatchObject({ qtyOnHand: 0, qtyReserved: 0 });
    expect(db.txLog.map((t) => [t.type, t.qty])).toEqual([
      ['release', -5],
      ['issue', -5],
    ]);
  });

  it('leaves other work orders\' reservations intact', async () => {
    const db = new FakeDb();
    seed(db, 10, 8); // 3 reserved for this WO, 5 for another
    const svc = makeService(db);
    await svc.issueReservedStock({ partId: 'p1', storeroomId: 's1', qty: 3, workOrderId: 'w1' }, 'u', T);
    expect(row(db)).toMatchObject({ qtyOnHand: 7, qtyReserved: 5 });
  });

  it('refuses to issue more than is on hand', async () => {
    const db = new FakeDb();
    seed(db, 2, 2);
    const svc = makeService(db);
    await expect(
      svc.issueReservedStock({ partId: 'p1', storeroomId: 's1', qty: 5, workOrderId: 'w1' }, 'u', T),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(row(db)).toMatchObject({ qtyOnHand: 2, qtyReserved: 2 });
  });
});

describe('InventoryService.receivePurchaseOrder', () => {
  function seedPo(db: FakeDb) {
    db.pos.set('po1', {
      id: 'po1',
      tenantId: T,
      status: 'sent',
      lineItems: [{ id: 'li1', partId: 'p1', storeroomId: 's1', qtyOrdered: 10, qtyReceived: 0, unitCost: 1, part: { name: 'Filter' } }],
    });
  }

  function svcWithPoLookup(db: FakeDb) {
    const svc = makeService(db);
    jest.spyOn(svc, 'findPurchaseOrderById').mockImplementation(async (id: string, _t: string, manager: any) =>
      manager.getRepository(PurchaseOrder).findOne({ where: { id, tenantId: T } }),
    );
    return svc;
  }

  it('rejects receiving more than is outstanding on a line', async () => {
    const db = new FakeDb();
    seed(db, 0);
    seedPo(db);
    const svc = svcWithPoLookup(db);
    await expect(
      svc.receivePurchaseOrder('po1', { lineItems: [{ lineItemId: 'li1', qtyReceived: 11 }] } as any, 'u', T),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(row(db).qtyOnHand).toBe(0);
  });

  it('two clerks receiving the full PO at once cannot double-count stock', async () => {
    const db = new FakeDb();
    seed(db, 0);
    seedPo(db);
    const svc = svcWithPoLookup(db);
    const results = await Promise.allSettled([
      svc.receivePurchaseOrder('po1', { lineItems: [{ lineItemId: 'li1', qtyReceived: 10 }] } as any, 'u1', T),
      svc.receivePurchaseOrder('po1', { lineItems: [{ lineItemId: 'li1', qtyReceived: 10 }] } as any, 'u2', T),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(row(db).qtyOnHand).toBe(10);
  });
});
