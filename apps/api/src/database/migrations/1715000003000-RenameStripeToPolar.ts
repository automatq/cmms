import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameStripeToPolar1715000003000 implements MigrationInterface {
  name = 'RenameStripeToPolar1715000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename stripe_customer_id → polar_customer_id (idempotent)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'stripe_customer_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'polar_customer_id'
        ) THEN
          ALTER TABLE organizations RENAME COLUMN stripe_customer_id TO polar_customer_id;
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'polar_customer_id'
        ) THEN
          ALTER TABLE organizations ADD COLUMN polar_customer_id TEXT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'stripe_subscription_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'polar_subscription_id'
        ) THEN
          ALTER TABLE organizations RENAME COLUMN stripe_subscription_id TO polar_subscription_id;
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'polar_subscription_id'
        ) THEN
          ALTER TABLE organizations ADD COLUMN polar_subscription_id TEXT;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_organizations_polar_customer_id ON organizations(polar_customer_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_organizations_polar_subscription_id ON organizations(polar_subscription_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_organizations_polar_subscription_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_organizations_polar_customer_id`,
    );
    await queryRunner.query(
      `ALTER TABLE organizations RENAME COLUMN polar_subscription_id TO stripe_subscription_id`,
    );
    await queryRunner.query(
      `ALTER TABLE organizations RENAME COLUMN polar_customer_id TO stripe_customer_id`,
    );
  }
}
