import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkOrderSlaFields1715000012000 implements MigrationInterface {
  name = 'AddWorkOrderSlaFields1715000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SLA target completion time + how many escalation steps have fired.
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "due_date" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "escalation_level" integer NOT NULL DEFAULT 0`,
    );
    // Hot path: the SLA scheduler scans open WOs that have a due date.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_work_orders_due_date" ON "work_orders" ("due_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_orders_due_date"`);
    await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "escalation_level"`);
    await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "due_date"`);
  }
}
