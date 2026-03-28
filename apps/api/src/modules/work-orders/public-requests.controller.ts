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
import { Public } from '../auth/decorators/public.decorator';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('Public Requests')
@Controller('public')
export class PublicRequestsController {
  constructor(
    @InjectRepository(WorkRequest)
    private readonly workRequestRepository: Repository<WorkRequest>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Public()
  @Post(':tenantSlug/requests')
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Submit a public maintenance request' })
  @ApiResponse({ status: 201, description: 'Request submitted' })
  async submitRequest(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: {
      title: string;
      description?: string;
      priority?: string;
      submitterName?: string;
      submitterEmail?: string;
      submitterPhone?: string;
      locationId?: string;
    },
  ) {
    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }

    const trackingToken = uuidv4();

    const request = this.workRequestRepository.create({
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      submitterName: body.submitterName,
      submitterEmail: body.submitterEmail,
      submitterPhone: body.submitterPhone,
      locationId: body.locationId,
      trackingToken,
      tenantId: tenant.id,
    });

    const saved = await this.workRequestRepository.save(request);

    // Notify tenant admins
    try {
      await this.notificationsService.broadcastToTenant(
        'work_request',
        `New Request: ${body.title}`,
        `A new maintenance request has been submitted${body.submitterName ? ` by ${body.submitterName}` : ''}.`,
        { requestId: saved.id },
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
}
