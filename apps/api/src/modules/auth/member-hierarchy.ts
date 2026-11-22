/**
 * Role hierarchy for membership changes inside one organization.
 *
 * Ranks (from members.role): owner (3) > admin (2) > any other role (1).
 * Plain module with no Nest / better-auth imports so it can be shared by the
 * Nest users service and the Better Auth organization hook, and unit-tested.
 *
 * Rules:
 * - Nobody can grant `owner` through these endpoints (ownership transfer is
 *   not supported here).
 * - Nobody can modify an owner other than themselves.
 * - Nobody can deactivate, remove or re-activate themselves.
 * - An owner may drop their own owner role only while another active owner
 *   remains (the last active owner can never be demoted or deactivated).
 * - Otherwise the actor must strictly outrank the target.
 * - Only owners can grant or revoke `admin`.
 */

export const ROLE_OWNER = 'owner';
export const ROLE_ADMIN = 'admin';

export type MemberAction =
  | 'deactivate'
  | 'activate'
  | 'remove'
  | 'change_role'
  | 'assign_roles'
  | 'update_profile';

export type RoleInput = string | string[] | null | undefined;

export interface MemberChangeInput {
  /** The actor's members.role in this org (null when not a member). */
  actorRole: RoleInput;
  /** The target's members.role in this org. */
  targetRole: RoleInput;
  isSelf: boolean;
  action: MemberAction;
  /** change_role: the requested new members.role. */
  newRole?: RoleInput;
  /** assign_roles: role names being granted / revoked. */
  grantRoles?: string[];
  revokeRoles?: string[];
  /** Number of active owners in the org (needed when an owner demotes themselves). */
  activeOwnerCount?: number;
}

export type MemberChangeDecision = { ok: true } | { ok: false; reason: string };

export const HIERARCHY_MESSAGES = {
  OWNER_GRANT: 'The owner role cannot be granted here. Ownership transfer is not supported.',
  OWNER_PROTECTED: 'The organization owner cannot be modified by other members.',
  SELF_STATUS: 'You cannot change your own membership status or remove yourself.',
  LAST_OWNER: 'The last active owner of an organization cannot be demoted or deactivated.',
  RANK: 'You can only manage members whose role is lower than yours.',
  ADMIN_GRANT: 'Only the organization owner can grant or revoke the admin role.',
} as const;

/** Better Auth stores multiple roles as a comma-separated string. */
export function parseRoles(role: RoleInput): string[] {
  if (role === null || role === undefined) return [];
  const list = Array.isArray(role) ? role : String(role).split(',');
  return list.map((r) => r.trim().toLowerCase()).filter(Boolean);
}

export function roleRank(role: RoleInput): number {
  const roles = parseRoles(role);
  if (roles.includes(ROLE_OWNER)) return 3;
  if (roles.includes(ROLE_ADMIN)) return 2;
  return roles.length > 0 ? 1 : 0;
}

const deny = (reason: string): MemberChangeDecision => ({ ok: false, reason });

export function checkMemberChange(input: MemberChangeInput): MemberChangeDecision {
  const actorRank = roleRank(input.actorRole);
  const targetRank = roleRank(input.targetRole);

  let granted: string[] = [];
  let revoked: string[] = [];
  if (input.action === 'change_role') {
    const next = parseRoles(input.newRole);
    const current = parseRoles(input.targetRole);
    granted = next.filter((r) => !current.includes(r));
    revoked = current.filter((r) => !next.includes(r));
  } else if (input.action === 'assign_roles') {
    granted = parseRoles(input.grantRoles);
    revoked = parseRoles(input.revokeRoles);
  }
  const touched = [...granted, ...revoked];

  if (granted.includes(ROLE_OWNER)) return deny(HIERARCHY_MESSAGES.OWNER_GRANT);

  if (input.isSelf) {
    if (input.action === 'deactivate' || input.action === 'remove' || input.action === 'activate') {
      return deny(HIERARCHY_MESSAGES.SELF_STATUS);
    }
    if (revoked.includes(ROLE_OWNER) && (input.activeOwnerCount ?? 0) <= 1) {
      return deny(HIERARCHY_MESSAGES.LAST_OWNER);
    }
    if (touched.includes(ROLE_ADMIN) && actorRank < 3) {
      return deny(HIERARCHY_MESSAGES.ADMIN_GRANT);
    }
    return { ok: true };
  }

  if (targetRank >= 3) return deny(HIERARCHY_MESSAGES.OWNER_PROTECTED);
  if (actorRank <= targetRank) return deny(HIERARCHY_MESSAGES.RANK);
  if (touched.includes(ROLE_ADMIN) && actorRank < 3) return deny(HIERARCHY_MESSAGES.ADMIN_GRANT);
  return { ok: true };
}

/** Invitations: never `owner`; `admin` only when the inviter is an owner. */
export function checkInvitationRole(actorRole: RoleInput, invitedRole: RoleInput): MemberChangeDecision {
  const roles = parseRoles(invitedRole);
  if (roles.includes(ROLE_OWNER)) return deny(HIERARCHY_MESSAGES.OWNER_GRANT);
  if (roles.includes(ROLE_ADMIN) && roleRank(actorRole) < 3) return deny(HIERARCHY_MESSAGES.ADMIN_GRANT);
  return { ok: true };
}
