import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PlanTier } from '../../modules/users/entities/tenant.entity';

// Rate limits per minute by plan tier
const PLAN_RATE_LIMITS: Record<string, { ttl: number; limit: number }> = {
  [PlanTier.FREE]: { ttl: 60000, limit: 100 },
  [PlanTier.PRO]: { ttl: 60000, limit: 500 },
  [PlanTier.ENTERPRISE]: { ttl: 60000, limit: 2000 },
};

const DEFAULT_RATE_LIMIT = PLAN_RATE_LIMITS[PlanTier.FREE];

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use tenantId as the tracking key so all users in a tenant share the limit
    const tenantId = req.user?.tenantId;
    if (tenantId) {
      return tenantId;
    }
    // Fall back to IP for unauthenticated requests
    return req.ip;
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    const req = context.switchToHttp().getRequest();
    const plan = req.user?.plan as PlanTier;
    const rateLimit = plan ? PLAN_RATE_LIMITS[plan] : DEFAULT_RATE_LIMIT;
    return (rateLimit || DEFAULT_RATE_LIMIT).limit;
  }

  protected async getTtl(context: ExecutionContext): Promise<number> {
    const req = context.switchToHttp().getRequest();
    const plan = req.user?.plan as PlanTier;
    const rateLimit = plan ? PLAN_RATE_LIMITS[plan] : DEFAULT_RATE_LIMIT;
    return (rateLimit || DEFAULT_RATE_LIMIT).ttl;
  }
}
