import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddISO55000Phase3Fields1711900003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add travel_time and wait_time to wo_labor for wrench time tracking
    await queryRunner.query(`
      ALTER TABLE wo_labor ADD COLUMN IF NOT EXISTS travel_time DECIMAL(5,2);
    `);
    await queryRunner.query(`
      ALTER TABLE wo_labor ADD COLUMN IF NOT EXISTS wait_time DECIMAL(5,2);
    `);

    // 2. Add approval workflow fields to work_orders
    // First, add 'pending_approval' to the work_order_status enum
    await queryRunner.query(`
      ALTER TYPE work_order_status_enum ADD VALUE IF NOT EXISTS 'pending_approval' BEFORE 'open';
    `);

    await queryRunner.query(`
      ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS approved_by UUID;
    `);
    await queryRunner.query(`
      ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS approved_at;`);
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS approved_by;`);
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS requires_approval;`);
    // Note: PostgreSQL doesn't support removing enum values, but the extra value won't cause issues
    await queryRunner.query(`ALTER TABLE wo_labor DROP COLUMN IF EXISTS wait_time;`);
    await queryRunner.query(`ALTER TABLE wo_labor DROP COLUMN IF EXISTS travel_time;`);
  }
}
