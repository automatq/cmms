import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  ReportQueryDto,
  WorkOrderReportQueryDto,
  AssetReportQueryDto,
  InventoryReportQueryDto,
  DashboardQueryDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

@RequireFeature('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Permissions('reports:read')
  getDashboard(@Query() query: DashboardQueryDto, @CurrentUser() user: RequestUser) {
    return this.reportsService.getDashboardSummary(query, user.tenantId);
  }

  @Get('work-orders')
  @Permissions('reports:read')
  getWorkOrderReport(@Query() query: WorkOrderReportQueryDto, @CurrentUser() user: RequestUser) {
    return this.reportsService.getWorkOrderReport(query, user.tenantId);
  }

  @Get('assets')
  @Permissions('reports:read')
  getAssetReport(@Query() query: AssetReportQueryDto, @CurrentUser() user: RequestUser) {
    return this.reportsService.getAssetReport(query, user.tenantId);
  }

  @Get('pm-compliance')
  @Permissions('reports:read')
  getPmComplianceReport(@Query() query: ReportQueryDto, @CurrentUser() user: RequestUser) {
    return this.reportsService.getPmComplianceReport(query, user.tenantId);
  }

  @Get('inventory')
  @Permissions('reports:read')
  getInventoryReport(@Query() query: InventoryReportQueryDto, @CurrentUser() user: RequestUser) {
    return this.reportsService.getInventoryReport(query, user.tenantId);
  }

  @Get('costs')
  @Permissions('reports:read')
  getCostReport(@Query() query: ReportQueryDto, @CurrentUser() user: RequestUser) {
    return this.reportsService.getCostReport(query, user.tenantId);
  }

  @Get('technician-performance')
  @Permissions('reports:read')
  getTechnicianPerformance(@Query() query: WorkOrderReportQueryDto, @CurrentUser() user: RequestUser) {
    return this.reportsService.getTechnicianPerformanceReport(query, user.tenantId);
  }
}
