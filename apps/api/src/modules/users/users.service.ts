import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Tenant } from './entities/tenant.entity';
import { CreateUserDto, UpdateUserDto, UserQueryDto, CreateRoleDto, UpdateRoleDto } from './dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { UsageService } from '../billing/usage.service';
import { TenantService } from '../../common/tenant/tenant.service';

/**
 * UsersService — works on Better Auth's `users` table.
 *
 * Users are GLOBAL identities; their membership in an organization is tracked
 * via the `members` table. Every tenant-scoped lookup JOINs through `members`
 * to enforce that the requested user actually belongs to the requesting tenant.
 *
 * Better Auth owns the row lifecycle (sign-up creates the user; org-invite
 * creates the member). Our `roles`/`user_roles` tables are kept for
 * fine-grained per-permission roles in addition to Better Auth's owner/admin/member.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly usageService: UsageService,
    private readonly tenantService: TenantService,
  ) {}

  // ==================== USER METHODS ====================

  /**
   * Create a user as a member of the given tenant.
   * Used for admin-driven user creation in Settings > Users.
   * Note: this creates BOTH the auth identity AND the member row;
   * for invitation flows, use Better Auth's invitation API instead.
   */
  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    await this.usageService.enforceUserLimit(tenantId);

    // Email is globally unique now
    const existingByEmail = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingByEmail) {
      // If user exists but isn't a member of this tenant, add them
      const isMember = await this.isMemberOfTenant(existingByEmail.id, tenantId);
      if (isMember) {
        throw new ConflictException('User already exists in this organization');
      }
      await this.addMember(existingByEmail.id, tenantId, 'member');
      return this.findOne(existingByEmail.id, tenantId);
    }

    const roles = dto.roleIds?.length
      ? await this.findRolesByIds(dto.roleIds, tenantId)
      : [];

    const { roleIds, ...userData } = dto;
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    await this.addMember(savedUser.id, tenantId, 'member');

    if (roles.length > 0) {
      await this.setUserRoleIds(savedUser.id, roles.map((role) => role.id), tenantId);
    }
    await this.tenantService.incrementUserCount(tenantId);
    return this.findOne(savedUser.id, tenantId);
  }

  async findAll(query: UserQueryDto, tenantId: string): Promise<PaginatedResult<User>> {
    const { page, limit, search, status, department, roleId } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .leftJoinAndSelect('user.roles', 'role');

    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.username ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (department) {
      queryBuilder.andWhere('user.department = :department', { department });
    }

    if (roleId) {
      queryBuilder.andWhere('role.id = :roleId', { roleId });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);

    if (dto.roleIds !== undefined) {
      const roles = dto.roleIds.length
        ? await this.findRolesByIds(dto.roleIds, tenantId)
        : [];
      await this.setUserRoleIds(id, roles.map((role) => role.id), tenantId);
      user.roles = roles;
    }

    const { roleIds, ...updateData } = dto;
    Object.assign(user, updateData);

    await this.userRepository.save(user);
    return this.findOne(id, tenantId);
  }

  async deactivate(id: string, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.status = UserStatus.INACTIVE;
    return this.userRepository.save(user);
  }

  async activate(id: string, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }

  async assignRole(userId: string, roleId: string, tenantId: string): Promise<User> {
    const user = await this.findOne(userId, tenantId);
    const role = await this.roleRepository.findOne({ where: { id: roleId, tenantId } });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    if (!user.roles.find((r) => r.id === roleId)) {
      await this.userRepository.query(
        `INSERT INTO user_roles (user_id, role_id, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [user.id, role.id, tenantId],
      );
    }

    return this.findOne(userId, tenantId);
  }

  async removeRole(userId: string, roleId: string, tenantId: string): Promise<User> {
    await this.findOne(userId, tenantId);
    await this.findRoleById(roleId, tenantId);
    await this.userRepository.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 AND tenant_id = $3`,
      [userId, roleId, tenantId],
    );
    return this.findOne(userId, tenantId);
  }

  // ==================== MEMBERSHIP HELPERS ====================

  private async isMemberOfTenant(userId: string, tenantId: string): Promise<boolean> {
    const result = await this.userRepository.query(
      `SELECT 1 FROM members WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
      [userId, tenantId],
    );
    return result.length > 0;
  }

  private async addMember(userId: string, tenantId: string, role: string): Promise<void> {
    await this.userRepository.query(
      `INSERT INTO members (id, user_id, organization_id, role, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, now())
       ON CONFLICT DO NOTHING`,
      [userId, tenantId, role],
    );
  }

  // ==================== ROLE METHODS ====================

  async createRole(dto: CreateRoleDto, tenantId: string): Promise<Role> {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name, tenantId },
    });

    if (existing) {
      throw new ConflictException(`Role with name ${dto.name} already exists`);
    }

    const role = this.roleRepository.create({
      ...dto,
      tenantId,
    });
    return this.roleRepository.save(role);
  }

  async findAllRoles(tenantId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findRoleById(id: string, tenantId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id, tenantId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto, tenantId: string): Promise<Role> {
    const role = await this.findRoleById(id, tenantId);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: dto.name, tenantId },
      });
      if (existing) {
        throw new ConflictException(`Role with name ${dto.name} already exists`);
      }
    }

    Object.assign(role, dto);
    return this.roleRepository.save(role);
  }

  async deleteRole(id: string, tenantId: string): Promise<void> {
    const role = await this.findRoleById(id, tenantId);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    await this.roleRepository.remove(role);
  }

  // ==================== TENANT / ORGANIZATION METHODS ====================

  async getOrganization(tenantId: string): Promise<Tenant> {
    const org = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!org) {
      throw new NotFoundException(`Organization with ID ${tenantId} not found`);
    }
    return org;
  }

  async updateOrganization(data: Partial<Tenant>, tenantId: string): Promise<Tenant> {
    const org = await this.getOrganization(tenantId);
    const { name, logoUrl, timezone, currency, settings } = data as any;
    if (name !== undefined) org.name = name;
    if (logoUrl !== undefined) org.logoUrl = logoUrl;
    if (timezone !== undefined) org.timezone = timezone;
    if (currency !== undefined) org.currency = currency;
    if (settings !== undefined) org.settings = settings;
    return this.tenantRepository.save(org);
  }

  async completeOnboarding(tenantId: string): Promise<Tenant> {
    const org = await this.getOrganization(tenantId);
    org.onboardingCompleted = true;
    return this.tenantRepository.save(org);
  }

  async findTenantById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async findTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  // ==================== SEED DEFAULT ROLES ====================

  /**
   * Called from Better Auth's organization.afterCreate hook in better-auth.ts.
   * Seeds the standard role catalog so admins can assign granular permissions.
   */
  async seedDefaultRoles(tenantId: string): Promise<void> {
    const defaultRoles = [
      { name: 'admin', description: 'Full system access', permissions: ['*'], isSystem: true },
      {
        name: 'manager',
        description: 'Manage work orders, assets, and users',
        permissions: [
          'work_orders:read', 'work_orders:write',
          'assets:read', 'assets:write',
          'pm:read', 'pm:write',
          'inventory:read', 'inventory:write',
          'reports:read', 'users:read',
        ],
        isSystem: true,
      },
      {
        name: 'technician',
        description: 'Complete assigned work orders',
        permissions: ['work_orders:read', 'work_orders:write:own', 'assets:read', 'inventory:read'],
        isSystem: true,
      },
      {
        name: 'planner',
        description: 'Plan and schedule maintenance',
        permissions: [
          'work_orders:read', 'work_orders:write',
          'assets:read', 'pm:read', 'pm:write', 'inventory:read',
        ],
        isSystem: true,
      },
      {
        name: 'requestor',
        description: 'Submit work requests',
        permissions: ['work_requests:write'],
        isSystem: true,
      },
      {
        name: 'inventory_manager',
        description: 'Manage inventory and parts',
        permissions: ['inventory:read', 'inventory:write', 'work_orders:read'],
        isSystem: true,
      },
      {
        name: 'viewer',
        description: 'Read-only access',
        permissions: ['work_orders:read', 'assets:read', 'pm:read', 'inventory:read', 'reports:read'],
        isSystem: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.roleRepository.findOne({
        where: { name: roleData.name, tenantId },
      });

      if (!existing) {
        const role = this.roleRepository.create({ ...roleData, tenantId });
        await this.roleRepository.save(role);
      }
    }
  }

  private async findRolesByIds(roleIds: string[], tenantId: string): Promise<Role[]> {
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds), tenantId },
    });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles were not found for this tenant');
    }

    return roles;
  }

  private async setUserRoleIds(userId: string, roleIds: string[], tenantId: string): Promise<void> {
    await this.userRepository.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    );

    for (const roleId of roleIds) {
      await this.userRepository.query(
        `INSERT INTO user_roles (user_id, role_id, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, roleId, tenantId],
      );
    }
  }
}
