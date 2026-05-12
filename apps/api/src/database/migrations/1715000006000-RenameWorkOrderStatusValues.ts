import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameWorkOrderStatusValues1715000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Migrate rows with status='closed' to status='completed',
    //    preserving the closed_at timestamp into completed_at where empty.
    await queryRunner.query(`
      UPDATE work_orders
         SET status = 'completed',
             completed_at = COALESCE(completed_at, closed_at)
       WHERE status = 'closed';
    `);

    // 2. Drop the closed_at column (merged into completed_at).
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS closed_at;`);

    // 3. Recreate the enum: rename draft -> requested, drop closed, add cancelled.
    await queryRunner.query(`ALTER TYPE work_order_status_enum RENAME TO work_order_status_enum_old;`);
    await queryRunner.query(`
      CREATE TYPE work_order_status_enum AS ENUM(
        'requested',
        'pending_approval',
        'open',
        'in_progress',
        'on_hold',
        'completed',
        'cancelled'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE work_orders
        ALTER COLUMN status DROP DEFAULT,
        ALTER COLUMN status TYPE work_order_status_enum
          USING (
            CASE status::text
              WHEN 'draft' THEN 'requested'
              WHEN 'closed' THEN 'completed'
              ELSE status::text
            END
          )::work_order_status_enum,
        ALTER COLUMN status SET DEFAULT 'requested'::work_order_status_enum;
    `);
    await queryRunner.query(`DROP TYPE work_order_status_enum_old;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE work_order_status_enum RENAME TO work_order_status_enum_old;`);
    await queryRunner.query(`
      CREATE TYPE work_order_status_enum AS ENUM(
        'draft',
        'pending_approval',
        'open',
        'in_progress',
        'on_hold',
        'completed',
        'closed'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE work_orders
        ALTER COLUMN status DROP DEFAULT,
        ALTER COLUMN status TYPE work_order_status_enum
          USING (
            CASE status::text
              WHEN 'requested' THEN 'draft'
              WHEN 'cancelled' THEN 'closed'
              ELSE status::text
            END
          )::work_order_status_enum,
        ALTER COLUMN status SET DEFAULT 'open'::work_order_status_enum;
    `);
    await queryRunner.query(`DROP TYPE work_order_status_enum_old;`);

    await queryRunner.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;`);
  }
}
