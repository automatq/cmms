import { PlanTier } from '../../modules/users/entities/tenant.entity';

/**
 * Represents the authenticated user extracted from the JWT token.
 * Attached to every authenticated request as `req.user`.
 *
 * tenantId: For normal users this is their active organization id. For superadmins
 * without an `activeOrganizationId` set, this is the empty string ''. Tenant-scoped
 * queries against an empty string naturally return zero rows, which is the correct
 * behavior — superadmins use platform-level endpoints, not tenant-scoped ones, unless
 * they explicitly switch into an org (impersonation or activeOrganizationId).
 */
export interface RequestUser {
  userId: string;
  tenantId: string;
  email: string;
  plan: PlanTier;
  permissions: string[];
  roles: string[];
  systemRole?: 'superadmin' | null;
  impersonatedBy?: string | null;
}
