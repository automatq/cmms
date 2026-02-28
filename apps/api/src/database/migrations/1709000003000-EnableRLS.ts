import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableRLS1709000003000 implements MigrationInterface {
  name = 'EnableRLS1709000003000';

  // All tenant-aware tables that need RLS
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
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create application-level database role (subject to RLS)
    // The migration role (current connection) will bypass RLS as table owner
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE ROLE cmms_app LOGIN PASSWORD '${process.env.DB_APP_PASSWORD || 'cmms_app_password'}';
      EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Role cmms_app already exists, skipping creation';
      END $$
    `);

    // Grant necessary permissions to cmms_app
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO cmms_app`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cmms_app`);
    await queryRunner.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cmms_app`);
    await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cmms_app`);
    await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cmms_app`);

    // Enable RLS on all tenant-aware tables
    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);

      // FORCE RLS ensures the policy applies even to the table owner
      // (important when the migration user and app user are the same during dev)
      await queryRunner.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);

      // Create tenant isolation policy
      // current_setting('app.current_tenant_id', true) returns NULL if not set (the 'true' means missing_ok)
      // This means: if no tenant context is set, NO rows are visible (fail-safe)
      await queryRunner.query(`
        CREATE POLICY "tenant_isolation_${table}" ON "${table}"
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      `);
    }

    // The tenants table itself does NOT get RLS -- it needs to be readable
    // during tenant resolution (before we know which tenant the request belongs to)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove RLS policies and disable RLS
    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_${table}" ON "${table}"`);
      await queryRunner.query(`ALTER TABLE "${table}" NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }

    // Revoke permissions and drop role
    await queryRunner.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM cmms_app`);
    await queryRunner.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM cmms_app`);
    await queryRunner.query(`REVOKE USAGE ON SCHEMA public FROM cmms_app`);
    await queryRunner.query(`DROP ROLE IF EXISTS cmms_app`);
  }
}
