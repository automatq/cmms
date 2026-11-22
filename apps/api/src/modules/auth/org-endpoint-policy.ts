/**
 * Policy for Better Auth's /organization/* endpoints, applied from a global
 * `hooks.before` middleware in better-auth.ts.
 *
 * Better Auth's organization plugin only checks that a member row exists. Our
 * members also carry a `status` (deactivated members keep their row), and we
 * enforce an owner > admin > member hierarchy. This module holds the decision
 * logic with no better-auth import (better-auth is ESM-only and can't be
 * loaded by jest), so it can be unit-tested with fake lookups.
 */
import { isUserBanned, MEMBER_STATUS_INACTIVE } from './membership';
import { checkInvitationRole, checkMemberChange, ROLE_OWNER } from './member-hierarchy';

export interface PolicyMember {
  id?: string;
  userId: string;
  organizationId: string;
  role: string | null;
  status: string | null;
}

export interface OrgPolicyDeps {
  getMember(userId: string, organizationId: string): Promise<PolicyMember | null>;
  getMemberById(memberId: string): Promise<PolicyMember | null>;
  getMemberByEmail(email: string, organizationId: string): Promise<PolicyMember | null>;
  getOrgIdBySlug(slug: string): Promise<string | null>;
  getInvitationOrgId(invitationId: string): Promise<string | null>;
  countActiveOwners(organizationId: string): Promise<number>;
}

export interface OrgPolicyRequest {
  path: string;
  body?: Record<string, any> | null;
  query?: Record<string, any> | null;
  user: { id: string; banned?: boolean | null; banExpires?: Date | string | null };
  activeOrganizationId?: string | null;
}

export type OrgPolicyDecision = { ok: true } | { ok: false; message: string };

/**
 * Endpoints a user may call without an active membership in the target org:
 * creating an org, listing their own orgs/invitations, and handling an
 * invitation addressed to them. `leave` is allowed so a deactivated member can
 * still drop the org (Better Auth itself protects the last owner).
 */
export const ORG_PATHS_WITHOUT_MEMBERSHIP = new Set<string>([
  '/organization/create',
  '/organization/check-slug',
  '/organization/list',
  '/organization/list-user-invitations',
  '/organization/get-invitation',
  '/organization/accept-invitation',
  '/organization/reject-invitation',
  '/organization/leave',
]);

const ok: OrgPolicyDecision = { ok: true };
const deny = (message: string): OrgPolicyDecision => ({ ok: false, message });

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

export function isOrganizationPath(path: string | undefined | null): boolean {
  return typeof path === 'string' && path.startsWith('/organization/');
}

export function isActiveMember(member: PolicyMember | null): member is PolicyMember {
  return !!member && member.status !== MEMBER_STATUS_INACTIVE;
}

async function resolveTargetOrgId(req: OrgPolicyRequest, deps: OrgPolicyDeps): Promise<string | null> {
  const body = req.body ?? {};
  const query = req.query ?? {};

  const explicitId = str(body.organizationId) ?? str(query.organizationId);
  if (explicitId) return explicitId;

  const slug = str(body.organizationSlug) ?? str(query.organizationSlug);
  if (slug) return deps.getOrgIdBySlug(slug);

  // Invitation endpoints act on the invitation's org, not the active org.
  const invitationId = str(body.invitationId) ?? str(query.invitationId);
  if (invitationId) {
    const orgId = await deps.getInvitationOrgId(invitationId);
    if (orgId) return orgId;
  }

  return req.activeOrganizationId || null;
}

