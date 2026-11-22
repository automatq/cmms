import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Tenant entity (organizations table) has had an `onboarding_completed`
 * column for a while, but no migration ever added it, so fresh databases
 * fail on /api/auth/organization/create. Add it idempotently.
 */
export class AddOrganizationOnboardingCompleted1715000012000 implements MigrationInterface {
  name = 'AddOrganizationOnboardingCompleted1715000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "onboarding_completed"`);
  }
}
