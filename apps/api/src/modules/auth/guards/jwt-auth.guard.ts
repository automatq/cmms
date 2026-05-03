import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { PlanTier } from '../../users/entities/tenant.entity';

const DEFAULT_TENANT_ID_FALLBACK = '00000000-0000-0000-0000-000000000001';
const DEFAULT_USER_ID_FALLBACK = '00000000-0000-0000-0000-000000000002';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const requestUser: RequestUser = {
      userId: this.config.get<string>('DEFAULT_USER_ID', DEFAULT_USER_ID_FALLBACK),
      tenantId: this.config.get<string>('DEFAULT_TENANT_ID', DEFAULT_TENANT_ID_FALLBACK),
      email: this.config.get<string>('DEFAULT_USER_EMAIL', 'admin@local'),
      plan: PlanTier.ENTERPRISE,
      permissions: ['*'],
      roles: ['admin'],
    };

    request.user = requestUser;
    return true;
  }
}
