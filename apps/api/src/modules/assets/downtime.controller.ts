import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import { DowntimeService } from './downtime.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { StartDowntimeDto } from './dto/start-downtime.dto';

@ApiTags('Downtime')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DowntimeController {
  constructor(private readonly downtimeService: DowntimeService) {}

  @Post(':id/downtime')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Start downtime tracking for an asset' })
  @ApiResponse({ status: 201, description: 'Downtime started' })
  startDowntime(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: StartDowntimeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.downtimeService.startDowntime(
      id,
      body.reason || null,
      body.workOrderId || null,
      user.userId,
      user.tenantId,
    );
  }

  @Patch(':id/downtime/end')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'End downtime tracking for an asset' })
  @ApiResponse({ status: 200, description: 'Downtime ended' })
  endDowntime(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.downtimeService.endDowntime(id, user.userId, user.tenantId);
  }

  @Get(':id/downtime')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get downtime history for an asset' })
  @ApiResponse({ status: 200, description: 'Downtime history' })
  getDowntimeHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.downtimeService.getDowntimeHistory(
      id,
      user.tenantId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id/downtime/active')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get active downtime for an asset' })
  @ApiResponse({ status: 200, description: 'Active downtime or null' })
  getActiveDowntime(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.downtimeService.getActiveDowntime(id, user.tenantId);
  }

  @Get(':id/downtime/mtbf')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Calculate MTBF for an asset' })
  @ApiResponse({ status: 200, description: 'MTBF in hours' })
  getMtbf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.downtimeService.calculateMTBF(
      id,
      user.tenantId,
      new Date(from),
      new Date(to),
    );
  }

  @Get(':id/downtime/mttr')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Calculate MTTR for an asset' })
  @ApiResponse({ status: 200, description: 'MTTR in hours' })
  getMttr(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.downtimeService.calculateMTTR(
      id,
      user.tenantId,
      new Date(from),
      new Date(to),
    );
  }
}
