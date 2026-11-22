import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserStatus } from './entities/user.entity';

/**
 * members rows keyed by user id; userRepository.query answers the member /
 * owner-count lookups and records membership writes.
 */
function makeService(members: Record<string, { role: string; status?: string }>, roles: any[] = []) {
  const writes: Array<{ sql: string; params: any[] }> = [];
  const userRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation(async (u) => u),
    query: jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('count(*)')) {
        return [{ count: Object.values(members).filter((m) => m.role === 'owner' && m.status !== 'inactive').length }];
      }
      if (sql.startsWith('SELECT role, status FROM members')) {
        const m = members[params[0]];
        return m ? [{ role: m.role, status: m.status ?? 'active' }] : [];
      }
      writes.push({ sql, params });
      return [];
    }),
  };
  const roleRepository = {
    find: jest.fn(async () => roles),
    findOne: jest.fn(async ({ where }: any) => roles.find((r) => r.id === where.id) ?? null),
  };
  const service = new UsersService(
    userRepository as any,
    roleRepository as any,
    {} as any,
    {} as any,
    {} as any,
  );
  jest.spyOn(service, 'findOne').mockImplementation(
    async (id: string) => ({ id, email: `${id}@x.com`, roles: [], status: UserStatus.ACTIVE }) as any,
  );
  const membershipWrites = () => writes.filter((w) => w.sql.includes('UPDATE members'));
  const roleWrites = () => writes.filter((w) => w.sql.includes('user_roles'));
  return { service, userRepository, membershipWrites, roleWrites };
}

const MEMBERS = {
  owner: { role: 'owner' },
  admin: { role: 'admin' },
  admin2: { role: 'admin' },
  tech: { role: 'member' },
};

describe('UsersService role hierarchy', () => {
  it('admin cannot deactivate the owner', async () => {
    const { service, membershipWrites, userRepository } = makeService(MEMBERS);
    await expect(service.deactivate('owner', 't1', { userId: 'admin' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipWrites()).toHaveLength(0);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('admin cannot deactivate another admin', async () => {
    const { service, membershipWrites } = makeService(MEMBERS);
    await expect(service.deactivate('admin2', 't1', { userId: 'admin' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipWrites()).toHaveLength(0);
  });

  it('admin can deactivate a member', async () => {
    const { service, membershipWrites } = makeService(MEMBERS);
    await service.deactivate('tech', 't1', { userId: 'admin' });
    expect(membershipWrites()[0].params).toEqual(['tech', 't1', 'inactive']);
  });

  it('owner can deactivate an admin', async () => {
    const { service, membershipWrites } = makeService(MEMBERS);
    await service.deactivate('admin', 't1', { userId: 'owner' });
    expect(membershipWrites()).toHaveLength(1);
  });

  it('nobody can deactivate themselves (including the owner)', async () => {
    const { service, membershipWrites } = makeService(MEMBERS);
    await expect(service.deactivate('owner', 't1', { userId: 'owner' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deactivate('admin', 't1', { userId: 'admin' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipWrites()).toHaveLength(0);
  });

  it('admin cannot re-activate a deactivated admin', async () => {
    const { service } = makeService({ ...MEMBERS, admin2: { role: 'admin', status: 'inactive' } });
    await expect(service.activate('admin2', 't1', { userId: 'admin' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('PATCH status: admin cannot deactivate the owner', async () => {
    const { service, membershipWrites, userRepository } = makeService(MEMBERS);
    await expect(
      service.update('owner', { status: UserStatus.INACTIVE }, 't1', { userId: 'admin' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipWrites()).toHaveLength(0);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('PATCH status: self-deactivation is refused', async () => {
    const { service } = makeService(MEMBERS);
    await expect(
      service.update('owner', { status: UserStatus.INACTIVE }, 't1', { userId: 'owner' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('PATCH: an unchanged status echoed by a form is not treated as a status change', async () => {
    const { service, membershipWrites } = makeService(MEMBERS);
    await service.update('admin', { status: UserStatus.ACTIVE, firstName: 'A' }, 't1', { userId: 'admin' });
    expect(membershipWrites()).toHaveLength(0);
  });

  it('PATCH profile: admin cannot edit the owner', async () => {
    const { service } = makeService(MEMBERS);
    await expect(
      service.update('owner', { firstName: 'Mallory' }, 't1', { userId: 'admin' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('PATCH roleIds: only owners grant the admin role', async () => {
    const roles = [{ id: 'r-admin', name: 'admin' }];
    const { service, roleWrites } = makeService(MEMBERS, roles);
    await expect(
      service.update('tech', { roleIds: ['r-admin'] }, 't1', { userId: 'admin' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roleWrites()).toHaveLength(0);

    await service.update('tech', { roleIds: ['r-admin'] }, 't1', { userId: 'owner' });
    expect(roleWrites().length).toBeGreaterThan(0);
  });

  it('assignRole / removeRole enforce rank', async () => {
    const roles = [{ id: 'r-tech', name: 'technician' }];
    const { service } = makeService(MEMBERS, roles);
    await expect(service.assignRole('owner', 'r-tech', 't1', { userId: 'admin' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.removeRole('admin2', 'r-tech', 't1', { userId: 'admin' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.assignRole('tech', 'r-tech', 't1', { userId: 'admin' })).resolves.toBeDefined();
  });

  it('users can still update their own preferences', async () => {
    const { service, userRepository } = makeService(MEMBERS);
    await service.update('tech', { notificationPreferences: { email: false } }, 't1', { userId: 'tech' });
    expect(userRepository.save).toHaveBeenCalled();
  });
});