export async function evaluateOrganizationRequest(
  req: OrgPolicyRequest,
  deps: OrgPolicyDeps,
): Promise<OrgPolicyDecision> {
  if (!isOrganizationPath(req.path)) return ok;
  if (ORG_PATHS_WITHOUT_MEMBERSHIP.has(req.path)) return ok;

  if (isUserBanned(req.user)) return deny('Account banned');

  const body = req.body ?? {};

  // set-active with a null org just clears the active org.
  if (
    req.path === '/organization/set-active' &&
    !str(body.organizationId) &&
    !str(body.organizationSlug)
  ) {
    return ok;
  }

  const organizationId = await resolveTargetOrgId(req, deps);
  // No target org: Better Auth answers with its own "no active organization".
  if (!organizationId) return ok;

  const actor = await deps.getMember(req.user.id, organizationId);
  if (!actor) return deny('You are not a member of this organization');
  if (!isActiveMember(actor)) return deny('Your access to this organization has been deactivated');

  switch (req.path) {
    case '/organization/invite-member': {
      const decision = checkInvitationRole(actor.role, body.role);
      return decision.ok ? ok : deny(decision.reason);
    }

    case '/organization/update-member-role': {
      const memberId = str(body.memberId);
      if (!memberId) return ok;
      const target = await deps.getMemberById(memberId);
      // Unknown / foreign members are rejected by Better Auth itself.
      if (!target || target.organizationId !== organizationId) return ok;
      const isSelf = target.userId === req.user.id;
      const decision = checkMemberChange({
        actorRole: actor.role,
        targetRole: target.role,
        isSelf,
        action: 'change_role',
        newRole: body.role,
        activeOwnerCount: isSelf ? await deps.countActiveOwners(organizationId) : undefined,
      });
      return decision.ok ? ok : deny(decision.reason);
    }

    case '/organization/remove-member': {
      const idOrEmail = str(body.memberIdOrEmail);
      if (!idOrEmail) return ok;
      const target = idOrEmail.includes('@')
        ? await deps.getMemberByEmail(idOrEmail, organizationId)
        : await deps.getMemberById(idOrEmail);
      if (!target || target.organizationId !== organizationId) return ok;
      const decision = checkMemberChange({
        actorRole: actor.role,
        targetRole: target.role,
        isSelf: target.userId === req.user.id,
        action: 'remove',
      });
      return decision.ok ? ok : deny(decision.reason);
    }

    default:
      return ok;
  }
}

/** pg-backed lookups for the policy. */
export function createPgOrgPolicyDeps(
  query: (sql: string, params: unknown[]) => Promise<{ rows: any[] }>,
): OrgPolicyDeps {
  const toMember = (row: any): PolicyMember | null =>
    row
      ? {
          id: row.id,
          userId: row.user_id,
          organizationId: row.organization_id,
          role: row.role ?? null,
          status: row.status ?? null,
        }
      : null;

  return {
    async getMember(userId, organizationId) {
      const { rows } = await query(
        `SELECT id, user_id, organization_id, role, status FROM members
          WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
        [userId, organizationId],
      );
      return toMember(rows[0]);
    },
    async getMemberById(memberId) {
      const { rows } = await query(
        `SELECT id, user_id, organization_id, role, status FROM members WHERE id = $1 LIMIT 1`,
        [memberId],
      );
      return toMember(rows[0]);
    },
    async getMemberByEmail(email, organizationId) {
      const { rows } = await query(
        `SELECT m.id, m.user_id, m.organization_id, m.role, m.status
           FROM members m JOIN users u ON u.id = m.user_id
          WHERE lower(u.email) = lower($1) AND m.organization_id = $2 LIMIT 1`,
        [email, organizationId],
      );
      return toMember(rows[0]);
    },
    async getOrgIdBySlug(slug) {
      const { rows } = await query(`SELECT id FROM organizations WHERE slug = $1 LIMIT 1`, [slug]);
      return rows[0]?.id ?? null;
    },
    async getInvitationOrgId(invitationId) {
      const { rows } = await query(
        `SELECT organization_id FROM invitations WHERE id = $1 LIMIT 1`,
        [invitationId],
      );
      return rows[0]?.organization_id ?? null;
    },
    async countActiveOwners(organizationId) {
      return countActiveOwnersWith(query, organizationId);
    },
  };
}

export async function countActiveOwnersWith(
  query: (sql: string, params: unknown[]) => Promise<{ rows: any[] }>,
  organizationId: string,
): Promise<number> {
  const { rows } = await query(
    `SELECT count(*)::int AS count FROM members
      WHERE organization_id = $1
        AND COALESCE(status, 'active') <> '${MEMBER_STATUS_INACTIVE}'
        AND $2 = ANY(string_to_array(replace(lower(role), ' ', ''), ','))`,
    [organizationId, ROLE_OWNER],
  );
  return Number(rows[0]?.count ?? 0);
}
