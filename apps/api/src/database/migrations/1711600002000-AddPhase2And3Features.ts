import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableColumn } from 'typeorm';

export class AddPhase2And3Features1711600002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 1. Webhook Subscriptions =====
    await queryRunner.createTable(
      new Table({
        name: 'webhook_subscriptions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'url', type: 'varchar', isNullable: false },
          { name: 'events', type: 'text', isArray: true, isNullable: false },
          { name: 'secret', type: 'varchar', isNullable: false },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'last_triggered_at', type: 'timestamptz', isNullable: true },
          { name: 'fail_count', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'webhook_subscriptions',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ===== 2. Webhook Logs =====
    await queryRunner.createTable(
      new Table({
        name: 'webhook_logs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'subscription_id', type: 'uuid', isNullable: false },
          { name: 'event', type: 'varchar', isNullable: false },
          { name: 'payload', type: 'jsonb', isNullable: false },
          { name: 'response_status', type: 'int', isNullable: true },
          { name: 'response_body', type: 'text', isNullable: true },
          { name: 'success', type: 'boolean', isNullable: false },
          { name: 'attempt_number', type: 'int', isNullable: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'webhook_logs',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'webhook_logs',
      new TableForeignKey({
        columnNames: ['subscription_id'],
        referencedTableName: 'webhook_subscriptions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_subscription',
        columnNames: ['subscription_id', 'created_at'],
      }),
    );

    // ===== 3. Service Contracts =====
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_type_enum" AS ENUM ('full_service', 'labor_only', 'parts_only', 'warranty_extension');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "renewal_type_enum" AS ENUM ('auto', 'manual', 'none');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_status_enum" AS ENUM ('active', 'expiring', 'expired', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.createTable(
      new Table({
        name: 'service_contracts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'supplier_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'contract_number', type: 'varchar', isNullable: true },
          { name: 'type', type: 'contract_type_enum', isNullable: false },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: false },
          { name: 'cost', type: 'decimal', precision: 12, scale: 2, isNullable: true },
          { name: 'renewal_type', type: 'renewal_type_enum', default: `'none'` },
          { name: 'terms', type: 'text', isNullable: true },
          { name: 'sla_response_hours', type: 'int', isNullable: true },
          { name: 'sla_resolution_hours', type: 'int', isNullable: true },
          { name: 'status', type: 'contract_status_enum', default: `'active'` },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'service_contracts',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'service_contracts',
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
      }),
    );

    // Service contract assets join table
    await queryRunner.createTable(
      new Table({
        name: 'service_contract_assets',
        columns: [
          { name: 'contract_id', type: 'uuid', isNullable: false },
          { name: 'asset_id', type: 'uuid', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'service_contract_assets',
      new TableIndex({
        name: 'PK_service_contract_assets',
        columnNames: ['contract_id', 'asset_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'service_contract_assets',
      new TableForeignKey({
        columnNames: ['contract_id'],
        referencedTableName: 'service_contracts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'service_contract_assets',
      new TableForeignKey({
        columnNames: ['asset_id'],
        referencedTableName: 'assets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ===== 4. Public request fields on work_requests =====
    await queryRunner.addColumns('work_requests', [
      new TableColumn({
        name: 'submitter_name',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'tracking_token',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      }),
    ]);

    // ===== 5. Signature field on wo_checklist_results =====
    await queryRunner.addColumn(
      'wo_checklist_results',
      new TableColumn({
        name: 'signature_key',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('wo_checklist_results', 'signature_key');
    await queryRunner.dropColumn('work_requests', 'tracking_token');
    await queryRunner.dropColumn('work_requests', 'submitter_name');
    await queryRunner.dropTable('service_contract_assets');
    await queryRunner.dropTable('service_contracts');
    await queryRunner.query('DROP TYPE IF EXISTS "contract_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "renewal_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "contract_type_enum"');
    await queryRunner.dropTable('webhook_logs');
    await queryRunner.dropTable('webhook_subscriptions');
  }
}
