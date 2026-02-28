import { Injectable, ForbiddenException } from '@nestjs/common';
import { TenantService, PLAN_LIMITS } from '../../common/tenant/tenant.service';

@Injectable()
export class UsageService {
  constructor(private readonly tenantService: TenantService) {}

  async enforceUserLimit(tenantId: string): Promise<void> {
    const allowed = await this.tenantService.checkUserLimit(tenantId);
    if (!allowed) {
      const tenant = await this.tenantService.findById(tenantId);
      const limits = PLAN_LIMITS[tenant.plan];
      throw new ForbiddenException(
        `User limit reached (${limits.maxUsers} users on ${tenant.plan} plan). Please upgrade your plan to add more users.`,
      );
    }
  }

  async enforceAssetLimit(tenantId: string): Promise<void> {
    const allowed = await this.tenantService.checkAssetLimit(tenantId);
    if (!allowed) {
      const tenant = await this.tenantService.findById(tenantId);
      const limits = PLAN_LIMITS[tenant.plan];
      throw new ForbiddenException(
        `Asset limit reached (${limits.maxAssets} assets on ${tenant.plan} plan). Please upgrade your plan to add more assets.`,
      );
    }
  }

  async enforceStorageLimit(tenantId: string, fileSizeBytes: number): Promise<void> {
    const tenant = await this.tenantService.findById(tenantId);
    const limits = PLAN_LIMITS[tenant.plan];
    const maxBytes = limits.maxStorageGB * 1024 * 1024 * 1024;
    const projectedUsage = tenant.storageBytesUsed + fileSizeBytes;

    if (projectedUsage > maxBytes) {
      throw new ForbiddenException(
        `Storage limit reached (${limits.maxStorageGB} GB on ${tenant.plan} plan). Please upgrade your plan for more storage.`,
      );
    }
  }
}
