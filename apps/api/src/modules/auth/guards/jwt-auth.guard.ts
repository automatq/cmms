import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private clerk;
  private secretKey: string;
  private readonly logger = new Logger(JwtAuthGuard.name);
  private usersService: any;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private moduleRef: ModuleRef,
  ) {
    this.secretKey = this.configService.get<string>('CLERK_SECRET_KEY', '');
    this.clerk = createClerkClient({ secretKey: this.secretKey });
  }

  private async getUsersService() {
    if (!this.usersService) {
      // Lazy-load UsersService to avoid circular dependency / DI scope issues
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
      const payload = await verifyToken(token, { secretKey: this.secretKey }) as any;
      const usersService = await this.getUsersService();

      // Resolve tenant from Clerk org_id — auto-provision if needed
      let tenantId: string | undefined;

      if (payload.org_id) {
        tenantId =
          (await usersService.getTenantIdByClerkOrgId(payload.org_id)) ||
          undefined;

        // Auto-provision tenant for new Clerk orgs
        if (!tenantId) {
          tenantId = await this.autoProvisionTenant(usersService, payload);
        }
      }

      if (!tenantId) {
        // No org in the JWT — auto-provision a personal tenant
        tenantId = await this.autoProvisionPersonalTenant(usersService, payload);
      }

      if (!tenantId) {
        throw new UnauthorizedException(
          'Unable to resolve tenant. Please ensure you are part of an organization.',
        );
      }

      // Sync user
      const email: string =
        String(payload.email || '') ||
        (payload.sub
          ? await this.resolveEmailFromClerk(payload.sub)
          : '');
      const name: string =
        payload.first_name && payload.last_name
          ? `${payload.first_name} ${payload.last_name}`
          : String(payload.name || '') || email.split('@')[0] || 'Unknown';

      const user = await usersService.syncFromClerk(
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
      this.logger.error('Auth error:', (error as any)?.message || error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async autoProvisionTenant(usersService: any, payload: any): Promise<string | undefined> {
    try {
      const org = await this.clerk.organizations.getOrganization({ organizationId: payload.org_id });
      const orgName = org.name || 'My Organization';
      const slug = org.slug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `org-${Date.now()}`;

      const tenantId = await usersService.autoProvisionTenant(orgName, slug, payload.org_id);
      if (tenantId) {
        this.logger.log(`Auto-provisioned tenant ${tenantId} for Clerk org ${payload.org_id}`);
      }
      return tenantId;
    } catch (error) {
      this.logger.error(`Failed to auto-provision tenant for org ${payload.org_id}:`, error);
      return undefined;
    }
  }

  private async autoProvisionPersonalTenant(usersService: any, payload: any): Promise<string | undefined> {
    try {
      const email = payload.email || (payload.sub ? await this.resolveEmailFromClerk(payload.sub) : '');
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
