import { betterAuth } from 'better-auth';
import { organization, bearer, admin } from 'better-auth/plugins';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import { expo } from '@better-auth/expo';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
} from './email-sender';

const authLogger = new Logger('BetterAuth');

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = process.env.DB_SSL === 'true';
// Match TypeORM's pool size (default 20). node-postgres defaults to 10,
// which serializes parallel auth requests under load (3+ concurrent
// signups each acquire ~3 connections via Better Auth's session/org hooks).
const poolMax = parseInt(process.env.DB_POOL_MAX || '20', 10);

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: poolMax,
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
      max: poolMax,
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
    'maintek://',
    'exp://',
  ],
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
    // Make Better Auth's cookie defaults explicit so security posture is
    // intentional rather than implicit. Better Auth already picks safe
    // defaults (secure+httpOnly+sameSite=lax in prod), but documenting
    // them here means anyone touching auth sees them and changes are
    // tracked in git rather than left to library defaults that could
    // shift across upgrades.
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },

  // Auto-restore the user's active org on every new session so returning
  // sign-ins land on /dashboard instead of being bounced to
  // /onboarding/create-org. Runs in the `after` hook (UPDATE) rather than
  // `before` (INSERT) because Better Auth's create path doesn't always
  // forward plugin-extended fields like `activeOrganizationId` from the
  // before-hook merge.
  databaseHooks: {
    session: {
      create: {
        after: async (session: any) => {
          try {
            const userId = session?.userId;
            const sessionId = session?.id;
            if (!userId || !sessionId) return;

            const result = await pool.query<{ organization_id: string }>(
              `SELECT organization_id
                 FROM members
                WHERE user_id = $1
                ORDER BY
                  CASE role
                    WHEN 'owner' THEN 0
                    WHEN 'admin' THEN 1
                    ELSE 2
                  END,
                  created_at ASC
                LIMIT 1`,
              [userId],
            );

            if (result.rows[0]) {
              await pool.query(
                `UPDATE sessions SET active_organization_id = $1 WHERE id = $2`,
                [result.rows[0].organization_id, sessionId],
              );
              authLogger.log(
                `[session-hook] active_org=${result.rows[0].organization_id} for user=${userId} session=${sessionId}`,
              );
            }
          } catch (err) {
            authLogger.error(
              `[session-hook] failed: ${(err as Error).message}`,
              (err as Error).stack,
            );
          }
        },
      },
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
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
      // Better Auth admin plugin — platform-wide role distinct from per-org members.role.
      // NULL for normal customers, 'superadmin' for MainTek HQ operators.
      role: { type: 'string', required: false, fieldName: 'role' },
      banned: { type: 'boolean', required: false, defaultValue: false, fieldName: 'banned' },
      banReason: { type: 'string', required: false, fieldName: 'ban_reason' },
      banExpires: { type: 'date', required: false, fieldName: 'ban_expires' },
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
      impersonatedBy: 'impersonated_by',
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
    admin({
      // Define our own role name 'superadmin' as an alias for the plugin's built-in
      // admin role — the value 'admin' is already overloaded by per-org membership.
      // We re-use the built-in adminAc/userAc access controls (no custom statements).
      roles: {
        superadmin: adminAc,
        user: userAc,
      },
      // Only users whose `role` is in this list can call /api/auth/admin/* endpoints
      // (list-users, set-role, ban-user, impersonate-user, etc.).
      adminRoles: ['superadmin'],
    }),
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
            currency: { type: 'string', required: false, defaultValue: 'CAD', fieldName: 'currency' },
            status: { type: 'string', required: false, defaultValue: 'trial', fieldName: 'status' },
            plan: { type: 'string', required: false, defaultValue: 'free', fieldName: 'plan' },
            modules: { type: 'string', required: false, fieldName: 'modules' },
            settings: { type: 'string', required: false, fieldName: 'settings' },
            polarCustomerId: { type: 'string', required: false, fieldName: 'polar_customer_id' },
            polarSubscriptionId: { type: 'string', required: false, fieldName: 'polar_subscription_id' },
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
            createdAt: 'created_at',
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
      organizationHooks: {
        afterCreateOrganization: async ({ organization }: { organization: { id: string } }) => {
          // Seed default permission roles for the new tenant
          await seedDefaultRoles(pool, organization.id);
          // No payment gateway: new orgs are immediately active with the full
          // module set. (Billing was removed — there's no trial/suspend flow.)
          await pool.query(
            `UPDATE organizations SET
               status = 'active',
               plan = 'pro',
               modules = '{"preventiveMaintenance":true,"inventory":true,"purchaseOrders":true,"reports":true,"aiAssistant":true,"sensors":false,"workRequestsPortal":true,"dataImport":true}'::jsonb,
               settings = COALESCE(settings, '{}'::jsonb),
               timezone = COALESCE(timezone, 'UTC'),
               currency = COALESCE(currency, 'CAD'),
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

