import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

function ctx(user: Partial<RequestUser>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(perms: string[]) {
  const reflector = {
    getAllAndOverride: (key: string) => (key === 'permissions' ? perms : false),
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

describe('PermissionsGuard', () => {
  const owner = { userId: 'u1', tenantId: 't1', permissions: ['*'], roles: ['owner'] };
  const superadmin = { ...owner, roles: ['superadmin'], systemRole: 'superadmin' as const };

  it('denies platform admin:* permissions to an org owner holding the * wildcard', () => {
    expect(() => guardRequiring(['admin:tenants']).canActivate(ctx(owner))).toThrow(ForbiddenException);
  });

  it('denies admin:* even when the permission is explicitly listed for a non-superadmin', () => {
    const u = { ...owner, permissions: ['admin:tenants'] };
    expect(() => guardRequiring(['admin:tenants']).canActivate(ctx(u))).toThrow(ForbiddenException);
  });

  it('allows superadmins through admin:* permissions', () => {
    expect(guardRequiring(['admin:tenants']).canActivate(ctx(superadmin))).toBe(true);
  });

  it('still lets the owner wildcard satisfy tenant-level permissions', () => {
    expect(guardRequiring(['users:write']).canActivate(ctx(owner))).toBe(true);
  });

  it('denies members missing a tenant-level permission', () => {
    const member = { ...owner, permissions: ['assets:read'], roles: ['member'] };
    expect(() => guardRequiring(['users:write']).canActivate(ctx(member))).toThrow(ForbiddenException);
  });
});
