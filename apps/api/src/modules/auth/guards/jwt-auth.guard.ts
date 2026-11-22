import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Auth } from 'better-auth';
import { BETTER_AUTH } from '../better-auth.token';
import { getAuthPool as getPool, isUserBanned, resolveMembership } from '../membership';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { PlanTier, TenantStatus } from '../../users/entities/tenant.entity';

// All non-billing permissions used by the app.
// `admin:tenants` is intentionally NOT in this list — it is platform-wide and only
// granted via the superadmin path below (which sets permissions = ['*']).
const ALL_NON_BILLING_PERMISSIONS = [
  'work_orders:read', 'work_orders:write', 'work_orders:write:own',
  'work_requests:write',
  'assets:read', 'assets:write',
  'pm:read', 'pm:write',
  'inventory:read', 'inventory:write', 'inventory:delete',
  'reports:read',
  'users:read', 'users:write',
  'settings:read', 'settings:write',
  'ai:read',
];

const BILLING_PERMISSIONS = ['billing:read', 'billing:write'];

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  // Owner is the user who created the org. Full access including billing.
  owner: ['*'],
  // Admins manage everyday operations but not billing by default.
  admin: ALL_NON_BILLING_PERMISSIONS,
  // Members get the technician permission set.
  member: [
    'work_orders:read',
    'work_orders:write:own',
    'assets:read',
    'inventory:read',
    'pm:read',
    'reports:read',
    'ai:read',
  ],
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject(BETTER_AUTH) private readonly auth: Auth,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const headers = fromNodeHeaders(request.headers);

    let session: Awaited<ReturnType<typeof this.auth.api.getSession>>;
    try {
      session = await this.auth.api.getSession({ headers });
    } catch (err) {
      this.logger.error('Failed to read session', err);
      throw new UnauthorizedException('Authentication required');
    }

    if (!session?.session || !session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Block banned users (Better Auth admin plugin sets this).
    const userRow = session.user as any;
    if (isUserBanned(userRow)) {
      throw new UnauthorizedException('Account banned');
    }

    const activeOrgId: string | null =
      (session.session as any).activeOrganizationId || null;
    const impersonatedBy: string | null =
      (session.session as any).impersonatedBy || null;
    const isSuperadmin = userRow.role === 'superadmin';

    // Superadmin bypass: platform-wide access, no org membership required.
    // If they have an activeOrgId (e.g., via impersonation), use it so their
    // tenant-scoped requests target that org. Otherwise fall back to '' which
    // naturally returns zero rows from tenant_id filters — correct for an
    // operator who hasn't opted into any tenant context.
    if (isSuperadmin) {
      const requestUser: RequestUser = {
        userId: session.user.id,
        tenantId: activeOrgId || '',
        email: session.user.email,
        plan: PlanTier.ENTERPRISE,
        permissions: ['*'],
        roles: ['superadmin'],
        systemRole: 'superadmin',
        impersonatedBy,
      };
      request.user = requestUser;
      return true;
    }

    if (!activeOrgId) {
      throw new ForbiddenException(
        'No active organization. Create or join one before using this resource.',
      );
    }
    const tenantId = activeOrgId;

    // The session's activeOrganizationId outlives membership: a user removed
    // from (or deactivated in) an org keeps the old value on their session.
    // Previously a missing member row fell back to role 'member' (read access
    // retained). Now it is denied.
    const membership = await resolveMembership(session.user.id, tenantId);
    if (!membership.ok) {
      throw new ForbiddenException(membership.reason);
    }
    const role = membership.role;

    // Check the org's billing/trial status. If the trial has expired without a
    // payment method, suspend the org. Suspended orgs return 402 (payment
    // required) on every non-billing request - the frontend redirects to a
    // "Reactivate" page.
    const orgRow = await getPool().query(
      `SELECT status, plan, trial_ends_at FROM organizations WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const org = orgRow.rows[0];
    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    // Billing enforcement is opt-in. While BILLING_ENFORCED !== 'true' (the
    // default for the free-access launch) trials never expire-and-suspend and
    // we never return 402 — every authenticated user keeps full access. Flip
    // BILLING_ENFORCED=true (and wire Polar) when billing goes live.
    let status: string = org.status;
    if (process.env.BILLING_ENFORCED === 'true') {
      if (status === 'trial' && org.trial_ends_at && new Date(org.trial_ends_at) < new Date()) {
        status = 'suspended';
        // persist the new status
        await getPool().query(
          `UPDATE organizations SET status = 'suspended', updated_at = now() WHERE id = $1`,
          [tenantId],
        );
      }

      if (status === TenantStatus.SUSPENDED || status === TenantStatus.CANCELLED) {
        // Allow billing endpoints through so users can reactivate.
        const path: string = request.path || request.url || '';
        const isBillingPath = path.includes('/billing/');
        if (!isBillingPath) {
          throw new HttpException(
            {
              message: 'Subscription inactive. Add a payment method to continue.',
              status,
            },
            402,
          );
        }
      }
    }

    const permissions = PERMISSIONS_BY_ROLE[role] || PERMISSIONS_BY_ROLE.member;

    const requestUser: RequestUser = {
      userId: session.user.id,
      tenantId,
      email: session.user.email,
      plan: (org.plan as PlanTier) || PlanTier.FREE,
      permissions,
      roles: [role],
      systemRole: null,
      impersonatedBy,
    };

    request.user = requestUser;
    return true;
  }
}
