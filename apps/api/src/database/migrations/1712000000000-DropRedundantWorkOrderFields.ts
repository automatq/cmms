import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRedundantWorkOrderFields1712000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS assigned_to;`);
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS due_date;`);
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS estimated_hours;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_to UUID[] NOT NULL DEFAULT '{}';`,
    );
    await queryRunner.query(
      `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;`,
    );
    await queryRunner.query(
      `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2);`,
    );
  }
}
