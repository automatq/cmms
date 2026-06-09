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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WoTemplatesService } from './wo-templates.service';
import { CreateWoTemplateDto, UpdateWoTemplateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

// Distinct base path (not under /work-orders) so the literal routes never
// collide with /work-orders/:id matching.
@ApiTags('Work Order Templates')
@ApiBearerAuth()
@Controller('work-order-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WoTemplatesController {
  constructor(private readonly templatesService: WoTemplatesService) {}

  @Get()
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'List work order templates' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.templatesService.findAll(user.tenantId);
  }

  @Get(':id')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get a work order template' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.templatesService.findOne(id, user.tenantId);
  }

  @Post()
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Create a work order template' })
  create(@Body() dto: CreateWoTemplateDto, @CurrentUser() user: RequestUser) {
    return this.templatesService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Update a work order template' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWoTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.templatesService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Delete a work order template' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.templatesService.delete(id, user.tenantId);
  }
}
