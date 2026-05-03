import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Full system access',
    permissions: ['*'],
  },
  {
    name: 'manager',
    description: 'Manage work orders, assets, and users',
    permissions: [
      'work_orders:read',
      'work_orders:write',
      'assets:read',
      'assets:write',
      'pm:read',
      'pm:write',
      'inventory:read',
      'inventory:write',
      'reports:read',
      'users:read',
    ],
  },
  {
    name: 'technician',
    description: 'Complete assigned work orders',
    permissions: [
      'work_orders:read',
      'work_orders:write:own',
      'assets:read',
      'inventory:read',
    ],
  },
  {
    name: 'planner',
    description: 'Plan and schedule maintenance',
    permissions: [
      'work_orders:read',
      'work_orders:write',
      'assets:read',
      'pm:read',
      'pm:write',
      'inventory:read',
    ],
  },
  {
    name: 'requestor',
    description: 'Submit work requests',
    permissions: ['work_requests:write'],
  },
  {
    name: 'inventory_manager',
    description: 'Manage inventory and parts',
    permissions: [
      'inventory:read',
      'inventory:write',
      'work_orders:read',
    ],
  },
  {
    name: 'viewer',
    description: 'Read-only access',
    permissions: [
      'work_orders:read',
      'assets:read',
      'pm:read',
      'inventory:read',
      'reports:read',
    ],
  },
];

export class SeedDefaultTenantAndUser1714000001000 implements MigrationInterface {
  name = 'SeedDefaultTenantAndUser1714000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
    const userId = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000002';
    const email = process.env.DEFAULT_USER_EMAIL || 'admin@local';

    const modules = JSON.stringify({
      preventiveMaintenance: true,
      inventory: true,
      purchaseOrders: true,
      reports: true,
      aiAssistant: true,
      sensors: true,
      workRequestsPortal: true,
      dataImport: true,
    });

    await queryRunner.query(
      `INSERT INTO tenants
        (id, name, slug, status, plan, modules, settings, timezone, currency,
         user_count, asset_count, storage_bytes_used, onboarding_completed)
       VALUES ($1, 'Default Workspace', 'default', 'active', 'enterprise',
         $2::jsonb, '{}'::jsonb, 'UTC', 'USD', 1, 0, 0, true)
       ON CONFLICT (id) DO NOTHING`,
      [tenantId, modules],
    );

    for (const role of DEFAULT_ROLES) {
      await queryRunner.query(
        `INSERT INTO roles (tenant_id, name, description, permissions, is_system)
         VALUES ($1, $2, $3, $4::jsonb, true)
         ON CONFLICT (tenant_id, name) DO NOTHING`,
        [tenantId, role.name, role.description, JSON.stringify(role.permissions)],
      );
    }

    await queryRunner.query(
      `INSERT INTO users
        (id, tenant_id, username, email, first_name, last_name, status, notification_preferences)
       VALUES ($1, $2, 'admin', $3, 'Admin', 'User', 'active', '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [userId, tenantId, email],
    );

    await queryRunner.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id)
       SELECT $1, r.id, $2
       FROM roles r
       WHERE r.tenant_id = $2 AND r.name = 'admin'
       ON CONFLICT DO NOTHING`,
      [userId, tenantId],
    );
  }

  public async down(): Promise<void> {
    // No-op: don't delete data on rollback.
  }
}
