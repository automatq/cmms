import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkOrderAssignee1715000011000 implements MigrationInterface {
  name = 'AddWorkOrderAssignee1715000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "assigned_to_id" uuid`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_orders"
          ADD CONSTRAINT "FK_work_orders_assigned_to"
          FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_work_orders_assigned_to" ON "work_orders" ("assigned_to_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_orders_assigned_to"`);
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "FK_work_orders_assigned_to"`,
    );
    await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "assigned_to_id"`);
  }
}
