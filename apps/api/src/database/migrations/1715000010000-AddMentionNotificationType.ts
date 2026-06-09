import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMentionNotificationType1715000010000 implements MigrationInterface {
  name = 'AddMentionNotificationType1715000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // New value used by @mention notifications on work-order comments.
    await queryRunner.query(
      `ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'mention'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot drop a value from an enum type; intentionally a no-op.
  }
}
