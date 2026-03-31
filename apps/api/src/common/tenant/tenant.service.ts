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
      dataImport: false,
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
      dataImport: true,
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
      dataImport: true,
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

  async findByClerkOrgId(clerkOrgId: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { clerkOrgId } });
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
    clerkOrgId: string | null;
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

    // Create Clerk Organization
    let clerkOrgId: string | null = null;
    try {
      clerkOrgId = await this.createClerkOrganization(tenant, dto.adminEmail);
      tenant.clerkOrgId = clerkOrgId;
      await this.tenantRepository.save(tenant);
    } catch (error) {
      this.logger.error(`Failed to create Clerk Organization for tenant ${tenant.id}:`, error);
      // Tenant is still created - Clerk org can be retried
    }

    return { tenant, clerkOrgId };
  }

  private async createClerkOrganization(
    tenant: Tenant,
    adminEmail: string,
  ): Promise<string> {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY', '');

    if (!secretKey) {
      this.logger.warn('Clerk credentials not configured, skipping org creation');
      return '';
    }

    const { createClerkClient } = await import('@clerk/backend');
    const clerk = createClerkClient({ secretKey });

    // Create Organization
    const org = await clerk.organizations.createOrganization({
      name: tenant.name,
      slug: tenant.slug,
      publicMetadata: {
        tenantId: tenant.id,
        plan: tenant.plan,
      },
    });

    // Invite admin user to the organization
    try {
      await clerk.organizations.createOrganizationInvitation({
        organizationId: org.id,
        emailAddress: adminEmail,
        role: 'org:admin',
      });
    } catch (error) {
      this.logger.warn(`Failed to send invitation to ${adminEmail}:`, error);
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
