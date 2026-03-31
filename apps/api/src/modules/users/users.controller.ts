import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantService } from '../../common/tenant/tenant.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.findOne(user.userId, user.tenantId);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  updateMyPreferences(
    @Body('notificationPreferences') preferences: Record<string, boolean>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(user.userId, { notificationPreferences: preferences }, user.tenantId);
  }

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@Query() query: UserQueryDto, @CurrentUser() user: RequestUser) {
    return this.usersService.findAll(query, user.tenantId);
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.findOne(id, user.tenantId);
  }

  @Post()
  @Permissions('users:write')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.update(id, dto, user.tenantId);
  }

  @Post(':id/deactivate')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.deactivate(id, user.tenantId);
  }

  @Post(':id/activate')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated' })
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.activate(id, user.tenantId);
  }

  @Post(':userId/roles/:roleId')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.assignRole(userId, roleId, user.tenantId);
  }

  @Delete(':userId/roles/:roleId')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed' })
  removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.removeRole(userId, roleId, user.tenantId);
  }
}

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.usersService.findAllRoles(user.tenantId);
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.findRoleById(id, user.tenantId);
  }

  @Post()
  @Permissions('users:write')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: RequestUser) {
    return this.usersService.createRole(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: RequestUser) {
    return this.usersService.updateRole(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete system role' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.deleteRole(id, user.tenantId);
  }
}

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('config/:slug')
  @Public()
  @ApiOperation({ summary: 'Get organization config by slug (public)' })
  @ApiResponse({ status: 200, description: 'Organization config' })
  async getConfig(@Param('slug') slug: string) {
    const tenant = await this.tenantService.findBySlug(slug);
    if (!tenant || tenant.status === 'suspended' || tenant.status === 'cancelled') {
      throw new NotFoundException('Organization not found');
    }
    return {
      name: tenant.name,
      slug: tenant.slug,
      modules: tenant.modules,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current organization' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  getOrganization(@CurrentUser() user: RequestUser) {
    return this.usersService.getOrganization(user.tenantId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings:write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  update(@Body() data: Partial<Tenant>, @CurrentUser() user: RequestUser) {
    return this.usersService.updateOrganization(data, user.tenantId);
  }

  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark onboarding as completed' })
  @ApiResponse({ status: 200, description: 'Onboarding completed' })
  completeOnboarding(@CurrentUser() user: RequestUser) {
    return this.usersService.completeOnboarding(user.tenantId);
  }
}
