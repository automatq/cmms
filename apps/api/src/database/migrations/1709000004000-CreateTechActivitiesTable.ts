import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTechActivitiesTable1709000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "tech_activity_status_enum" AS ENUM ('active', 'completed', 'abandoned')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'tech_activities',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'asset_id', type: 'uuid', isNullable: false },
          { name: 'work_order_id', type: 'uuid', isNullable: false },
          { name: 'status', type: 'tech_activity_status_enum', default: `'active'` },
          { name: 'started_at', type: 'timestamptz', isNullable: false },
          { name: 'completed_at', type: 'timestamptz', isNullable: true },
          { name: 'duration_minutes', type: 'int', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'tech_activities',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tech_activities',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createForeignKey(
      'tech_activities',
      new TableForeignKey({
        columnNames: ['asset_id'],
        referencedTableName: 'assets',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createForeignKey(
      'tech_activities',
      new TableForeignKey({
        columnNames: ['work_order_id'],
        referencedTableName: 'work_orders',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'tech_activities',
      new TableIndex({
        name: 'IDX_tech_activities_tenant_user_status',
        columnNames: ['tenant_id', 'user_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'tech_activities',
      new TableIndex({
        name: 'IDX_tech_activities_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tech_activities');
    await queryRunner.query('DROP TYPE "tech_activity_status_enum"');
  }
}
