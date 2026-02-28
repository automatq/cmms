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
import { PmService } from './pm.service';
import {
  CreatePmPlanDto,
  UpdatePmPlanDto,
  PmQueryDto,
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@ApiTags('Preventive Maintenance')
@ApiBearerAuth()
@Controller('pm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PmController {
  constructor(private readonly pmService: PmService) {}

  @Get()
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get all PM plans' })
  @ApiResponse({ status: 200, description: 'List of PM plans' })
  findAll(@Query() query: PmQueryDto, @CurrentUser() user: RequestUser) {
    return this.pmService.findAll(query, user.tenantId);
  }

  @Get('due-today')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plans due today' })
  @ApiResponse({ status: 200, description: 'PM plans due today' })
  getDueToday(@CurrentUser() user: RequestUser) {
    return this.pmService.getDueToday(user.tenantId);
  }

  @Get('due-this-week')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plans due this week' })
  @ApiResponse({ status: 200, description: 'PM plans due this week' })
  getDueThisWeek(@CurrentUser() user: RequestUser) {
    return this.pmService.getDueThisWeek(user.tenantId);
  }

  @Get('overdue')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get overdue PM plans' })
  @ApiResponse({ status: 200, description: 'Overdue PM plans' })
  getOverdue(@CurrentUser() user: RequestUser) {
    return this.pmService.getOverdue(user.tenantId);
  }

  @Get(':id')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plan by ID' })
  @ApiResponse({ status: 200, description: 'PM plan details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.pmService.findOne(id, user.tenantId);
  }

  @Get(':id/history')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plan history' })
  @ApiResponse({ status: 200, description: 'PM plan trigger history' })
  getHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.pmService.getHistory(id, user.tenantId);
  }

  @Post()
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Create PM plan' })
  @ApiResponse({ status: 201, description: 'PM plan created' })
  create(@Body() dto: CreatePmPlanDto, @CurrentUser() user: RequestUser) {
    return this.pmService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Update PM plan' })
  @ApiResponse({ status: 200, description: 'PM plan updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePmPlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pmService.update(id, dto, user.tenantId);
  }

  @Post(':id/toggle-active')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Toggle PM plan active status' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  toggleActive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.pmService.toggleActive(id, user.tenantId);
  }

  @Post(':id/trigger')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Manually trigger PM plan' })
  @ApiResponse({ status: 200, description: 'PM triggered, WO created' })
  trigger(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pmService.triggerNow(id, user.userId, user.tenantId);
  }

  @Delete(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Delete PM plan' })
  @ApiResponse({ status: 200, description: 'PM plan deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.pmService.delete(id, user.tenantId);
  }
}

// ==================== CHECKLIST TEMPLATES CONTROLLER ====================

@ApiTags('Checklist Templates')
@ApiBearerAuth()
@Controller('checklist-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChecklistTemplatesController {
  constructor(private readonly pmService: PmService) {}

  @Get('library')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get pre-built library templates' })
  @ApiResponse({ status: 200, description: 'List of library templates' })
  getLibrary() {
    return this.pmService.getLibraryTemplates();
  }

  @Post('library/:index/import')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Import a library template to your account' })
  @ApiResponse({ status: 201, description: 'Template imported' })
  importFromLibrary(
    @Param('index') index: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pmService.importLibraryTemplate(parseInt(index, 10), user.tenantId);
  }

  @Get()
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get all checklist templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.pmService.findAllTemplates(user.tenantId);
  }

  @Get(':id')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get checklist template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.pmService.findOneTemplate(id, user.tenantId);
  }

  @Post()
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Create checklist template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  create(@Body() dto: CreateChecklistTemplateDto, @CurrentUser() user: RequestUser) {
    return this.pmService.createTemplate(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Update checklist template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChecklistTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pmService.updateTemplate(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Delete checklist template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.pmService.deleteTemplate(id, user.tenantId);
  }
}
