/**
 * Better Auth `additionalFields` for users and organizations, kept in a plain
 * module (no better-auth import) so they can be unit-tested; better-auth itself
 * is ESM-only and can't be loaded by jest/ts-jest.
 *
 * SECURITY: any column that grants privileges or reflects billing must be
 * `input: false`, otherwise clients can set it through /api/auth/sign-up,
 * /api/auth/update-user or /api/auth/organization/update.
 */
export const USER_ADDITIONAL_FIELDS = {
  firstName: { type: 'string', required: false, fieldName: 'first_name' },
  lastName: { type: 'string', required: false, fieldName: 'last_name' },
  username: { type: 'string', required: false, fieldName: 'username' },
  phone: { type: 'string', required: false, fieldName: 'phone' },
  jobTitle: { type: 'string', required: false, fieldName: 'job_title' },
  department: { type: 'string', required: false, fieldName: 'department' },
  avatarUrl: { type: 'string', required: false, fieldName: 'avatar_url' },
  status: { type: 'string', defaultValue: 'active', input: false, fieldName: 'status' },
  lastLoginAt: { type: 'date', required: false, fieldName: 'last_login_at' },
  // Better Auth admin plugin — platform-wide role distinct from per-org members.role.
  // NULL for normal customers, 'superadmin' for MainTek HQ operators.
  // input:false — these must never be settable by clients via sign-up or
  // update-user. Only the admin plugin / server code may write them.
  role: { type: 'string', required: false, input: false, fieldName: 'role' },
  banned: { type: 'boolean', required: false, defaultValue: false, input: false, fieldName: 'banned' },
  banReason: { type: 'string', required: false, input: false, fieldName: 'ban_reason' },
  banExpires: { type: 'date', required: false, input: false, fieldName: 'ban_expires' },
} as const;

export const ORGANIZATION_ADDITIONAL_FIELDS = {
  timezone: { type: 'string', required: false, defaultValue: 'UTC', fieldName: 'timezone' },
  currency: { type: 'string', required: false, defaultValue: 'CAD', fieldName: 'currency' },
  status: { type: 'string', required: false, input: false, defaultValue: 'trial', fieldName: 'status' },
  plan: { type: 'string', required: false, input: false, defaultValue: 'free', fieldName: 'plan' },
  modules: { type: 'string', required: false, input: false, fieldName: 'modules' },
  settings: { type: 'string', required: false, fieldName: 'settings' },
  polarCustomerId: { type: 'string', required: false, input: false, fieldName: 'polar_customer_id' },
  polarSubscriptionId: { type: 'string', required: false, input: false, fieldName: 'polar_subscription_id' },
  userCount: { type: 'number', required: false, input: false, defaultValue: 0, fieldName: 'user_count' },
  assetCount: { type: 'number', required: false, input: false, defaultValue: 0, fieldName: 'asset_count' },
  storageBytesUsed: { type: 'number', required: false, input: false, defaultValue: 0, fieldName: 'storage_bytes_used' },
  onboardingCompleted: { type: 'boolean', required: false, defaultValue: false, fieldName: 'onboarding_completed' },
  updatedAt: { type: 'date', required: false, defaultValue: () => new Date(), fieldName: 'updated_at' },
} as const;
