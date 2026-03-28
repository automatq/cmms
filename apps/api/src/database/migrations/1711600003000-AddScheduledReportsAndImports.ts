import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddScheduledReportsAndImports1711600003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 1. Scheduled Reports =====
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "scheduled_report_type_enum" AS ENUM ('work_orders', 'assets', 'pm_compliance', 'inventory', 'costs', 'downtime');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "report_format_enum" AS ENUM ('csv', 'pdf');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.createTable(
      new Table({
        name: 'scheduled_reports',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'report_type', type: 'scheduled_report_type_enum', isNullable: false },
          { name: 'filters', type: 'jsonb', isNullable: true },
          { name: 'schedule', type: 'varchar', isNullable: false },
          { name: 'recipient_emails', type: 'text', isArray: true, isNullable: false },
          { name: 'format', type: 'report_format_enum', default: `'csv'` },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'last_run_at', type: 'timestamptz', isNullable: true },
          { name: 'created_by', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'scheduled_reports',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ===== 2. Import Jobs =====
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "import_type_enum" AS ENUM ('assets', 'locations', 'parts', 'work_orders');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "import_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.createTable(
      new Table({
        name: 'import_jobs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'type', type: 'import_type_enum', isNullable: false },
          { name: 'status', type: 'import_status_enum', default: `'pending'` },
          { name: 'total_rows', type: 'int', default: 0 },
          { name: 'processed_rows', type: 'int', default: 0 },
          { name: 'error_rows', type: 'int', default: 0 },
          { name: 'error_details', type: 'jsonb', isNullable: true },
          { name: 'column_mapping', type: 'jsonb', isNullable: true },
          { name: 'storage_key', type: 'varchar', isNullable: true },
          { name: 'uploaded_by', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'completed_at', type: 'timestamptz', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'import_jobs',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'import_jobs',
      new TableIndex({
        name: 'IDX_import_jobs_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('import_jobs');
    await queryRunner.query('DROP TYPE IF EXISTS "import_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "import_type_enum"');
    await queryRunner.dropTable('scheduled_reports');
    await queryRunner.query('DROP TYPE IF EXISTS "report_format_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "scheduled_report_type_enum"');
  }
}
