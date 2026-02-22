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
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Organization } from './entities/organization.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('users:write')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/deactivate')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }

  @Post(':id/activate')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.activate(id);
  }

  @Post(':userId/roles/:roleId')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.usersService.assignRole(userId, roleId);
  }

  @Delete(':userId/roles/:roleId')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed' })
  removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.usersService.removeRole(userId, roleId);
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
  findAll() {
    return this.usersService.findAllRoles();
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findRoleById(id);
  }

  @Post()
  @Permissions('users:write')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  create(@Body() dto: CreateRoleDto) {
    return this.usersService.createRole(dto);
  }

  @Patch(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto);
  }

  @Delete(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete system role' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deleteRole(id);
  }
}

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly usersService: UsersService) {}

  @Get('config')
  @Public()
  @ApiOperation({ summary: 'Get organization config (public)' })
  @ApiResponse({ status: 200, description: 'Organization config' })
  getConfig() {
    return this.usersService.getOrganization();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings:write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  update(@Body() data: Partial<Organization>) {
    return this.usersService.updateOrganization(data);
  }
}
