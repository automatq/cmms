import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Better Auth's invitation table needs a created_at timestamp.
 * Initial InstallBetterAuth migration omitted it.
 */
export class AddInvitationsCreatedAt1715000001000 implements MigrationInterface {
  name = 'AddInvitationsCreatedAt1715000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invitations" DROP COLUMN IF EXISTS "created_at"`);
  }
}
