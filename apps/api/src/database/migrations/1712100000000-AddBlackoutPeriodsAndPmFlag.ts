import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlackoutPeriodsAndPmFlag1712100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS blackout_periods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_blackout_periods_tenant_dates ON blackout_periods (tenant_id, start_date, end_date);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_blackout_periods_tenant_id ON blackout_periods (tenant_id);`,
    );
    await queryRunner.query(
      `ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS ignore_blackouts BOOLEAN NOT NULL DEFAULT FALSE;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE pm_plans DROP COLUMN IF EXISTS ignore_blackouts;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_blackout_periods_tenant_dates;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_blackout_periods_tenant_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS blackout_periods;`);
  }
}
