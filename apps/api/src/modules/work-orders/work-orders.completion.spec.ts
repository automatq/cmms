jest.mock('../files/files.service', () => ({ FilesService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('../assets/downtime.service', () => ({ DowntimeService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));

import { BadRequestException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderStatus } from './entities/work-order.entity';

function setup(opts: { issueFails?: boolean; partsInDb?: any[] } = {}) {
  const parts = opts.partsInDb ?? [
    { id: 'wp1', woId: 'wo1', tenantId: 't1', partId: 'p1', storeroomId: 's1', qtyUsed: 5, reserved: true },
  ];
  const wo = { id: 'wo1', woNumber: 'WO-1', status: WorkOrderStatus.IN_PROGRESS, actualStart: new Date(), parts };

  const workOrderRepository = {
    findOne: jest.fn().mockResolvedValue(wo),
    save: jest.fn().mockImplementation(async (w) => w),
  };
  const partRepository = { find: jest.fn().mockResolvedValue(parts.map((p) => ({ ...p }))) };
  const laborRepository = { find: jest.fn().mockResolvedValue([]) };
  const woPartTxRepo = {
    findOne: jest.fn().mockImplementation(async ({ where }) => {
      const p = parts.find((x) => x.id === where.id);
      return p ? { ...p } : null;
    }),
    save: jest.fn().mockImplementation(async (p) => {
      Object.assign(parts.find((x) => x.id === p.id)!, p);
      return p;
    }),
  };
  const manager = { getRepository: () => woPartTxRepo };
  const dataSource = { transaction: jest.fn().mockImplementation((fn) => fn(manager)) };
  const inventoryService = {
    issueReservedStock: jest.fn().mockImplementation(async () => {
      if (opts.issueFails) throw new BadRequestException('Insufficient stock');
    }),
    issueStock: jest.fn(),
    releaseReservation: jest.fn(),
  };

  const svc = new WorkOrdersService(
    workOrderRepository as any, laborRepository as any, partRepository as any,
    {} as any, {} as any, {} as any, {} as any, {} as any,
    { onWoStatusChanged: jest.fn() } as any,
    inventoryService as any,
    { endDowntime: jest.fn() } as any,
    { trigger: jest.fn() } as any,
    {} as any,
    dataSource as any,
  );
  return { svc, workOrderRepository, inventoryService, woPartTxRepo, parts, manager };
}

describe('WorkOrdersService completion consumes reserved parts', () => {
  it('issues reserved parts via issueReservedStock inside a transaction', async () => {
    const { svc, inventoryService, parts, manager } = setup();
    await svc.updateStatus('wo1', WorkOrderStatus.COMPLETED, 'u1', 't1');
    expect(inventoryService.issueReservedStock).toHaveBeenCalledWith(
      expect.objectContaining({ partId: 'p1', storeroomId: 's1', qty: 5, workOrderId: 'wo1' }),
      'u1',
      't1',
      manager,
    );
    // The old, broken path (issue unreserved stock, then release) is gone.
    expect(inventoryService.issueStock).not.toHaveBeenCalled();
    expect(parts[0].reserved).toBe(false);
  });

  it('fails the completion (and does not save the WO) when parts cannot be issued', async () => {
    const { svc, workOrderRepository } = setup({ issueFails: true });
    await expect(svc.updateStatus('wo1', WorkOrderStatus.COMPLETED, 'u1', 't1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(workOrderRepository.save).not.toHaveBeenCalled();
  });

  it('skips parts already consumed by a concurrent completion', async () => {
    const { svc, inventoryService, woPartTxRepo } = setup();
    // Locked re-read shows the part was consumed after our initial read.
    woPartTxRepo.findOne.mockResolvedValueOnce({ id: 'wp1', reserved: false, storeroomId: 's1' });
    await svc.updateStatus('wo1', WorkOrderStatus.COMPLETED, 'u1', 't1');
    expect(inventoryService.issueReservedStock).not.toHaveBeenCalled();
  });

  it('webhook failures no longer throw a ReferenceError after the status is saved', async () => {
    const { svc } = setup({ partsInDb: [] });
    (svc as any).webhooksService.trigger.mockRejectedValue(new Error('boom'));
    await expect(svc.updateStatus('wo1', WorkOrderStatus.COMPLETED, 'u1', 't1')).resolves.toBeDefined();
  });
});
