import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PmService } from './pm.service';
import { IngestSensorReadingDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

// Sensor ingestion + condition-based maintenance. Gated behind the tenant's
// `sensors` module flag; breaching a CONDITION PM plan's threshold auto-creates
// a work order (see PmService.ingestSensorReading).
@ApiTags('Sensors')
@ApiBearerAuth()
@RequireFeature('sensors')
@Controller('sensors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SensorsController {
  constructor(private readonly pmService: PmService) {}

  @Post('readings')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Ingest a sensor reading and evaluate condition rules' })
  ingest(@Body() dto: IngestSensorReadingDto, @CurrentUser() user: RequestUser) {
    return this.pmService.ingestSensorReading(dto, user.tenantId);
  }

  @Get('readings')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'List recent sensor readings for an asset' })
  list(
    @Query('assetId', ParseUUIDPipe) assetId: string,
    @CurrentUser() user: RequestUser,
    @Query('metric') metric?: string,
  ) {
    return this.pmService.getSensorReadings(assetId, user.tenantId, metric);
  }
}
