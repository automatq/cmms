import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-organization membership status. Deactivating a user in one org must
 * revoke their access to THAT org only (users are global identities shared
 * across orgs), so the flag lives on `members`, not `users`.
 *
 * Backfill: memberships of users already marked inactive become inactive, so
 * existing deactivations start being enforced.
 */
export class AddMemberStatus1715000012000 implements MigrationInterface {
  name = 'AddMemberStatus1715000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "status" varchar NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(`
      UPDATE "members" m SET "status" = 'inactive'
      FROM "users" u
      WHERE u.id = m.user_id AND u.status::text = 'inactive'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "members" DROP COLUMN IF EXISTS "status"`);
  }
}
