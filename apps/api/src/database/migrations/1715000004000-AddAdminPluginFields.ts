import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminPluginFields1715000004000 implements MigrationInterface {
  name = 'AddAdminPluginFields1715000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users: Better Auth admin plugin columns
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR,
        ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS ban_reason TEXT,
        ADD COLUMN IF NOT EXISTS ban_expires TIMESTAMP
    `);

    // Partial index — only superadmin/banned rows are interesting to scan.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IS NOT NULL`,
    );

    // sessions: impersonation pointer (NULL for normal sessions).
    await queryRunner.query(`
      ALTER TABLE sessions
        ADD COLUMN IF NOT EXISTS impersonated_by VARCHAR
    `);

    // Audit log for sensitive cross-tenant operations.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id VARCHAR NOT NULL,
        actor_role VARCHAR NOT NULL,
        action VARCHAR NOT NULL,
        target_type VARCHAR,
        target_id VARCHAR,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id, created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_log_target`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_log_actor`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_log`);
    await queryRunner.query(`ALTER TABLE sessions DROP COLUMN IF EXISTS impersonated_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_role`);
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS ban_expires,
        DROP COLUMN IF EXISTS ban_reason,
        DROP COLUMN IF EXISTS banned,
        DROP COLUMN IF EXISTS role
    `);
  }
}
