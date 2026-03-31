import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetTagsAndActivityAbandonment1711800001000
  implements MigrationInterface
{
  name = 'AddAssetTagsAndActivityAbandonment1711800001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assets"
      ADD COLUMN "asset_tag_token" varchar,
      ADD COLUMN "asset_tag_version" integer NOT NULL DEFAULT 1,
      ADD COLUMN "asset_tag_regenerated_at" timestamptz,
      ADD COLUMN "asset_tag_regenerated_by" uuid
    `);

    await queryRunner.query(`
      UPDATE "assets"
      SET "asset_tag_token" = replace(uuid_generate_v4()::text, '-', '')
      WHERE "asset_tag_token" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "assets"
      ALTER COLUMN "asset_tag_token" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_assets_asset_tag_token"
      ON "assets" ("asset_tag_token")
    `);

    await queryRunner.query(`
      ALTER TABLE "tech_activities"
      ADD COLUMN "abandoned_at" timestamptz,
      ADD COLUMN "abandon_reason" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tech_activities"
      DROP COLUMN "abandon_reason",
      DROP COLUMN "abandoned_at"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_assets_asset_tag_token"
    `);

    await queryRunner.query(`
      ALTER TABLE "assets"
      DROP COLUMN "asset_tag_regenerated_by",
      DROP COLUMN "asset_tag_regenerated_at",
      DROP COLUMN "asset_tag_version",
      DROP COLUMN "asset_tag_token"
    `);
  }
}
