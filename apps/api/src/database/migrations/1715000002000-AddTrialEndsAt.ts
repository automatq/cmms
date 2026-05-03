import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrialEndsAt1715000002000 implements MigrationInterface {
  name = 'AddTrialEndsAt1715000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMPTZ`,
    );
    // Backfill existing orgs to a 14-day trial from now
    await queryRunner.query(
      `UPDATE "organizations" SET "trial_ends_at" = now() + interval '14 days' WHERE "trial_ends_at" IS NULL AND "status" = 'trial'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "trial_ends_at"`);
  }
}
