import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  manager: [
    'users:read',
    'assets:read', 'assets:write',
    'workorders:read', 'workorders:write', 'workorders:delete',
    'pm:read', 'pm:write',
    'inventory:read', 'inventory:write',
    'reports:read',
    'ai:read',
    'notifications:read', 'notifications:write',
  ],
  technician: [
    'assets:read',
    'workorders:read', 'workorders:write',
    'pm:read',
    'inventory:read',
    'ai:read',
    'notifications:read',
  ],
  planner: [
    'assets:read',
    'workorders:read', 'workorders:write',
    'pm:read', 'pm:write',
    'inventory:read',
    'reports:read',
    'ai:read',
    'notifications:read',
  ],
  requestor: [
    'assets:read',
    'workorders:read',
    'notifications:read',
  ],
  inventory_manager: [
    'assets:read',
    'inventory:read', 'inventory:write', 'inventory:delete',
    'reports:read',
    'notifications:read',
  ],
  viewer: [
    'assets:read',
    'workorders:read',
    'pm:read',
    'inventory:read',
    'reports:read',
  ],
};

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

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const userPermissions = this.getUserPermissions(user);

    // Check if user has wildcard permission (admin)
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if user has all required permissions
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }

  private getUserPermissions(user: JwtPayload): string[] {
    const permissions: string[] = [];

    // Get roles from realm_access
    const realmRoles = user.realm_access?.roles || [];
    
    // Get roles from resource_access (client roles)
    const clientRoles: string[] = [];
    if (user.resource_access) {
      Object.values(user.resource_access).forEach((client) => {
        clientRoles.push(...(client.roles || []));
      });
    }

    const allRoles = [...realmRoles, ...clientRoles];

    // Map roles to permissions
    for (const role of allRoles) {
      const rolePermissions = ROLE_PERMISSIONS[role.toLowerCase()];
      if (rolePermissions) {
        permissions.push(...rolePermissions);
      }
    }

    // Remove duplicates
    return [...new Set(permissions)];
  }
}
