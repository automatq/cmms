import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameClerkToAuth01714000000000 implements MigrationInterface {
  name = 'RenameClerkToAuth01714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" RENAME COLUMN "clerk_org_id" TO "auth0_org_id"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenants_clerk_org_id"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_auth0_org_id" ON "tenants" ("auth0_org_id") WHERE "auth0_org_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenants_auth0_org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" RENAME COLUMN "auth0_org_id" TO "clerk_org_id"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_clerk_org_id" ON "tenants" ("clerk_org_id") WHERE "clerk_org_id" IS NOT NULL`,
    );
  }
}
