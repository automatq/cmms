import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { Permissions } from '../../modules/auth/decorators/permissions.decorator';
import { PlanTier, TenantStatus } from '../../modules/users/entities/tenant.entity';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('signup')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign up a new tenant (public)' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  async signup(@Body() dto: CreateTenantDto) {
    const { tenant, auth0OrgId } = await this.tenantService.provisionTenant(dto);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      auth0OrgId,
    };
  }

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
