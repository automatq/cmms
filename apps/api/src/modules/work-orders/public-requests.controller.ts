import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WorkRequest, WorkRequestStatus } from './entities/work-request.entity';
import { Tenant } from '../users/entities/tenant.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Public } from '../auth/decorators/public.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePublicWorkRequestDto } from './dto/create-public-work-request.dto';
import { Location } from '../assets/entities/location.entity';
import { assertTenantRefs } from '../../common/tenant/assert-tenant-refs';
import { isPublicPortalOpen } from './public-portal';

@ApiTags('Public Requests')
@Controller('public')
export class PublicRequestsController {
  constructor(
    @InjectRepository(WorkRequest)
    private readonly workRequestRepository: Repository<WorkRequest>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Public()
  @Get(':tenantSlug/assets')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'List assets for public submission form' })
  @ApiResponse({ status: 200, description: 'Minimal asset list' })
  async listAssets(@Param('tenantSlug') tenantSlug: string) {
    const tenant = await this.findPortalTenant(tenantSlug);

    // Minimal fields only: the asset tag token is a capability used by the
    // authenticated scan flow and must never be exposed anonymously.
    const assets = await this.assetRepository.find({
      where: { tenantId: tenant.id },
      select: ['id', 'assetNumber', 'name', 'locationId'],
      order: { assetNumber: 'ASC' },
    });

    return assets.map((a) => ({
      id: a.id,
      assetNumber: a.assetNumber,
      name: a.name,
      locationId: a.locationId ?? null,
    }));
  }

  @Public()
  @Get(':tenantSlug/assets/by-tag/:token')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Resolve a scanned asset QR tag for the public submission form' })
  @ApiResponse({ status: 200, description: 'Minimal asset info' })
  async findAssetByTag(
    @Param('tenantSlug') tenantSlug: string,
    @Param('token') token: string,
  ) {
    const tenant = await this.findPortalTenant(tenantSlug);
    if (!token || !/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
      throw new NotFoundException('Asset not found');
    }

    const asset = await this.assetRepository.findOne({
      where: { tenantId: tenant.id, assetTagToken: token },
      select: ['id', 'assetNumber', 'name', 'locationId'],
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      locationId: asset.locationId ?? null,
    };
  }

  @Public()
  @Post(':tenantSlug/requests')
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Submit a public maintenance request' })
  @ApiResponse({ status: 201, description: 'Request submitted' })
  async submitRequest(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: CreatePublicWorkRequestDto,
  ) {
    const tenant = await this.findPortalTenant(tenantSlug);

    await assertTenantRefs(this.workRequestRepository.manager, tenant.id, [
      { entity: Asset, id: body.assetId, field: 'assetId' },
      { entity: Location, id: body.locationId, field: 'locationId' },
    ]);

    const trackingToken = uuidv4();

    const request = this.workRequestRepository.create({
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      submitterName: body.submitterName,
      submitterEmail: body.submitterEmail,
      submitterPhone: body.submitterPhone,
      assetId: body.assetId,
      locationId: body.locationId,
      trackingToken,
      tenantId: tenant.id,
    });

    const saved = await this.workRequestRepository.save(request);

    // Notify the techs/managers who can action it (in-app + email), same path
    // the authenticated submission uses — so QR-portal requests aren't a
    // second-class, in-app-only notification.
    try {
      await this.notificationsService.onWorkRequestSubmitted(
        {
          id: saved.id,
          title: saved.title,
          description: saved.description,
          submittedBy: saved.submitterName,
        },
        tenant.id,
      );
    } catch {
      // Don't block request submission if notification fails
    }

    return {
      trackingToken,
      message: 'Request submitted successfully',
    };
  }

  @Public()
  @Get(':tenantSlug/requests/:trackingToken/status')
  @ApiOperation({ summary: 'Check request status by tracking token' })
  @ApiResponse({ status: 200, description: 'Request status' })
  async checkStatus(
    @Param('tenantSlug') tenantSlug: string,
    @Param('trackingToken') trackingToken: string,
  ) {
    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }

    const request = await this.workRequestRepository.findOne({
      where: { trackingToken, tenantId: tenant.id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return {
      status: request.status,
      title: request.title,
      createdAt: request.createdAt,
      rejectionReason: request.status === WorkRequestStatus.REJECTED ? request.rejectionReason : undefined,
    };
  }

  private async findPortalTenant(tenantSlug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug },
    });
    if (!isPublicPortalOpen(tenant)) {
      throw new NotFoundException('Organization not found');
    }
    return tenant;
  }
}
