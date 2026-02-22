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
  findAll(@Query() query: PmQueryDto) {
    return this.pmService.findAll(query);
  }

  @Get('due-today')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plans due today' })
  @ApiResponse({ status: 200, description: 'PM plans due today' })
  getDueToday() {
    return this.pmService.getDueToday();
  }

  @Get('due-this-week')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plans due this week' })
  @ApiResponse({ status: 200, description: 'PM plans due this week' })
  getDueThisWeek() {
    return this.pmService.getDueThisWeek();
  }

  @Get('overdue')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get overdue PM plans' })
  @ApiResponse({ status: 200, description: 'Overdue PM plans' })
  getOverdue() {
    return this.pmService.getOverdue();
  }

  @Get(':id')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plan by ID' })
  @ApiResponse({ status: 200, description: 'PM plan details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pmService.findOne(id);
  }

  @Get(':id/history')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get PM plan history' })
  @ApiResponse({ status: 200, description: 'PM plan trigger history' })
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.pmService.getHistory(id);
  }

  @Post()
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Create PM plan' })
  @ApiResponse({ status: 201, description: 'PM plan created' })
  create(@Body() dto: CreatePmPlanDto) {
    return this.pmService.create(dto);
  }

  @Patch(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Update PM plan' })
  @ApiResponse({ status: 200, description: 'PM plan updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePmPlanDto,
  ) {
    return this.pmService.update(id, dto);
  }

  @Post(':id/toggle-active')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Toggle PM plan active status' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.pmService.toggleActive(id);
  }

  @Post(':id/trigger')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Manually trigger PM plan' })
  @ApiResponse({ status: 200, description: 'PM triggered, WO created' })
  trigger(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.pmService.triggerNow(id, user.sub);
  }

  @Delete(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Delete PM plan' })
  @ApiResponse({ status: 200, description: 'PM plan deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.pmService.delete(id);
  }
}

// ==================== CHECKLIST TEMPLATES CONTROLLER ====================

@ApiTags('Checklist Templates')
@ApiBearerAuth()
@Controller('checklist-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChecklistTemplatesController {
  constructor(private readonly pmService: PmService) {}

  @Get()
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get all checklist templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  findAll() {
    return this.pmService.findAllTemplates();
  }

  @Get(':id')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get checklist template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pmService.findOneTemplate(id);
  }

  @Post()
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Create checklist template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  create(@Body() dto: CreateChecklistTemplateDto) {
    return this.pmService.createTemplate(dto);
  }

  @Patch(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Update checklist template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChecklistTemplateDto,
  ) {
    return this.pmService.updateTemplate(id, dto);
  }

  @Delete(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Delete checklist template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.pmService.deleteTemplate(id);
  }
}
