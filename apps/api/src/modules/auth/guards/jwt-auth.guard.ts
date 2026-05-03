import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Auth } from 'better-auth';
import { InjectBetterAuth } from 'nestjs-better-auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { PlanTier } from '../../users/entities/tenant.entity';

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  owner: ['*'],
  admin: ['*'],
  member: [
    'work_orders:read',
    'work_orders:write:own',
    'assets:read',
    'inventory:read',
    'pm:read',
    'reports:read',
  ],
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectBetterAuth() private readonly auth: Auth,
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

    const tenantId = (session.session as any).activeOrganizationId;
    if (!tenantId) {
      throw new ForbiddenException(
        'No active organization. Create or join one before using this resource.',
      );
    }

    let role = 'member';
    try {
      const member = await (this.auth.api as any).getActiveMember({ headers });
      role = member?.role || 'member';
    } catch {
      // No member record (org owner, race, etc.) - fall back to member
    }

    const permissions = PERMISSIONS_BY_ROLE[role] || PERMISSIONS_BY_ROLE.member;

    const requestUser: RequestUser = {
      userId: session.user.id,
      tenantId,
      email: session.user.email,
      plan: PlanTier.ENTERPRISE,
      permissions,
      roles: [role],
    };

    request.user = requestUser;
    return true;
  }
}
