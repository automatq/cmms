import { BadRequestException } from '@nestjs/common';
import { EntityManager, EntityTarget, In } from 'typeorm';

/**
 * Marker used in place of an entity class for user references. Users are not
 * tenant-scoped rows; a user id is valid for a tenant only when the user has an
 * active membership (`members.user_id` / `members.organization_id`).
 */
export const TENANT_MEMBER = 'tenant-member' as const;

export type TenantRefTarget = EntityTarget<any> | typeof TENANT_MEMBER;

export interface TenantRef {
  /** Tenant-scoped entity class (must have a `tenantId` column), or TENANT_MEMBER. */
  entity: TenantRefTarget;
  /** Id (or ids) to verify. null / undefined / '' entries are skipped. */
  id: string | null | undefined | Array<string | null | undefined>;
  /** Field name used in the error message. */
  field: string;
}

/**
 * Verify that every referenced record belongs to `tenantId`. Runs one query per
 * referenced entity type and throws BadRequestException(`Invalid <field>`) when
 * any id is not found within the tenant. Id format (UUID) is expected to be
 * validated by the DTO.
 *
 * Call this before persisting any foreign key taken from request input.
 */
export async function assertTenantRefs(
  manager: EntityManager,
  tenantId: string,
  refs: TenantRef[],
): Promise<void> {
  // Group requested ids by target, remembering which field each id came from.
  const groups = new Map<TenantRefTarget, Map<string, string>>();
  for (const ref of refs) {
    const ids = Array.isArray(ref.id) ? ref.id : [ref.id];
    for (const id of ids) {
      if (id === null || id === undefined || id === '') continue;
      if (typeof id !== 'string') {
        throw new BadRequestException(`Invalid ${ref.field}`);
      }
      let group = groups.get(ref.entity);
      if (!group) {
        group = new Map();
        groups.set(ref.entity, group);
      }
      if (!group.has(id)) group.set(id, ref.field);
    }
  }

  for (const [target, idToField] of groups) {
    const ids = [...idToField.keys()];
    let found: Set<string>;
    if (target === TENANT_MEMBER) {
      const rows: Array<{ user_id: string }> = await manager.query(
        `SELECT user_id FROM members
          WHERE organization_id = $1
            AND user_id = ANY($2::uuid[])
            AND COALESCE(status, 'active') <> 'inactive'`,
        [tenantId, ids],
      );
      found = new Set(rows.map((r) => String(r.user_id).toLowerCase()));
    } else {
      const rows: Array<{ id: string }> = await manager.getRepository(target).find({
        select: { id: true } as any,
        where: { id: In(ids), tenantId } as any,
      });
      found = new Set(rows.map((r) => String(r.id).toLowerCase()));
    }
    for (const id of ids) {
      if (!found.has(id.toLowerCase())) {
        throw new BadRequestException(`Invalid ${idToField.get(id)}`);
      }
    }
  }
}

/**
 * Verify that setting `parentId` on record `id` doesn't make the record its
 * own ancestor. Walks the existing parent chain within the tenant.
 */
export async function assertNoParentCycle(
  manager: EntityManager,
  entity: EntityTarget<any>,
  tenantId: string,
  id: string,
  parentId: string | null | undefined,
  field = 'parentId',
): Promise<void> {
  if (!parentId) return;
  const repo = manager.getRepository(entity);
  const visited = new Set<string>();
  let current: string | null | undefined = parentId;
  // Bounded walk: hierarchies are shallow; the bound guards against bad data.
  for (let depth = 0; current && depth < 100; depth++) {
    if (current.toLowerCase() === id.toLowerCase() || visited.has(current)) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    visited.add(current);
    const row: { parentId?: string | null } | null = await repo.findOne({
      select: { id: true, parentId: true } as any,
      where: { id: current, tenantId } as any,
    });
    current = row?.parentId;
  }
}

/**
 * Defense in depth for loaded relation graphs: removes any related entity whose
 * `tenantId` differs from `tenantId` (dropped from arrays, removed from
 * single relations), recursing through the kept entities. The root object is
 * expected to already be tenant-scoped by its query. Objects without a
 * `tenantId` property (e.g. users, dates, JSON columns) are left untouched.
 */
export function stripForeignTenantRelations<T>(root: T, tenantId: string): T {
  const seen = new WeakSet<object>();
  const isEntity = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v) && 'tenantId' in (v as object);

  const visit = (node: Record<string, unknown>) => {
    if (seen.has(node)) return;
    seen.add(node);
    for (const key of Object.keys(node)) {
      if (key === 'tenant') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (!value.some(isEntity)) continue;
        const kept = value.filter((item) => !isEntity(item) || item.tenantId === tenantId);
        if (kept.length !== value.length) node[key] = kept;
        kept.forEach((item) => isEntity(item) && visit(item));
      } else if (isEntity(value)) {
        if (value.tenantId !== tenantId) {
          // Delete rather than null so a later save() of this entity doesn't
          // treat it as an explicit relation change.
          delete node[key];
        } else {
          visit(value);
        }
      }
    }
  };

  if (Array.isArray(root)) {
    root.forEach((item) => isEntity(item) && visit(item));
  } else if (isEntity(root)) {
    visit(root);
  }
  return root;
}
