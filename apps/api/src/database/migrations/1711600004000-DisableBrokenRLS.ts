import { MigrationInterface, QueryRunner } from 'typeorm';

export class DisableBrokenRLS1711600004000 implements MigrationInterface {
  name = 'DisableBrokenRLS1711600004000';

  private readonly tables = [
    'users',
    'roles',
    'user_roles',
    'audit_logs',
    'assets',
    'asset_categories',
    'locations',
    'asset_meters',
    'asset_documents',
    'work_orders',
    'work_requests',
    'wo_labor',
    'wo_parts',
    'wo_attachments',
    'wo_checklist_results',
    'pm_plans',
    'pm_history',
    'checklist_templates',
    'parts',
    'suppliers',
    'storerooms',
    'inventory_stock',
    'inventory_transactions',
    'purchase_orders',
    'po_line_items',
    'notifications',
    'user_push_tokens',
    'tech_activities',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "tenant_isolation_${table}" ON "${table}"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY "tenant_isolation_${table}" ON "${table}"
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      `);
    }
  }
}
