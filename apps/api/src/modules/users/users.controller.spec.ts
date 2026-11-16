// The real guard pulls in better-auth (ESM); it is not exercised here.
jest.mock('../auth/guards/jwt-auth.guard', () => ({ JwtAuthGuard: class {} }));

import { UsersController } from './users.controller';
import { RequestUser } from '../../common/interfaces/request-user.interface';

describe('UsersController.getMyPermissions', () => {
  const controller = new UsersController({} as any);

  it('returns the effective permissions, roles and system role of the caller', () => {
    const user = {
      userId: 'u1',
      tenantId: 't1',
      email: 'tech@example.com',
      plan: 'pro',
      permissions: ['assets:read', 'work_orders:write'],
      roles: ['technician'],
      systemRole: null,
    } as unknown as RequestUser;

    expect(controller.getMyPermissions(user)).toEqual({
      permissions: ['assets:read', 'work_orders:write'],
      roles: ['technician'],
      systemRole: null,
    });
  });

  it('defaults missing fields', () => {
    const user = { userId: 'u1', tenantId: '' } as unknown as RequestUser;
    expect(controller.getMyPermissions(user)).toEqual({ permissions: [], roles: [], systemRole: null });
  });
});
