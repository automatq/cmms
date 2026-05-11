/**
 * Promote an existing user account to MainTek superadmin.
 *
 * Usage:
 *   EMAIL=paul@maintek.app npm run promote-superadmin --workspace=@maintek/api
 *
 * Requirements:
 *   - The user must already exist (signed up via the normal flow).
 *   - Database connection is read from the same env vars as the API
 *     (DATABASE_URL or DB_HOST/DB_USERNAME/DB_PASSWORD/DB_DATABASE).
 *
 * To revoke superadmin: pass REVOKE=true
 *   EMAIL=paul@maintek.app REVOKE=true npm run promote-superadmin --workspace=@maintek/api
 */
import { Pool } from 'pg';

async function main(): Promise<void> {
  const email = process.env.EMAIL;
  if (!email) {
    console.error('ERROR: EMAIL env var is required.');
    console.error('  Usage: EMAIL=user@example.com npm run promote-superadmin --workspace=@maintek/api');
    process.exit(1);
  }

  const revoke = process.env.REVOKE === 'true';
  const databaseUrl = process.env.DATABASE_URL;

  const pool = databaseUrl
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

  try {
    const newRole = revoke ? null : 'superadmin';
    const result = await pool.query<{ id: string; email: string; role: string | null }>(
      `UPDATE users SET role = $1, updated_at = now() WHERE email = $2 RETURNING id, email, role`,
      [newRole, email],
    );

    if (result.rowCount === 0) {
      console.error(`ERROR: no user found with email '${email}'.`);
      console.error('  The user must sign up via the normal flow first.');
      process.exit(2);
    }

    const row = result.rows[0];
    const action = revoke ? 'revoked superadmin from' : 'promoted to superadmin';
    console.log(`${action}: ${row.email} (id=${row.id}, role=${row.role ?? 'null'})`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('promote-superadmin failed:', err);
  process.exit(1);
});
