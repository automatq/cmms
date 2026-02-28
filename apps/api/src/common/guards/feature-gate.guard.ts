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
