import { BadRequestException } from '@nestjs/common';
import {
  assertTenantRefs,
  assertNoParentCycle,
  stripForeignTenantRelations,
  TENANT_MEMBER,
} from './assert-tenant-refs';

class Asset {}
class Location {}

const T1 = '11111111-1111-1111-1111-111111111111';
const T2 = '22222222-2222-2222-2222-222222222222';
const A1 = 'aaaaaaaa-0000-0000-0000-000000000001'; // tenant 1
const A2 = 'aaaaaaaa-0000-0000-0000-000000000002'; // tenant 2
const L1 = 'bbbbbbbb-0000-0000-0000-000000000001'; // tenant 1
const U1 = 'cccccccc-0000-0000-0000-000000000001'; // active member of T1
const U2 = 'cccccccc-0000-0000-0000-000000000002'; // member of T2 only
const U3 = 'cccccccc-0000-0000-0000-000000000003'; // inactive member of T1

function fakeManager() {
  const rows = new Map<any, Array<{ id: string; tenantId: string; parentId?: string | null }>>([
    [Asset, [{ id: A1, tenantId: T1 }, { id: A2, tenantId: T2 }]],
    [Location, [{ id: L1, tenantId: T1 }]],
  ]);
  const members = [
    { user_id: U1, organization_id: T1, status: 'active' },
    { user_id: U2, organization_id: T2, status: 'active' },
    { user_id: U3, organization_id: T1, status: 'inactive' },
  ];
  const find = jest.fn(async (entity: any, opts: any) =>
    (rows.get(entity) || []).filter(
      (r) => r.tenantId === opts.where.tenantId && opts.where.id.value.includes(r.id),
    ),
  );
  const query = jest.fn(async (_sql: string, [tenantId, ids]: [string, string[]]) =>
    members.filter((m) => m.organization_id === tenantId && ids.includes(m.user_id) && m.status !== 'inactive'),
  );
  return {
    rows,
    find,
    query,
    getRepository: (entity: any) => ({
      find: (opts: any) => find(entity, opts),
      findOne: async (opts: any) =>
        (rows.get(entity) || []).find((r) => r.id === opts.where.id && r.tenantId === opts.where.tenantId) ?? null,
    }),
  };
}

describe('assertTenantRefs', () => {
  it('accepts ids that belong to the tenant', async () => {
    const m = fakeManager();
    await expect(
      assertTenantRefs(m as any, T1, [
        { entity: Asset, id: A1, field: 'assetId' },
        { entity: Location, id: L1, field: 'locationId' },
        { entity: TENANT_MEMBER, id: U1, field: 'assignedToId' },
      ]),
    ).resolves.toBeUndefined();
  });

  it('rejects an id owned by another tenant with the field name', async () => {
    const m = fakeManager();
    await expect(
      assertTenantRefs(m as any, T1, [{ entity: Asset, id: A2, field: 'assetId' }]),
    ).rejects.toThrow(new BadRequestException('Invalid assetId'));
  });

  it('rejects unknown ids', async () => {
    const m = fakeManager();
    await expect(
      assertTenantRefs(m as any, T1, [
        { entity: Location, id: 'bbbbbbbb-0000-0000-0000-00000000ffff', field: 'locationId' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('skips null/undefined/empty ids without querying', async () => {
    const m = fakeManager();
    await assertTenantRefs(m as any, T1, [
      { entity: Asset, id: undefined, field: 'assetId' },
      { entity: Location, id: null, field: 'locationId' },
      { entity: TENANT_MEMBER, id: '', field: 'userId' },
    ]);
    expect(m.find).not.toHaveBeenCalled();
    expect(m.query).not.toHaveBeenCalled();
  });

  it('runs one query per entity and checks every id in an array', async () => {
    const m = fakeManager();
    await expect(
      assertTenantRefs(m as any, T1, [
        { entity: Asset, id: A1, field: 'parentId' },
        { entity: Asset, id: [A1, A2], field: 'assetIds' },
      ]),
    ).rejects.toThrow('Invalid assetIds');
    expect(m.find).toHaveBeenCalledTimes(1);
  });

  it('matches ids case-insensitively', async () => {
    const m = fakeManager();
    m.find.mockImplementationOnce(async () => [{ id: A1, tenantId: T1 }]);
    await expect(
      assertTenantRefs(m as any, T1, [{ entity: Asset, id: A1.toUpperCase(), field: 'assetId' }]),
    ).resolves.toBeUndefined();
  });

  it('checks users through active tenant membership', async () => {
    const m = fakeManager();
    await expect(
      assertTenantRefs(m as any, T1, [{ entity: TENANT_MEMBER, id: U2, field: 'userId' }]),
    ).rejects.toThrow('Invalid userId');
    await expect(
      assertTenantRefs(m as any, T1, [{ entity: TENANT_MEMBER, id: U3, field: 'userId' }]),
    ).rejects.toThrow('Invalid userId');
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toMatch(/FROM members/);
    expect(sql).toMatch(/organization_id = \$1/);
    expect(sql).toMatch(/inactive/);
    expect(params).toEqual([T1, [U2]]);
  });
});

describe('assertNoParentCycle', () => {
  it('rejects a record becoming its own parent or ancestor', async () => {
    const m = fakeManager();
    const X = 'aaaaaaaa-0000-0000-0000-00000000000a';
    const Y = 'aaaaaaaa-0000-0000-0000-00000000000b';
    m.rows.get(Asset)!.push({ id: X, tenantId: T1, parentId: null }, { id: Y, tenantId: T1, parentId: X });
    await expect(assertNoParentCycle(m as any, Asset, T1, X, X)).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertNoParentCycle(m as any, Asset, T1, X, Y)).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertNoParentCycle(m as any, Asset, T1, Y, A1)).resolves.toBeUndefined();
  });
});

describe('stripForeignTenantRelations', () => {
  it('removes related entities of other tenants at any depth', () => {
    const tree: any = {
      id: 'root',
      tenantId: T1,
      parent: { id: 'p', tenantId: T2 },
      location: { id: 'l', tenantId: T1 },
      createdBy: { id: 'u', email: 'x@example.com' }, // users have no tenantId: untouched
      children: [
        { id: 'c1', tenantId: T1, children: [{ id: 'g1', tenantId: T2 }, { id: 'g2', tenantId: T1 }] },
        { id: 'c2', tenantId: T2 },
      ],
      metadata: { foo: 'bar' },
    };
    stripForeignTenantRelations(tree, T1);
    expect(tree.parent).toBeUndefined();
    expect(tree.location.id).toBe('l');
    expect(tree.createdBy.email).toBe('x@example.com');
    expect(tree.children.map((c: any) => c.id)).toEqual(['c1']);
    expect(tree.children[0].children.map((c: any) => c.id)).toEqual(['g2']);
    expect(tree.metadata).toEqual({ foo: 'bar' });
  });

  it('handles arrays of roots', () => {
    const list: any[] = [{ id: 'a', tenantId: T1, children: [{ id: 'b', tenantId: T2 }] }];
    stripForeignTenantRelations(list, T1);
    expect(list[0].children).toEqual([]);
  });
});
