import { ArgumentMetadata, BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto';

// Same options as the global pipe in main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});
const body = (metatype: any): ArgumentMetadata => ({ type: 'body', metatype });

function makeService(overrides: { existing?: any; isMember?: boolean; current?: any } = {}) {
  const userRepository = {
    findOne: jest.fn().mockResolvedValue(overrides.existing ?? null),
    insert: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockImplementation(async (u) => u),
  };
  const usageService = { enforceUserLimit: jest.fn() };
  const tenantService = { incrementUserCount: jest.fn() };
  const service = new UsersService(
    userRepository as any,
    {} as any,
    {} as any,
    usageService as any,
    tenantService as any,
  );
  const addMember = jest.spyOn(service as any, 'addMember').mockResolvedValue(undefined);
  jest.spyOn(service as any, 'isMemberOfTenant').mockResolvedValue(overrides.isMember ?? false);
  jest.spyOn(service, 'findOne').mockResolvedValue(
    overrides.current ?? ({ id: 'victim', email: 'victim@corp.com' } as any),
  );
  return { service, userRepository, addMember };
}

describe('UsersService account-takeover protections', () => {
  const dto = { username: 'bob', email: 'victim@corp.com', firstName: 'B', lastName: 'B' } as CreateUserDto;

  it('rejects a client-supplied id on create (no upsert over existing rows)', async () => {
    await expect(
      pipe.transform({ ...dto, id: '6f1c1a8e-0000-4000-8000-000000000000' }, body(CreateUserDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not attach an existing global account to the caller tenant', async () => {
    const { service, addMember } = makeService({ existing: { id: 'victim', email: dto.email } });
    await expect(service.create(dto, 'attacker-tenant', { userId: 'admin-1' })).rejects.toBeInstanceOf(ConflictException);
    expect(addMember).not.toHaveBeenCalled();
  });

  it('creates new users with insert() and a server-generated id', async () => {
    const { service, userRepository } = makeService();
    await service.create(dto, 't1', { userId: 'admin-1' });
    expect(userRepository.save).not.toHaveBeenCalled();
    const inserted = userRepository.insert.mock.calls[0][0];
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses to change a user email from the tenant admin endpoint', async () => {
    const { service, userRepository } = makeService();
    await expect(service.update('victim', { email: 'attacker@evil.com' }, 't1', { userId: 'admin-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('tolerates an unchanged email echoed back by the edit form', async () => {
    const { service, userRepository } = makeService();
    await service.update('victim', { email: 'Victim@corp.com', firstName: 'V' }, 't1', { userId: 'victim' });
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'victim@corp.com', firstName: 'V' }),
    );
  });
});
