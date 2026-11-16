import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

export const PLATFORM_PERMISSION_PREFIX = 'admin:';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    // Platform-level permissions (admin:*) are reserved for superadmins. The
    // org-owner wildcard '*' must NOT satisfy them, otherwise every self-serve
    // org owner could manage every tenant on the platform.
    const needsPlatformAdmin = requiredPermissions.some((p) =>
      p.startsWith(PLATFORM_PERMISSION_PREFIX),
    );
    if (needsPlatformAdmin && user.systemRole !== 'superadmin') {
      throw new ForbiddenException('Superadmin access required');
    }

    if (user.permissions.includes('*')) {
      return true;
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
