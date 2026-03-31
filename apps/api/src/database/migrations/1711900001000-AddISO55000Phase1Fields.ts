import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddISO55000Phase1Fields1711900001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add hold_reason enum and column to work_orders
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE hold_reason_enum AS ENUM ('awaiting_parts', 'awaiting_approval', 'safety_lockout', 'scheduling', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS hold_reason hold_reason_enum;
    `);

    // 2. Add lockout_required, is_library, category to checklist_templates
    await queryRunner.query(`
      ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS lockout_required BOOLEAN DEFAULT false NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS is_library BOOLEAN DEFAULT false NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS category VARCHAR;
    `);

    // 3. Add abc_class enum and column to parts
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE abc_class_enum AS ENUM ('A', 'B', 'C');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE parts ADD COLUMN IF NOT EXISTS abc_class abc_class_enum;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE parts DROP COLUMN IF EXISTS abc_class;`);
    await queryRunner.query(`DROP TYPE IF EXISTS abc_class_enum;`);
    await queryRunner.query(`ALTER TABLE checklist_templates DROP COLUMN IF EXISTS lockout_required;`);
    await queryRunner.query(`ALTER TABLE work_orders DROP COLUMN IF EXISTS hold_reason;`);
    await queryRunner.query(`DROP TYPE IF EXISTS hold_reason_enum;`);
  }
}
