import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { TenantStatus } from '../../users/entities/tenant.entity';
import { Auth0TokenService, Auth0JwtPayload } from '../auth0-token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private usersService: any;

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
    private auth0TokenService: Auth0TokenService,
  ) {}

  private async getUsersService() {
    if (!this.usersService) {
      const { UsersService } = await import('../../users/users.service');
      this.usersService = this.moduleRef.get(UsersService, { strict: false });
    }
    return this.usersService;
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
      const payload = await this.auth0TokenService.verifyAccessToken(token);
      const usersService = await this.getUsersService();

      let tenantId: string | undefined;

      if (payload.org_id) {
        tenantId =
          (await usersService.getTenantIdByAuth0OrgId(payload.org_id)) ||
          undefined;

        if (!tenantId) {
          tenantId = await this.autoProvisionTenant(usersService, payload);
        }
      }

      if (!tenantId) {
        tenantId = await this.autoProvisionPersonalTenant(usersService, payload);
      }

      if (!tenantId) {
        throw new UnauthorizedException(
          'Unable to resolve tenant. Please ensure you are part of an organization.',
        );
      }

      const tenant = await usersService.findTenantById(tenantId);
      if (
        tenant.status === TenantStatus.SUSPENDED ||
        tenant.status === TenantStatus.CANCELLED
      ) {
        throw new HttpException(
          {
            message:
              'Subscription inactive. Please update your billing to continue.',
            status: tenant.status,
          },
          402,
        );
      }

      const email: string = String(payload.email || '');
      const name: string =
        String(payload.name || '') || email.split('@')[0] || 'Unknown';

      const user = await usersService.syncFromAuth(
        payload.sub,
        email,
        name,
        tenantId,
      );

      const rolePermissions: string[] = [];
      for (const role of user.roles || []) {
        if (role.permissions) rolePermissions.push(...role.permissions);
      }

      const requestUser: RequestUser = {
        userId: user.id,
        tenantId,
        email: email || user.email,
        plan: tenant.plan,
        permissions: rolePermissions,
        roles: user.roles?.map((r) => r.name) || [],
      };

      request.user = requestUser;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof HttpException) throw error;
      this.logger.error('Auth error:', (error as any)?.message || error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async autoProvisionTenant(usersService: any, payload: Auth0JwtPayload): Promise<string | undefined> {
    try {
      const orgName = String(payload.org_name || '') || `Organization ${payload.org_id}`;
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `org-${Date.now()}`;

      const tenantId = await usersService.autoProvisionTenant(orgName, slug, payload.org_id);
      if (tenantId) {
        this.logger.log(`Auto-provisioned tenant ${tenantId} for Auth0 org ${payload.org_id}`);
      }
      return tenantId;
    } catch (error) {
      this.logger.error(`Failed to auto-provision tenant for org ${payload.org_id}:`, error);
      return undefined;
    }
  }

  private async autoProvisionPersonalTenant(usersService: any, payload: Auth0JwtPayload): Promise<string | undefined> {
    try {
      const email = String(payload.email || '');
      if (!email) return undefined;

      const slug = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `user-${Date.now()}`;
      const tenantId = await usersService.autoProvisionPersonalTenant(email, slug);
      if (tenantId) {
        this.logger.log(`Auto-provisioned personal tenant ${tenantId} for ${email}`);
      }
      return tenantId;
    } catch (error) {
      this.logger.error('Failed to auto-provision personal tenant:', error);
      return undefined;
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
}
