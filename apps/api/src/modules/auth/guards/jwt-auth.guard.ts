import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../../users/users.service';
import { TenantService } from '../../../common/tenant/tenant.service';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private clerk;
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private usersService: UsersService,
    private tenantService: TenantService,
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

      // Resolve tenant from Clerk org_id — auto-provision if needed
      let tenantId: string | undefined;

      if (payload.org_id) {
        tenantId =
          (await this.usersService.getTenantIdByClerkOrgId(payload.org_id)) ||
          undefined;

        // Auto-provision tenant for new Clerk orgs
        if (!tenantId) {
          tenantId = await this.autoProvisionTenant(payload);
        }
      }

      if (!tenantId) {
        // No org in the JWT — user may not have selected an org in Clerk
        // Try to auto-provision a personal tenant
        tenantId = await this.autoProvisionPersonalTenant(payload);
      }

      if (!tenantId) {
        throw new UnauthorizedException(
          'Unable to resolve tenant. Please ensure you are part of an organization.',
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
      this.logger.error('Auth error:', error?.message || error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Auto-provision a tenant when a Clerk org_id is present but no matching tenant exists.
   */
  private async autoProvisionTenant(payload: any): Promise<string | undefined> {
    try {
      const org = await this.clerk.organizations.getOrganization({ organizationId: payload.org_id });
      const slug = org.slug || org.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `org-${Date.now()}`;

      // Check slug uniqueness, append random suffix if taken
      let finalSlug = slug;
      const existing = await this.tenantService.findBySlug(finalSlug);
      if (existing) {
        finalSlug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
      }

      const { tenant } = await this.tenantService.provisionTenant({
        companyName: org.name || 'My Organization',
        slug: finalSlug,
        adminEmail: '',
        timezone: 'UTC',
        currency: 'USD',
      });

      // Link the Clerk org
      tenant.clerkOrgId = payload.org_id;
      await this.tenantService.findById(tenant.id); // verify it exists
      // Update clerkOrgId directly
      const tenantRepo = this.tenantService['tenantRepository'];
      await tenantRepo.update(tenant.id, { clerkOrgId: payload.org_id });

      // Seed default roles
      await this.usersService.seedDefaultRoles(tenant.id);

      this.logger.log(`Auto-provisioned tenant ${tenant.id} for Clerk org ${payload.org_id}`);
      return tenant.id;
    } catch (error) {
      this.logger.error(`Failed to auto-provision tenant for org ${payload.org_id}:`, error);
      return undefined;
    }
  }

  /**
   * Auto-provision a personal tenant when user has no Clerk org.
   */
  private async autoProvisionPersonalTenant(payload: any): Promise<string | undefined> {
    try {
      const email = payload.email || (payload.sub ? await this.resolveEmailFromClerk(payload.sub) : '');
      if (!email) return undefined;

      const slug = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `user-${Date.now()}`;

      let finalSlug = slug;
      const existing = await this.tenantService.findBySlug(finalSlug);
      if (existing) {
        // User might already have a personal tenant — check if they're in it
        const existingUser = await this.usersService.findByEmail(email, existing.id);
        if (existingUser) {
          return existing.id;
        }
        finalSlug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
      }

      const { tenant } = await this.tenantService.provisionTenant({
        companyName: `${email.split('@')[0]}'s Organization`,
        slug: finalSlug,
        adminEmail: email,
        timezone: 'UTC',
        currency: 'USD',
      });

      await this.usersService.seedDefaultRoles(tenant.id);

      this.logger.log(`Auto-provisioned personal tenant ${tenant.id} for ${email}`);
      return tenant.id;
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
