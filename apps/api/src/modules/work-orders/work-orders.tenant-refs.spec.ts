jest.mock('../files/files.service', () => ({ FilesService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('../assets/downtime.service', () => ({ DowntimeService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { PublicRequestsController } from './public-requests.controller';
import { Asset } from '../assets/entities/asset.entity';
import { Location } from '../assets/entities/location.entity';
import { TenantStatus } from '../users/entities/tenant.entity';

const T1 = '11111111-1111-1111-1111-111111111111';
const T2 = '22222222-2222-2222-2222-222222222222';
const OWN_ASSET = 'aaaaaaaa-0000-0000-0000-000000000001';
const FOREIGN_ASSET = 'aaaaaaaa-0000-0000-0000-000000000002';
const OWN_LOCATION = 'bbbbbbbb-0000-0000-0000-000000000001';
const FOREIGN_USER = 'cccccccc-0000-0000-0000-000000000002';

/** Manager answering tenant-reference lookups from an in-memory row list. */
function refManager() {
  const rows = new Map<any, Array<{ id: string; tenantId: string }>>([
    [Asset, [{ id: OWN_ASSET, tenantId: T1 }, { id: FOREIGN_ASSET, tenantId: T2 }]],
    [Location, [{ id: OWN_LOCATION, tenantId: T1 }]],
  ]);
  return {
    getRepository: (entity: any) => ({
      find: async (opts: any) =>
        (rows.get(entity) || []).filter(
          (r) => r.tenantId === opts.where.tenantId && opts.where.id.value.includes(r.id),
        ),
    }),
    // members: nobody from another tenant is a member of T1
    query: jest.fn(async () => []),
  };
}

function makeWoService() {
  const manager = refManager();
  const workOrderRepository = {
    manager,
    create: jest.fn((o) => o),
    save: jest.fn(async (o) => ({ id: 'wo1', ...o })),
    findOne: jest.fn(async () => ({ id: 'wo1', tenantId: T1, assignedToId: null, parts: [] })),
    createQueryBuilder: jest.fn(() => ({
      where: () => ({ andWhere: () => ({ orderBy: () => ({ getOne: async () => null }) }) }),
    })),
  };
  const laborRepository = { manager, create: jest.fn((o) => o), save: jest.fn(async (o) => o) };
  const workRequestRepository = { manager, create: jest.fn((o) => o), save: jest.fn(async (o) => o) };
  const svc = new WorkOrdersService(
    workOrderRepository as any,
    laborRepository as any,
    { manager } as any,
    {} as any, {} as any,
    workRequestRepository as any,
    {} as any, {} as any,
    { onWorkRequestSubmitted: jest.fn(), onWorkOrderAssigned: jest.fn() } as any,
    {} as any, {} as any,
    { trigger: jest.fn() } as any,
    {} as any,
    { manager } as any,
  );
  return { svc, workOrderRepository, laborRepository, workRequestRepository };
}

describe('WorkOrdersService tenant reference validation', () => {
  it('rejects creating a work order with another tenant\'s asset', async () => {
    const { svc, workOrderRepository } = makeWoService();
    await expect(
      svc.create({ title: 'Leak', assetId: FOREIGN_ASSET } as any, 'u1', T1),
    ).rejects.toThrow(new BadRequestException('Invalid assetId'));
    expect(workOrderRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an unknown location on create', async () => {
    const { svc, workOrderRepository } = makeWoService();
    await expect(
      svc.create({ title: 'Leak', locationId: 'bbbbbbbb-0000-0000-0000-00000000ffff' } as any, 'u1', T1),
    ).rejects.toThrow('Invalid locationId');
    expect(workOrderRepository.save).not.toHaveBeenCalled();
  });

  it('rejects updating a work order to another tenant\'s asset or a non-member assignee', async () => {
    const { svc, workOrderRepository } = makeWoService();
    await expect(svc.update('wo1', { assetId: FOREIGN_ASSET } as any, 'u1', T1)).rejects.toThrow('Invalid assetId');
    await expect(svc.update('wo1', { assignedToId: FOREIGN_USER } as any, 'u1', T1)).rejects.toThrow(
      'Invalid assignedToId',
    );
    expect(workOrderRepository.save).not.toHaveBeenCalled();
  });

  it('rejects logging labor for a user outside the tenant', async () => {
    const { svc, laborRepository } = makeWoService();
    await expect(
      svc.addLabor('wo1', { userId: FOREIGN_USER, hours: 1 } as any, 'u1', T1),
    ).rejects.toThrow('Invalid userId');
    expect(laborRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a work request referencing another tenant\'s asset', async () => {
    const { svc, workRequestRepository } = makeWoService();
    await expect(
      svc.createRequest({ title: 'Broken', assetId: FOREIGN_ASSET } as any, T1),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(workRequestRepository.save).not.toHaveBeenCalled();
  });
});

describe('PublicRequestsController', () => {
  const tenant = (over: any = {}) => ({
    id: T1,
    slug: 'acme',
    status: TenantStatus.ACTIVE,
    modules: { workRequestsPortal: true },
    ...over,
  });

  function makeController(t: any) {
    const manager = refManager();
    const assetRepository = {
      find: jest.fn(async () => [
        { id: OWN_ASSET, assetNumber: 'A-1', name: 'Pump', locationId: OWN_LOCATION, assetTagToken: 'secret-token' },
      ]),
      findOne: jest.fn(async () => ({
        id: OWN_ASSET, assetNumber: 'A-1', name: 'Pump', locationId: OWN_LOCATION, assetTagToken: 'secret-token',
      })),
    };
    const workRequestRepository = {
      manager,
      create: jest.fn((o) => o),
      save: jest.fn(async (o) => ({ id: 'wr1', ...o })),
    };
    const ctrl = new PublicRequestsController(
      workRequestRepository as any,
      { findOne: jest.fn(async () => t) } as any,
      assetRepository as any,
      { onWorkRequestSubmitted: jest.fn() } as any,
    );
    return { ctrl, assetRepository, workRequestRepository };
  }

  it('lists assets without asset tag tokens', async () => {
    const { ctrl, assetRepository } = makeController(tenant());
    const result = await ctrl.listAssets('acme');
    expect(result).toEqual([{ id: OWN_ASSET, assetNumber: 'A-1', name: 'Pump', locationId: OWN_LOCATION }]);
    expect(JSON.stringify(result)).not.toContain('secret-token');
    const select = (assetRepository.find.mock.calls[0] as any[])[0].select;
    expect(select).not.toContain('assetTagToken');
  });

  it('resolves a scanned tag without returning the token', async () => {
    const { ctrl } = makeController(tenant());
    const result = await ctrl.findAssetByTag('acme', 'secret-token');
    expect(result).toEqual({ id: OWN_ASSET, assetNumber: 'A-1', name: 'Pump', locationId: OWN_LOCATION });
  });

  it.each([
    ['unknown slug', null],
    ['portal disabled', tenant({ modules: { workRequestsPortal: false } })],
    ['portal flag missing', tenant({ modules: {} })],
    ['suspended', tenant({ status: TenantStatus.SUSPENDED })],
    ['cancelled', tenant({ status: TenantStatus.CANCELLED })],
  ])('returns 404 for the asset list and submissions when %s', async (_label, t) => {
    const { ctrl, assetRepository, workRequestRepository } = makeController(t);
    await expect(ctrl.listAssets('acme')).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctrl.findAssetByTag('acme', 'secret-token')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      ctrl.submitRequest('acme', { title: 'x', submitterName: 'n', submitterEmail: 'a@b.co' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(assetRepository.find).not.toHaveBeenCalled();
    expect(workRequestRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a public submission referencing another tenant\'s asset', async () => {
    const { ctrl, workRequestRepository } = makeController(tenant());
    await expect(
      ctrl.submitRequest('acme', { title: 'x', submitterName: 'n', assetId: FOREIGN_ASSET } as any),
    ).rejects.toThrow('Invalid assetId');
    expect(workRequestRepository.save).not.toHaveBeenCalled();
  });

  it('accepts a public submission for the tenant\'s own asset', async () => {
    const { ctrl, workRequestRepository } = makeController(tenant());
    const res = await ctrl.submitRequest('acme', {
      title: 'x', submitterName: 'n', assetId: OWN_ASSET, locationId: OWN_LOCATION,
    } as any);
    expect(res.trackingToken).toBeDefined();
    expect(workRequestRepository.save).toHaveBeenCalledWith(expect.objectContaining({ tenantId: T1, assetId: OWN_ASSET }));
  });
});
