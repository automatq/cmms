import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantStatus, PlanTier } from '../../modules/users/entities/tenant.entity';

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
    maxUsers: -1,
    maxAssets: -1,
    maxStorageGB: 50,
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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private async writeAudit(
    actorUserId: string,
    actorRole: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO audit_log (actor_user_id, actor_role, action, target_type, target_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [actorUserId, actorRole, action, targetType, targetId, JSON.stringify(metadata)],
      );
    } catch (err) {
      // Audit write failure must not break the underlying operation.
      this.logger.error(`audit_log insert failed: ${(err as Error).message}`);
    }
  }

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

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({ order: { createdAt: 'DESC' } });
  }

  async updatePlan(
    tenantId: string,
    plan: PlanTier,
    actor?: { userId: string; role: string },
  ): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    const previousPlan = tenant.plan;
    tenant.plan = plan;
    tenant.modules = PLAN_LIMITS[plan].modules;
    const saved = await this.tenantRepository.save(tenant);
    if (actor) {
      await this.writeAudit(actor.userId, actor.role, 'tenant.plan_change', 'tenant', tenantId, {
        from: previousPlan,
        to: plan,
      });
    }
    return saved;
  }

  async updateStatus(
    tenantId: string,
    status: TenantStatus,
    actor?: { userId: string; role: string },
  ): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    const previousStatus = tenant.status;
    tenant.status = status;
    const saved = await this.tenantRepository.save(tenant);
    if (actor) {
      await this.writeAudit(actor.userId, actor.role, `tenant.${status}`, 'tenant', tenantId, {
        from: previousStatus,
        to: status,
      });
    }
    return saved;
  }

  async updatePolarCustomerId(tenantId: string, polarCustomerId: string): Promise<void> {
    await this.tenantRepository.update(tenantId, { polarCustomerId });
  }

  async updatePolarSubscriptionId(tenantId: string, polarSubscriptionId: string): Promise<void> {
    await this.tenantRepository.update(tenantId, { polarSubscriptionId });
  }
}
