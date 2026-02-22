import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ILike } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Organization } from './entities/organization.entity';
import { CreateUserDto, UpdateUserDto, UserQueryDto, CreateRoleDto, UpdateRoleDto } from './dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';

export interface KeycloakUserPayload {
  sub: string;
  preferred_username: string;
  email: string;
  given_name: string;
  family_name: string;
  realm_access?: {
    roles: string[];
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  // ==================== USER METHODS ====================

  async syncFromKeycloak(keycloakUser: KeycloakUserPayload): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { id: keycloakUser.sub },
    });

    if (user) {
      user.lastLoginAt = new Date();
      return this.userRepository.save(user);
    }

    // Get default technician role
    let defaultRole = await this.roleRepository.findOne({
      where: { name: 'technician' },
    });

    user = this.userRepository.create({
      id: keycloakUser.sub,
      username: keycloakUser.preferred_username,
      email: keycloakUser.email,
      firstName: keycloakUser.given_name || '',
      lastName: keycloakUser.family_name || '',
      roles: defaultRole ? [defaultRole] : [],
      lastLoginAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
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
    });

    return this.userRepository.save(user);
  }

  async findAll(query: UserQueryDto): Promise<PaginatedResult<User>> {
    const { page, limit, search, status, department, roleId } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
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

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.roleIds !== undefined) {
      user.roles = dto.roleIds.length
        ? await this.roleRepository.find({ where: { id: In(dto.roleIds) } })
        : [];
    }

    const { roleIds, ...updateData } = dto;
    Object.assign(user, updateData);

    return this.userRepository.save(user);
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.status = UserStatus.INACTIVE;
    return this.userRepository.save(user);
  }

  async activate(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }

  async assignRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findOne(userId);
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    if (!user.roles.find((r) => r.id === roleId)) {
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return user;
  }

  async removeRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.roles = user.roles.filter((r) => r.id !== roleId);
    return this.userRepository.save(user);
  }

  // ==================== ROLE METHODS ====================

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Role with name ${dto.name} already exists`);
    }

    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findRoleById(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`Role with name ${dto.name} already exists`);
      }
    }

    Object.assign(role, dto);
    return this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.findRoleById(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    await this.roleRepository.remove(role);
  }

  // ==================== ORGANIZATION METHODS ====================

  async getOrganization(): Promise<Organization> {
    let org = await this.organizationRepository.findOne({ where: {} });
    
    if (!org) {
      org = this.organizationRepository.create({
        name: 'My Organization',
      });
      org = await this.organizationRepository.save(org);
    }

    return org;
  }

  async updateOrganization(data: Partial<Organization>): Promise<Organization> {
    const org = await this.getOrganization();
    Object.assign(org, data);
    return this.organizationRepository.save(org);
  }

  // ==================== SEED DEFAULT ROLES ====================

  async seedDefaultRoles(): Promise<void> {
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
        where: { name: roleData.name },
      });

      if (!existing) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
      }
    }
  }
}
