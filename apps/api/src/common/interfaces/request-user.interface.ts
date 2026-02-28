/**
 * Represents the authenticated user extracted from the JWT token.
 * Attached to every authenticated request as `req.user`.
 */
export interface RequestUser {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[];
  roles: string[];
}
