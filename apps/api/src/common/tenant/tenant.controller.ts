import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { Permissions } from '../../modules/auth/decorators/permissions.decorator';
import { PlanTier, TenantStatus } from '../../modules/users/entities/tenant.entity';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('check-slug')
  @Public()
  @ApiOperation({ summary: 'Check if a slug is available' })
  @ApiResponse({ status: 200, description: 'Slug availability' })
  async checkSlug(@Query('slug') slug: string) {
    const existing = await this.tenantService.findBySlug(slug);
    return { available: !existing };
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get()
  @Permissions('admin:tenants')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all tenants (super-admin)' })
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @Permissions('admin:tenants')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant by ID (super-admin)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findById(id);
  }

  @Patch(':id/plan')
  @Permissions('admin:tenants')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant plan (super-admin)' })
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('plan') plan: PlanTier,
  ) {
    return this.tenantService.updatePlan(id, plan);
  }

  @Patch(':id/status')
  @Permissions('admin:tenants')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant status (super-admin)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TenantStatus,
  ) {
    return this.tenantService.updateStatus(id, status);
  }
}
