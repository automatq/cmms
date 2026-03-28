import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Tenant } from './entities/tenant.entity';
import { CreateUserDto, UpdateUserDto, UserQueryDto, CreateRoleDto, UpdateRoleDto } from './dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { UsageService } from '../billing/usage.service';
import { TenantService } from '../../common/tenant/tenant.service';

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
   * Sync a user from Clerk on login. Finds by email + tenantId, creates if not found.
   * Clerk `sub` (e.g. "auth0|abc123") is not a valid UUID, so we use auto-generated UUIDs
   * for the user primary key and match on email within the tenant instead.
   */
  async syncFromClerk(
    clerkUserId: string,
    email: string,
    name: string,
    tenantId: string,
  ): Promise<User> {
    // Find existing user by email in this tenant
    let user = await this.userRepository.findOne({
      where: { email, tenantId },
      relations: ['roles'],
    });

    if (user) {
      user.lastLoginAt = new Date();
      return this.userRepository.save(user);
    }

    // Auto-provision new user on first login
    const defaultRole = await this.roleRepository.findOne({
      where: { name: 'technician', tenantId },
    });

    const [firstName, ...lastParts] = name.split(' ');

    user = this.userRepository.create({
      id: uuidv4(),
      tenantId,
      username: email.split('@')[0],
      email,
      firstName: firstName || '',
      lastName: lastParts.join(' ') || '',
      roles: defaultRole ? [defaultRole] : [],
      lastLoginAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    await this.usageService.enforceUserLimit(tenantId);

    const existingUser = await this.userRepository.findOne({
      where: [
        { email: dto.email, tenantId },
        { username: dto.username, tenantId },
      ],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    let roles: Role[] = [];
    if (dto.roleIds?.length) {
      roles = await this.roleRepository.find({
        where: { id: In(dto.roleIds) },
      });
    }

    const user = this.userRepository.create({
      ...dto,
      roles,
      tenantId,
    });

    const savedUser = await this.userRepository.save(user);
    await this.tenantService.incrementUserCount(tenantId);
    return savedUser;
  }

  async findAll(query: UserQueryDto, tenantId: string): Promise<PaginatedResult<User>> {
    const { page, limit, search, status, department, roleId } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    queryBuilder.andWhere('user.tenantId = :tenantId', { tenantId });

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
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, tenantId },
      relations: ['roles'],
    });
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);

    if (dto.roleIds !== undefined) {
      user.roles = dto.roleIds.length
        ? await this.roleRepository.find({ where: { id: In(dto.roleIds) } })
        : [];
    }

    const { roleIds, ...updateData } = dto;
    Object.assign(user, updateData);

    return this.userRepository.save(user);
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
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return user;
  }

  async removeRole(userId: string, roleId: string, tenantId: string): Promise<User> {
    const user = await this.findOne(userId, tenantId);
    user.roles = user.roles.filter((r) => r.id !== roleId);
    return this.userRepository.save(user);
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

  async getOrganization(tenantId?: string): Promise<Tenant> {
    let org: Tenant | null;

    if (tenantId) {
      org = await this.tenantRepository.findOne({ where: { id: tenantId } });
    } else {
      // Fallback for public endpoints without tenant context
      org = await this.tenantRepository.findOne({ where: {} });
    }

    if (!org) {
      org = this.tenantRepository.create({
        name: 'My Organization',
        slug: 'default',
      });
      org = await this.tenantRepository.save(org);
    }

    return org;
  }

  async updateOrganization(data: Partial<Tenant>, tenantId: string): Promise<Tenant> {
    const org = await this.getOrganization(tenantId);
    // Only allow updating safe fields
    const { name, logoUrl, timezone, currency, modules, settings } = data as any;
    if (name !== undefined) org.name = name;
    if (logoUrl !== undefined) org.logoUrl = logoUrl;
    if (timezone !== undefined) org.timezone = timezone;
    if (currency !== undefined) org.currency = currency;
    if (modules !== undefined) org.modules = modules;
    if (settings !== undefined) org.settings = settings;
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

  async findTenantByClerkOrgId(clerkOrgId: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { clerkOrgId } });
  }

  async getTenantIdByClerkOrgId(clerkOrgId: string): Promise<string | null> {
    const tenant = await this.tenantRepository.findOne({
      where: { clerkOrgId },
      select: ['id'],
    });
    return tenant?.id || null;
  }

  // ==================== SEED DEFAULT ROLES ====================

  async seedDefaultRoles(tenantId: string): Promise<void> {
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Full system access',
        permissions: ['*'],
        isSystem: true,
      },
      {
        name: 'manager',
        description: 'Manage work orders, assets, and users',
        permissions: [
          'work_orders:read',
          'work_orders:write',
          'assets:read',
          'assets:write',
          'pm:read',
          'pm:write',
          'inventory:read',
          'inventory:write',
          'reports:read',
          'users:read',
        ],
        isSystem: true,
      },
      {
        name: 'technician',
        description: 'Complete assigned work orders',
        permissions: [
          'work_orders:read',
          'work_orders:write:own',
          'assets:read',
          'inventory:read',
        ],
        isSystem: true,
      },
      {
        name: 'planner',
        description: 'Plan and schedule maintenance',
        permissions: [
          'work_orders:read',
          'work_orders:write',
          'assets:read',
          'pm:read',
          'pm:write',
          'inventory:read',
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
        permissions: [
          'inventory:read',
          'inventory:write',
          'work_orders:read',
        ],
        isSystem: true,
      },
      {
        name: 'viewer',
        description: 'Read-only access',
        permissions: [
          'work_orders:read',
          'assets:read',
          'pm:read',
          'inventory:read',
          'reports:read',
        ],
        isSystem: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.roleRepository.findOne({
        where: { name: roleData.name, tenantId },
      });

      if (!existing) {
        const role = this.roleRepository.create({
          ...roleData,
          tenantId,
        });
        await this.roleRepository.save(role);
      }
    }
  }
}
