import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableColumn } from 'typeorm';

export class AddCompetitiveFeatures1711600001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 1. Asset Downtimes =====
    await queryRunner.createTable(
      new Table({
        name: 'asset_downtimes',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'asset_id', type: 'uuid', isNullable: false },
          { name: 'work_order_id', type: 'uuid', isNullable: true },
          { name: 'started_at', type: 'timestamptz', isNullable: false },
          { name: 'ended_at', type: 'timestamptz', isNullable: true },
          { name: 'reason', type: 'varchar', isNullable: true },
          { name: 'reported_by', type: 'uuid', isNullable: false },
          { name: 'duration_minutes', type: 'int', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'asset_downtimes',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'asset_downtimes',
      new TableForeignKey({
        columnNames: ['asset_id'],
        referencedTableName: 'assets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'asset_downtimes',
      new TableForeignKey({
        columnNames: ['work_order_id'],
        referencedTableName: 'work_orders',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'asset_downtimes',
      new TableIndex({
        name: 'IDX_asset_downtimes_tenant_asset',
        columnNames: ['tenant_id', 'asset_id'],
      }),
    );

    await queryRunner.createIndex(
      'asset_downtimes',
      new TableIndex({
        name: 'IDX_asset_downtimes_tenant_started',
        columnNames: ['tenant_id', 'started_at'],
      }),
    );

    // ===== 2. Warranty alert days on assets =====
    await queryRunner.addColumn(
      'assets',
      new TableColumn({
        name: 'warranty_alert_days',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // ===== 3. Teams =====
    await queryRunner.createTable(
      new Table({
        name: 'teams',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'leader_id', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'teams',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'teams',
      new TableForeignKey({
        columnNames: ['leader_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Team members join table
    await queryRunner.createTable(
      new Table({
        name: 'team_members',
        columns: [
          { name: 'team_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'team_members',
      new TableIndex({
        name: 'PK_team_members',
        columnNames: ['team_id', 'user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'team_members',
      new TableForeignKey({
        columnNames: ['team_id'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'team_members',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add team_id to work_orders
    await queryRunner.addColumn(
      'work_orders',
      new TableColumn({
        name: 'team_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'work_orders',
      new TableForeignKey({
        columnNames: ['team_id'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ===== 4. Signature fields on work_orders =====
    await queryRunner.addColumns('work_orders', [
      new TableColumn({
        name: 'completion_signature',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'signed_off_by',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'signed_off_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);

    // ===== 5. Maintenance Budgets =====
    await queryRunner.createTable(
      new Table({
        name: 'maintenance_budgets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'period_start', type: 'date', isNullable: false },
          { name: 'period_end', type: 'date', isNullable: false },
          { name: 'location_id', type: 'uuid', isNullable: true },
          { name: 'planned_amount', type: 'decimal', precision: 12, scale: 2, isNullable: false },
          { name: 'allocated_categories', type: 'jsonb', default: `'{}'` },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'maintenance_budgets',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'maintenance_budgets',
      new TableForeignKey({
        columnNames: ['location_id'],
        referencedTableName: 'locations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ===== 6. Update notification type enum =====
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'warranty_expiring'`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'budget_alert'`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'contract_expiring'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('maintenance_budgets');
    await queryRunner.dropColumn('work_orders', 'signed_off_at');
    await queryRunner.dropColumn('work_orders', 'signed_off_by');
    await queryRunner.dropColumn('work_orders', 'completion_signature');
    await queryRunner.dropColumn('work_orders', 'team_id');
    await queryRunner.dropTable('team_members');
    await queryRunner.dropTable('teams');
    await queryRunner.dropColumn('assets', 'warranty_alert_days');
    await queryRunner.dropTable('asset_downtimes');
  }
}
