import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Plan-based feature gating is opt-in. While BILLING_ENFORCED !== 'true'
    // (the default for the free-access launch) every feature is available to
    // every tenant — no plan checks, no 403s. Flip BILLING_ENFORCED=true to
    // re-enable per-plan gating once billing is live.
    if (process.env.BILLING_ENFORCED !== 'true') {
      return true;
    }

    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      return true; // Let auth guards handle missing user
    }

    const enabled = await this.tenantService.isFeatureEnabled(
      user.tenantId,
      requiredFeature,
    );

    if (!enabled) {
      throw new ForbiddenException(
        `Feature "${requiredFeature}" is not available on your current plan. Please upgrade to access this feature.`,
      );
    }

    return true;
  }
}
