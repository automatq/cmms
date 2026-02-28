import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantStatus, PlanTier } from '../../modules/users/entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';

// Plan limits configuration
export const PLAN_LIMITS = {
  [PlanTier.FREE]: {
    maxUsers: 3,
    maxAssets: 50,
    maxStorageGB: 1,
    modules: {
      preventiveMaintenance: true,
      inventory: false,
      purchaseOrders: false,
      reports: false,
      aiAssistant: false,
      sensors: false,
      workRequestsPortal: true,
    },
  },
  [PlanTier.PRO]: {
    maxUsers: 25,
    maxAssets: 500,
    maxStorageGB: 10,
    modules: {
      preventiveMaintenance: true,
      inventory: true,
      purchaseOrders: true,
      reports: true,
      aiAssistant: true,
      sensors: false,
      workRequestsPortal: true,
    },
  },
  [PlanTier.ENTERPRISE]: {
    maxUsers: -1, // unlimited
    maxAssets: -1,
    maxStorageGB: 100,
    modules: {
      preventiveMaintenance: true,
      inventory: true,
      purchaseOrders: true,
      reports: true,
      aiAssistant: true,
      sensors: true,
      workRequestsPortal: true,
    },
  },
};

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async findByAuth0OrgId(auth0OrgId: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { auth0OrgId } });
  }

  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    const tenant = await this.findById(tenantId);
    return tenant.modules?.[feature] === true;
  }

  async checkUserLimit(tenantId: string): Promise<boolean> {
    const tenant = await this.findById(tenantId);
    const limits = PLAN_LIMITS[tenant.plan];
    if (limits.maxUsers === -1) return true;
    return tenant.userCount < limits.maxUsers;
  }

  async checkAssetLimit(tenantId: string): Promise<boolean> {
    const tenant = await this.findById(tenantId);
    const limits = PLAN_LIMITS[tenant.plan];
    if (limits.maxAssets === -1) return true;
    return tenant.assetCount < limits.maxAssets;
  }

  async incrementUserCount(tenantId: string): Promise<void> {
    await this.tenantRepository.increment({ id: tenantId }, 'userCount', 1);
  }

  async decrementUserCount(tenantId: string): Promise<void> {
    await this.tenantRepository.decrement({ id: tenantId }, 'userCount', 1);
  }

  async incrementAssetCount(tenantId: string): Promise<void> {
    await this.tenantRepository.increment({ id: tenantId }, 'assetCount', 1);
  }

  async decrementAssetCount(tenantId: string): Promise<void> {
    await this.tenantRepository.decrement({ id: tenantId }, 'assetCount', 1);
  }

  async updateStorageUsage(tenantId: string, bytesChange: number): Promise<void> {
    await this.tenantRepository.increment({ id: tenantId }, 'storageBytesUsed', bytesChange);
  }

  // ==================== TENANT PROVISIONING ====================

  async provisionTenant(dto: CreateTenantDto): Promise<{
    tenant: Tenant;
    auth0OrgId: string | null;
  }> {
    // Check slug uniqueness
    const existing = await this.tenantRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    // Create tenant record
    const planLimits = PLAN_LIMITS[PlanTier.FREE];
    const tenant = this.tenantRepository.create({
      name: dto.companyName,
      slug: dto.slug,
      status: TenantStatus.TRIAL,
      plan: PlanTier.FREE,
      modules: planLimits.modules,
      timezone: dto.timezone || 'UTC',
      currency: dto.currency || 'USD',
    });

    await this.tenantRepository.save(tenant);

    // Create Auth0 Organization
    let auth0OrgId: string | null = null;
    try {
      auth0OrgId = await this.createAuth0Organization(tenant, dto.adminEmail);
      tenant.auth0OrgId = auth0OrgId;
      await this.tenantRepository.save(tenant);
    } catch (error) {
      this.logger.error(`Failed to create Auth0 Organization for tenant ${tenant.id}:`, error);
      // Tenant is still created - Auth0 org can be retried
    }

    return { tenant, auth0OrgId };
  }

  private async createAuth0Organization(
    tenant: Tenant,
    adminEmail: string,
  ): Promise<string> {
    const domain = this.configService.get<string>('AUTH0_DOMAIN', '');
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>('AUTH0_CLIENT_SECRET', '');

    if (!domain || !clientId || !clientSecret) {
      this.logger.warn('Auth0 credentials not configured, skipping org creation');
      return '';
    }

    // Get Management API token
    const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: `https://${domain}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get Auth0 Management API token: ${tokenResponse.statusText}`);
    }

    const { access_token } = await tokenResponse.json();

    // Create Organization
    const orgResponse = await fetch(`https://${domain}/api/v2/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        name: tenant.slug,
        display_name: tenant.name,
        metadata: {
          tenantId: tenant.id,
          plan: tenant.plan,
        },
      }),
    });

    if (!orgResponse.ok) {
      const errorBody = await orgResponse.text();
      throw new Error(`Failed to create Auth0 Organization: ${orgResponse.statusText} - ${errorBody}`);
    }

    const org = await orgResponse.json();

    // Invite admin user to the organization
    try {
      const inviteResponse = await fetch(
        `https://${domain}/api/v2/organizations/${org.id}/invitations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },
          body: JSON.stringify({
            inviter: { name: 'CMMS' },
            invitee: { email: adminEmail },
            client_id: clientId,
            roles: [], // Admin role will be assigned after login
          }),
        },
      );

      if (!inviteResponse.ok) {
        this.logger.warn(`Failed to send invitation to ${adminEmail}: ${inviteResponse.statusText}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send invitation email:`, error);
    }

    return org.id;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({ order: { createdAt: 'DESC' } });
  }

  async updatePlan(tenantId: string, plan: PlanTier): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    tenant.plan = plan;
    tenant.modules = PLAN_LIMITS[plan].modules;
    return this.tenantRepository.save(tenant);
  }

  async updateStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    tenant.status = status;
    return this.tenantRepository.save(tenant);
  }

  async updateStripeCustomerId(tenantId: string, stripeCustomerId: string): Promise<void> {
    await this.tenantRepository.update(tenantId, { stripeCustomerId });
  }

  async updateStripeSubscriptionId(tenantId: string, stripeSubscriptionId: string): Promise<void> {
    await this.tenantRepository.update(tenantId, { stripeSubscriptionId });
  }
}
