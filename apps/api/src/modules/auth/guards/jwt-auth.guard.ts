import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../../users/users.service';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private clerk;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    this.clerk = createClerkClient({
      secretKey: this.configService.get<string>('CLERK_SECRET_KEY', ''),
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.clerk.verifyToken(token);

      // Resolve tenant from Clerk org_id
      let tenantId: string | undefined;
      if (payload.org_id) {
        tenantId =
          (await this.usersService.getTenantIdByClerkOrgId(payload.org_id)) ||
          undefined;
      }

      if (!tenantId) {
        throw new UnauthorizedException(
          'Unable to resolve tenant. Ensure the user belongs to a Clerk Organization.',
        );
      }

      // Sync user
      const email =
        payload.email ||
        (payload.sub
          ? await this.resolveEmailFromClerk(payload.sub)
          : '');
      const name =
        payload.first_name && payload.last_name
          ? `${payload.first_name} ${payload.last_name}`
          : payload.name || email.split('@')[0] || 'Unknown';

      const user = await this.usersService.syncFromClerk(
        payload.sub,
        email,
        name,
        tenantId,
      );

      const requestUser: RequestUser = {
        userId: user.id,
        tenantId,
        email: email || user.email,
        permissions: payload.org_permissions || [],
        roles: user.roles?.map((r) => r.name) || [],
      };

      request.user = requestUser;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }

  private async resolveEmailFromClerk(userId: string): Promise<string> {
    try {
      const user = await this.clerk.users.getUser(userId);
      return (
        user.emailAddresses?.find(
          (e) => e.id === user.primaryEmailAddressId,
        )?.emailAddress || ''
      );
    } catch {
      return '';
    }
  }
}
