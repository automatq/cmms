import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@ApiTags('Activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('quick-start/:assetId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Quick-start work on an asset (QR scan flow)' })
  quickStart(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.activityService.quickStart(
      assetId,
      user.userId,
      user.tenantId,
    );
  }

  @Patch(':id/complete')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Complete an active work session' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.activityService.completeActivity(
      id,
      user.userId,
      user.tenantId,
      body.notes,
    );
  }

  @Get('active')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get all active technician sessions' })
  getActive(@CurrentUser() user: RequestUser) {
    return this.activityService.getActiveActivities(user.tenantId);
  }

  @Get('my-active')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get my current active session' })
  getMyActive(@CurrentUser() user: RequestUser) {
    return this.activityService.getMyActiveActivity(
      user.userId,
      user.tenantId,
    );
  }
}
