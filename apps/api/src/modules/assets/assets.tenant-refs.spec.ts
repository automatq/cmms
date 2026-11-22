jest.mock('../files/files.service', () => ({ FilesService: class {} }));
jest.mock('../../common/tenant/usage.service', () => ({ UsageService: class {} }));
jest.mock('../../common/tenant/tenant.service', () => ({ TenantService: class {} }));

import { BadRequestException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { Location } from './entities/location.entity';

const T1 = '11111111-1111-1111-1111-111111111111';
const T2 = '22222222-2222-2222-2222-222222222222';
const OWN_ASSET = 'aaaaaaaa-0000-0000-0000-000000000001';
const FOREIGN_ASSET = 'aaaaaaaa-0000-0000-0000-000000000002';
const FOREIGN_LOCATION = 'bbbbbbbb-0000-0000-0000-000000000002';
const FOREIGN_CATEGORY = 'dddddddd-0000-0000-0000-000000000002';

function makeService() {
  const rows = new Map<any, Array<{ id: string; tenantId: string; parentId?: string | null }>>([
    [Asset, [{ id: OWN_ASSET, tenantId: T1 }, { id: FOREIGN_ASSET, tenantId: T2 }]],
    [Location, [{ id: FOREIGN_LOCATION, tenantId: T2 }]],
    [AssetCategory, [{ id: FOREIGN_CATEGORY, tenantId: T2 }]],
  ]);
  const manager = {
    getRepository: (entity: any) => ({
      find: async (opts: any) =>
        (rows.get(entity) || []).filter(
          (r) => r.tenantId === opts.where.tenantId && opts.where.id.value.includes(r.id),
        ),
      findOne: async (opts: any) =>
        (rows.get(entity) || []).find((r) => r.id === opts.where.id && r.tenantId === opts.where.tenantId) ?? null,
    }),
  };
  const assetRepository = {
    manager,
    create: jest.fn((o) => o),
    save: jest.fn(async (o) => o),
    findOne: jest.fn(),
  };
  const locationRepository = { manager, create: jest.fn((o) => o), save: jest.fn(async (o) => o), findOne: jest.fn() };
  const categoryRepository = { manager, create: jest.fn((o) => o), save: jest.fn(async (o) => o), findOne: jest.fn() };
  const usage = { enforceAssetLimit: jest.fn() };
  const svc = new AssetsService(
    assetRepository as any,
    categoryRepository as any,
    {} as any,
    {} as any,
    locationRepository as any,
    {} as any,
    { get: () => '' } as any,
    usage as any,
    { incrementAssetCount: jest.fn() } as any,
  );
  return { svc, assetRepository, locationRepository, categoryRepository, usage };
}

describe('AssetsService tenant reference validation', () => {
  it('rejects creating an asset under another tenant\'s parent asset', async () => {
    const { svc, assetRepository, usage } = makeService();
    await expect(
      svc.create({ name: 'Pump', parentId: FOREIGN_ASSET } as any, 'u1', T1),
    ).rejects.toThrow(new BadRequestException('Invalid parentId'));
    expect(assetRepository.save).not.toHaveBeenCalled();
    expect(usage.enforceAssetLimit).not.toHaveBeenCalled();
  });

  it('rejects creating an asset with another tenant\'s location or category', async () => {
    const { svc, assetRepository } = makeService();
    await expect(svc.create({ name: 'Pump', locationId: FOREIGN_LOCATION } as any, 'u1', T1)).rejects.toThrow(
      'Invalid locationId',
    );
    await expect(svc.create({ name: 'Pump', categoryId: FOREIGN_CATEGORY } as any, 'u1', T1)).rejects.toThrow(
      'Invalid categoryId',
    );
    expect(assetRepository.save).not.toHaveBeenCalled();
  });

  it('rejects re-parenting an asset to another tenant\'s asset or to itself', async () => {
    const { svc, assetRepository } = makeService();
    assetRepository.findOne.mockResolvedValue({ id: OWN_ASSET, tenantId: T1, children: [] });
    await expect(svc.update(OWN_ASSET, { parentId: FOREIGN_ASSET } as any, T1)).rejects.toThrow('Invalid parentId');
    await expect(svc.update(OWN_ASSET, { parentId: OWN_ASSET } as any, T1)).rejects.toThrow('Invalid parentId');
    expect(assetRepository.save).not.toHaveBeenCalled();
  });

  it('rejects locations and categories nested under another tenant\'s records', async () => {
    const { svc, locationRepository, categoryRepository } = makeService();
    await expect(svc.createLocation({ name: 'Bay', parentId: FOREIGN_LOCATION } as any, T1)).rejects.toThrow(
      'Invalid parentId',
    );
    await expect(svc.createCategory({ name: 'HVAC', parentId: FOREIGN_CATEGORY } as any, T1)).rejects.toThrow(
      'Invalid parentId',
    );
    expect(locationRepository.save).not.toHaveBeenCalled();
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  it('never returns another tenant\'s records in the location tree', async () => {
    const { svc, locationRepository } = makeService();
    (locationRepository as any).find = jest.fn(async () => [
      {
        id: 'l1',
        tenantId: T1,
        children: [
          { id: 'l2', tenantId: T1, children: [] },
          { id: 'x', tenantId: T2, children: [] },
        ],
      },
    ]);
    const tree = await svc.getLocationTree(T1);
    expect(tree[0].children.map((c) => c.id)).toEqual(['l2']);
  });
});
