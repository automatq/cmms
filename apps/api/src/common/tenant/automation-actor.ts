import { EntityManager } from 'typeorm';

/**
 * Background jobs (PM auto-generation) create records whose "created by"
 * column is a real user foreign key, so they need an actual user to act as.
 * Use the organization's owner, falling back to an admin; only active
 * memberships qualify. Returns null when the tenant has no such member.
 */
export async function resolveAutomationUserId(
  manager: Pick<EntityManager, 'query'>,
  tenantId: string,
): Promise<string | null> {
  const rows: Array<{ user_id: string }> = await manager.query(
    `SELECT m.user_id
       FROM members m
       JOIN users u ON u.id = m.user_id
      WHERE m.organization_id = $1
        AND m.role IN ('owner', 'admin')
        AND COALESCE(m.status, 'active') <> 'inactive'
        AND COALESCE(u.banned, false) = false
      ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.created_at ASC
      LIMIT 1`,
    [tenantId],
  );
  return rows[0]?.user_id ?? null;
}

/** Per-run cache so a scheduler pass resolves each tenant once. */
export function automationActorCache(manager: Pick<EntityManager, 'query'>) {
  const cache = new Map<string, Promise<string | null>>();
  return (tenantId: string) => {
    let hit = cache.get(tenantId);
    if (!hit) {
      hit = resolveAutomationUserId(manager, tenantId);
      cache.set(tenantId, hit);
    }
    return hit;
  };
}
