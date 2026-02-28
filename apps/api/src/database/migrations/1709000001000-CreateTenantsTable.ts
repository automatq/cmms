import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantsTable1709000001000 implements MigrationInterface {
  name = 'CreateTenantsTable1709000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tenant_status_enum" AS ENUM('active', 'trial', 'suspended', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "plan_tier_enum" AS ENUM('free', 'pro', 'enterprise');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    // Rename organizations table to tenants
    await queryRunner.query(`ALTER TABLE "organizations" RENAME TO "tenants"`);

    // Rename primary key constraint
    await queryRunner.query(`ALTER TABLE "tenants" RENAME CONSTRAINT "PK_organizations" TO "PK_tenants"`);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "slug" character varying,
      ADD COLUMN "status" "tenant_status_enum" NOT NULL DEFAULT 'active',
      ADD COLUMN "plan" "plan_tier_enum" NOT NULL DEFAULT 'free',
      ADD COLUMN "stripe_customer_id" character varying,
      ADD COLUMN "stripe_subscription_id" character varying,
      ADD COLUMN "auth0_org_id" character varying,
      ADD COLUMN "user_count" integer NOT NULL DEFAULT 0,
      ADD COLUMN "asset_count" integer NOT NULL DEFAULT 0,
      ADD COLUMN "storage_bytes_used" bigint NOT NULL DEFAULT 0
    `);

    // Set slug for existing rows (based on lowercased name, replacing spaces with hyphens)
    await queryRunner.query(`
      UPDATE "tenants"
      SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'))
      WHERE "slug" IS NULL
    `);

    // Make slug NOT NULL and UNIQUE after populating
    await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "slug" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug")`);

    // Add indexes
    await queryRunner.query(`CREATE INDEX "IDX_tenants_stripe_customer" ON "tenants" ("stripe_customer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_tenants_auth0_org" ON "tenants" ("auth0_org_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_tenants_status" ON "tenants" ("status")`);

    // Ensure at least one tenant exists (for existing deployments)
    await queryRunner.query(`
      INSERT INTO "tenants" ("name", "slug", "status", "plan", "modules")
      SELECT 'Default Organization', 'default', 'active', 'enterprise',
        '{"preventiveMaintenance":true,"inventory":true,"purchaseOrders":true,"reports":true,"aiAssistant":true,"sensors":false,"workRequestsPortal":true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM "tenants" LIMIT 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_auth0_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_stripe_customer"`);

    // Drop new columns
    await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "UQ_tenants_slug"`);
    await queryRunner.query(`
      ALTER TABLE "tenants"
      DROP COLUMN IF EXISTS "slug",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "plan",
      DROP COLUMN IF EXISTS "stripe_customer_id",
      DROP COLUMN IF EXISTS "stripe_subscription_id",
      DROP COLUMN IF EXISTS "auth0_org_id",
      DROP COLUMN IF EXISTS "user_count",
      DROP COLUMN IF EXISTS "asset_count",
      DROP COLUMN IF EXISTS "storage_bytes_used"
    `);

    // Rename back
    await queryRunner.query(`ALTER TABLE "tenants" RENAME CONSTRAINT "PK_tenants" TO "PK_organizations"`);
    await queryRunner.query(`ALTER TABLE "tenants" RENAME TO "organizations"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "plan_tier_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenant_status_enum"`);
  }
}
