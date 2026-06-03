import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get all teams' })
  @ApiResponse({ status: 200, description: 'List of teams' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.teamsService.findAll(user.tenantId);
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({ status: 200, description: 'Team details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.teamsService.findOne(id, user.tenantId);
  }

  @Post()
  @Permissions('users:write')
  @ApiOperation({ summary: 'Create a team' })
  @ApiResponse({ status: 201, description: 'Team created' })
  create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.teamsService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update a team' })
  @ApiResponse({ status: 200, description: 'Team updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.teamsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Delete a team' })
  @ApiResponse({ status: 200, description: 'Team deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.teamsService.delete(id, user.tenantId);
  }

  @Post(':id/members')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Add member to team' })
  @ApiResponse({ status: 200, description: 'Member added' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddTeamMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.teamsService.addMember(id, body.userId, user.tenantId);
  }

  @Delete(':id/members/:userId')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.teamsService.removeMember(id, userId, user.tenantId);
  }
}
