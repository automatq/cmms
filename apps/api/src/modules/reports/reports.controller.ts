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

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Permissions('reports:read')
  getDashboard(@Query() query: DashboardQueryDto) {
    return this.reportsService.getDashboardSummary(query);
  }

  @Get('work-orders')
  @Permissions('reports:read')
  getWorkOrderReport(@Query() query: WorkOrderReportQueryDto) {
    return this.reportsService.getWorkOrderReport(query);
  }

  @Get('assets')
  @Permissions('reports:read')
  getAssetReport(@Query() query: AssetReportQueryDto) {
    return this.reportsService.getAssetReport(query);
  }

  @Get('pm-compliance')
  @Permissions('reports:read')
  getPmComplianceReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getPmComplianceReport(query);
  }

  @Get('inventory')
  @Permissions('reports:read')
  getInventoryReport(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.getInventoryReport(query);
  }

  @Get('costs')
  @Permissions('reports:read')
  getCostReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getCostReport(query);
  }

  @Get('technician-performance')
  @Permissions('reports:read')
  getTechnicianPerformance(@Query() query: WorkOrderReportQueryDto) {
    return this.reportsService.getTechnicianPerformanceReport(query);
  }
}
