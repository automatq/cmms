import { betterAuth } from 'better-auth';
import { organization, bearer } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
} from './email-sender';

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = process.env.DB_SSL === 'true';

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl:
        sslEnabled || databaseUrl.includes('sslmode=require')
          ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
          : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      ssl:
        sslEnabled
          ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
          : undefined,
    });

const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || 'http://localhost:3000';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    ...(process.env.CORS_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    'nexly://',
    'exp://',
  ],
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // set to true once SMTP is verified
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },

  emailVerification: {
    sendOnSignUp: false, // flip to true once SMTP is verified
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },

  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? {
          apple: {
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
            appBundleIdentifier: process.env.APPLE_BUNDLE_ID,
          },
        }
      : {}),
  },

  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      firstName: { type: 'string', required: false, fieldName: 'first_name' },
      lastName: { type: 'string', required: false, fieldName: 'last_name' },
      username: { type: 'string', required: false, fieldName: 'username' },
      phone: { type: 'string', required: false, fieldName: 'phone' },
      jobTitle: { type: 'string', required: false, fieldName: 'job_title' },
      department: { type: 'string', required: false, fieldName: 'department' },
      avatarUrl: { type: 'string', required: false, fieldName: 'avatar_url' },
      status: { type: 'string', defaultValue: 'active', fieldName: 'status' },
      lastLoginAt: { type: 'date', required: false, fieldName: 'last_login_at' },
    },
  },

  session: {
    modelName: 'sessions',
    fields: {
      userId: 'user_id',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
    },
  },

  account: {
    modelName: 'accounts',
    fields: {
      userId: 'user_id',
      accountId: 'account_id',
      providerId: 'provider_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  verification: {
    modelName: 'verifications',
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  plugins: [
    bearer(),
    expo(),
    organization({
      schema: {
        organization: {
          modelName: 'organizations',
          fields: {
            createdAt: 'created_at',
            logo: 'logo_url',
          },
          additionalFields: {
            timezone: { type: 'string', required: false, defaultValue: 'UTC', fieldName: 'timezone' },
            currency: { type: 'string', required: false, defaultValue: 'USD', fieldName: 'currency' },
            status: { type: 'string', required: false, defaultValue: 'trial', fieldName: 'status' },
            plan: { type: 'string', required: false, defaultValue: 'free', fieldName: 'plan' },
            modules: { type: 'string', required: false, fieldName: 'modules' },
            settings: { type: 'string', required: false, fieldName: 'settings' },
            stripeCustomerId: { type: 'string', required: false, fieldName: 'stripe_customer_id' },
            stripeSubscriptionId: { type: 'string', required: false, fieldName: 'stripe_subscription_id' },
            userCount: { type: 'number', required: false, defaultValue: 0, fieldName: 'user_count' },
            assetCount: { type: 'number', required: false, defaultValue: 0, fieldName: 'asset_count' },
            storageBytesUsed: { type: 'number', required: false, defaultValue: 0, fieldName: 'storage_bytes_used' },
            onboardingCompleted: { type: 'boolean', required: false, defaultValue: false, fieldName: 'onboarding_completed' },
            updatedAt: { type: 'date', required: false, defaultValue: () => new Date(), fieldName: 'updated_at' },
          },
        },
        member: {
          modelName: 'members',
          fields: {
            organizationId: 'organization_id',
            userId: 'user_id',
            createdAt: 'created_at',
          },
        },
        invitation: {
          modelName: 'invitations',
          fields: {
            organizationId: 'organization_id',
            inviterId: 'inviter_id',
            expiresAt: 'expires_at',
          },
        },
        session: {
          fields: {
            activeOrganizationId: 'active_organization_id',
          },
        },
      },
      sendInvitationEmail: async ({ email, organization, inviter, id }) => {
        const url = `${PUBLIC_WEB_URL}/invitations/${id}/accept`;
        const inviterName =
          (inviter as any)?.user?.name ||
          (inviter as any)?.user?.email ||
          null;
        await sendInvitationEmail(email, organization.name, inviterName, url);
      },
      organizationCreation: {
        afterCreate: async ({ organization }) => {
          // Seed default permission roles for the new tenant
          await seedDefaultRoles(pool, organization.id);
          // Set sensible defaults on the org
          await pool.query(
            `UPDATE organizations SET
               status = COALESCE(status, 'trial'),
               plan = COALESCE(plan, 'free'),
               modules = COALESCE(modules, '{"preventiveMaintenance":true,"inventory":true,"purchaseOrders":true,"reports":true,"aiAssistant":true,"sensors":true,"workRequestsPortal":true,"dataImport":true}'::jsonb),
               settings = COALESCE(settings, '{}'::jsonb),
               timezone = COALESCE(timezone, 'UTC'),
               currency = COALESCE(currency, 'USD'),
               user_count = COALESCE(user_count, 1),
               asset_count = COALESCE(asset_count, 0),
               storage_bytes_used = COALESCE(storage_bytes_used, 0),
               onboarding_completed = COALESCE(onboarding_completed, false)
             WHERE id = $1`,
            [organization.id],
          );
        },
      },
    }),
  ],
});

async function seedDefaultRoles(pool: Pool, tenantId: string): Promise<void> {
  const roles = [
    { name: 'admin', description: 'Full system access', permissions: ['*'] },
    { name: 'manager', description: 'Manage work orders, assets, and users', permissions: ['work_orders:read','work_orders:write','assets:read','assets:write','pm:read','pm:write','inventory:read','inventory:write','reports:read','users:read'] },
    { name: 'technician', description: 'Complete assigned work orders', permissions: ['work_orders:read','work_orders:write:own','assets:read','inventory:read'] },
    { name: 'planner', description: 'Plan and schedule maintenance', permissions: ['work_orders:read','work_orders:write','assets:read','pm:read','pm:write','inventory:read'] },
    { name: 'requestor', description: 'Submit work requests', permissions: ['work_requests:write'] },
    { name: 'inventory_manager', description: 'Manage inventory and parts', permissions: ['inventory:read','inventory:write','work_orders:read'] },
    { name: 'viewer', description: 'Read-only access', permissions: ['work_orders:read','assets:read','pm:read','inventory:read','reports:read'] },
  ];
  for (const role of roles) {
    await pool.query(
      `INSERT INTO roles (id, tenant_id, name, description, permissions, is_system, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, true, now(), now())
       ON CONFLICT (tenant_id, name) DO NOTHING`,
      [tenantId, role.name, role.description, JSON.stringify(role.permissions)],
    );
  }
}

