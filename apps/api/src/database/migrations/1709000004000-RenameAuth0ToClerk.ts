import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAuth0ToClerk1709000004000 implements MigrationInterface {
  name = 'RenameAuth0ToClerk1709000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tenants' AND column_name = 'auth0_org_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'tenants' AND column_name = 'clerk_org_id')
        THEN
          ALTER TABLE "tenants" RENAME COLUMN "auth0_org_id" TO "clerk_org_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_auth0_org_id"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenants_clerk_org_id"
      ON "tenants" ("clerk_org_id") WHERE "clerk_org_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_clerk_org_id"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tenants' AND column_name = 'clerk_org_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'tenants' AND column_name = 'auth0_org_id')
        THEN
          ALTER TABLE "tenants" RENAME COLUMN "clerk_org_id" TO "auth0_org_id";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenants_auth0_org_id"
      ON "tenants" ("auth0_org_id") WHERE "auth0_org_id" IS NOT NULL
    `);
  }
}
