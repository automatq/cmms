import { Pool } from 'pg';

/**
 * Shared pg pool for auth-time lookups (guard + websocket gateway). Kept
 * separate from TypeORM so the guard has no Nest DI dependencies.
 */
let pool: Pool | undefined;
export function getAuthPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    pool = databaseUrl
      ? new Pool({
          connectionString: databaseUrl,
          ssl:
            process.env.DB_SSL === 'true' || databaseUrl.includes('sslmode=require')
              ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
              : undefined,
        })
      : new Pool({
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432', 10),
          user: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
          ssl:
            process.env.DB_SSL === 'true'
              ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
              : undefined,
        });
  }
  return pool;
}

export type MembershipResult =
  | { ok: true; role: string }
  | { ok: false; reason: string };

export const MEMBER_STATUS_INACTIVE = 'inactive';

/**
 * Resolve the caller's membership in `tenantId`. Denies when there is no
 * member row (removed from org) or the membership is deactivated.
 */
export async function resolveMembership(
  userId: string,
  tenantId: string,
  query: (sql: string, params: unknown[]) => Promise<{ rows: any[] }> = (sql, params) =>
    getAuthPool().query(sql, params),
): Promise<MembershipResult> {
  const { rows } = await query(
    `SELECT role, status FROM members WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
    [userId, tenantId],
  );
  const member = rows[0];
  if (!member) {
    return { ok: false, reason: 'You are not a member of this organization' };
  }
  if (member.status === MEMBER_STATUS_INACTIVE) {
    return { ok: false, reason: 'Your access to this organization has been deactivated' };
  }
  return { ok: true, role: member.role || 'member' };
}
