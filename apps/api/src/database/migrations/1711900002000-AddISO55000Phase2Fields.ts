import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddISO55000Phase2Fields1711900002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create failure_codes table with hierarchical structure
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE failure_code_level_enum AS ENUM ('category', 'mechanism', 'cause');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS failure_codes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        level failure_code_level_enum NOT NULL,
        parent_id UUID REFERENCES failure_codes(id),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(tenant_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failure_codes_tenant ON failure_codes(tenant_id);
    `);

    // 2. Create asset_parts BOM junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS asset_parts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
        qty DECIMAL(8,2) DEFAULT 1 NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(tenant_id, asset_id, part_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_parts_tenant_asset ON asset_parts(tenant_id, asset_id);
    `);

    // 3. Create asset_condition_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS asset_condition_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        condition SMALLINT NOT NULL CHECK (condition >= 1 AND condition <= 5),
        assessed_by UUID NOT NULL,
        assessed_at TIMESTAMPTZ NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_condition_logs_lookup
        ON asset_condition_logs(tenant_id, asset_id, assessed_at);
    `);

    // 4. Add criticality_rating enum and column to assets
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE criticality_rating_enum AS ENUM ('critical', 'high', 'medium', 'low', 'negligible');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS criticality_rating criticality_rating_enum;
    `);

    // Backfill criticality_rating from is_critical boolean
    await queryRunner.query(`
      UPDATE assets SET criticality_rating = 'critical' WHERE is_critical = true AND criticality_rating IS NULL;
    `);

    // 5. Add failure_code_id FK to work_orders
    await queryRunner.query(`
      ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS failure_code_id UUID REFERENCES failure_codes(id);
    `);

    // 6. Add failure_code_id FK to asset_downtimes
    await queryRunner.query(`
      ALTER TABLE asset_downtimes ADD COLUMN IF NOT EXISTS failure_code_id UUID REFERENCES failure_codes(id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE asset_downtimes DROP COLUMN IF EXISTS failure_code_id;`);
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS failure_code_id;`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN IF EXISTS criticality_rating;`);
    await queryRunner.query(`DROP TYPE IF EXISTS criticality_rating_enum;`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_condition_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_parts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS failure_codes;`);
    await queryRunner.query(`DROP TYPE IF EXISTS failure_code_level_enum;`);
  }
}
