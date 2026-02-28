import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToAllEntities1709000002000 implements MigrationInterface {
  name = 'AddTenantIdToAllEntities1709000002000';

  // All tables that need tenant_id (excluding tenants itself)
  private readonly tables = [
    'users',
    'roles',
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

  // Old unique constraints that must be dropped and recreated with tenant_id
  private readonly uniqueConstraintChanges = [
    { table: 'users', oldConstraint: 'UQ_users_username', columns: ['tenant_id', 'username'] },
    { table: 'users', oldConstraint: 'UQ_users_email', columns: ['tenant_id', 'email'] },
    { table: 'roles', oldConstraint: 'UQ_roles_name', columns: ['tenant_id', 'name'] },
    { table: 'assets', oldConstraint: 'UQ_assets_asset_number', columns: ['tenant_id', 'asset_number'] },
    { table: 'work_orders', oldConstraint: 'UQ_work_orders_wo_number', columns: ['tenant_id', 'wo_number'] },
    { table: 'parts', oldConstraint: 'UQ_parts_sku', columns: ['tenant_id', 'sku'] },
    { table: 'purchase_orders', oldConstraint: 'UQ_purchase_orders_po_number', columns: ['tenant_id', 'po_number'] },
    { table: 'inventory_stock', oldConstraint: 'UQ_inventory_stock_part_storeroom', columns: ['tenant_id', 'part_id', 'storeroom_id'] },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get (or create) a default tenant to assign existing data to
    const result = await queryRunner.query(`SELECT id FROM "tenants" LIMIT 1`);
    let defaultTenantId: string;

    if (result.length > 0) {
      defaultTenantId = result[0].id;
    } else {
      const inserted = await queryRunner.query(`
        INSERT INTO "tenants" ("name", "slug", "status", "plan")
        VALUES ('Default Organization', 'default', 'active', 'enterprise')
        RETURNING id
      `);
      defaultTenantId = inserted[0].id;
    }

    // Add tenant_id column to all tables
    for (const table of this.tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "tenant_id" uuid
      `);

      // Set default tenant for existing rows
      await queryRunner.query(`
        UPDATE "${table}" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL
      `);

      // Make NOT NULL
      await queryRunner.query(`
        ALTER TABLE "${table}" ALTER COLUMN "tenant_id" SET NOT NULL
      `);

      // Add FK constraint
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "FK_${table}_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      `);

      // Add index
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_${table}_tenant" ON "${table}" ("tenant_id")
      `);
    }

    // Also add tenant_id to the user_roles join table
    await queryRunner.query(`
      ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "tenant_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "user_roles" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user_roles" ALTER COLUMN "tenant_id" SET NOT NULL
    `);

    // Drop old unique constraints and recreate with tenant_id
    for (const change of this.uniqueConstraintChanges) {
      // Try to drop constraint (may have different names depending on how TypeORM created them)
      await queryRunner.query(`
        ALTER TABLE "${change.table}" DROP CONSTRAINT IF EXISTS "${change.oldConstraint}"
      `);

      // Also try TypeORM's auto-generated constraint names
      const autoName = `UQ_${change.table}_${change.columns[change.columns.length - 1]}`;
      if (autoName !== change.oldConstraint) {
        await queryRunner.query(`
          ALTER TABLE "${change.table}" DROP CONSTRAINT IF EXISTS "${autoName}"
        `);
      }

      // Create new composite unique constraint with tenant_id
      const newConstraintName = `UQ_${change.table}_tenant_${change.columns.slice(1).join('_')}`;
      const columnList = change.columns.map(c => `"${c}"`).join(', ');
      await queryRunner.query(`
        ALTER TABLE "${change.table}"
        ADD CONSTRAINT "${newConstraintName}"
        UNIQUE (${columnList})
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore original unique constraints
    for (const change of this.uniqueConstraintChanges) {
      const newConstraintName = `UQ_${change.table}_tenant_${change.columns.slice(1).join('_')}`;
      await queryRunner.query(`
        ALTER TABLE "${change.table}" DROP CONSTRAINT IF EXISTS "${newConstraintName}"
      `);

      // Recreate original constraint (just the last column without tenant_id)
      const originalColumn = change.columns[change.columns.length - 1];
      // For inventory_stock, the original was composite (part_id, storeroom_id)
      if (change.table === 'inventory_stock') {
        await queryRunner.query(`
          ALTER TABLE "inventory_stock"
          ADD CONSTRAINT "UQ_inventory_stock_part_storeroom"
          UNIQUE ("part_id", "storeroom_id")
        `);
      } else {
        await queryRunner.query(`
          ALTER TABLE "${change.table}"
          ADD CONSTRAINT "${change.oldConstraint}"
          UNIQUE ("${originalColumn}")
        `);
      }
    }

    // Remove tenant_id from user_roles
    await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN IF EXISTS "tenant_id"`);

    // Remove tenant_id from all tables
    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_tenant"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_tenant"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "tenant_id"`);
    }
  }
}
