import { Controller, Get, Post, Body, Param, Delete, Patch, Query, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { DowntimeService } from '../assets/downtime.service';
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
import { ScheduledReport } from './entities/scheduled-report.entity';

@RequireFeature('reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ExportService,
    private readonly downtimeService: DowntimeService,
  ) {}

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

  @Get('downtime')
  @Permissions('reports:read')
  getDowntimeReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.downtimeService.getDowntimeReport(
      user.tenantId,
      new Date(from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      new Date(to || new Date().toISOString()),
    );
  }

  @Get('warranties')
  @Permissions('reports:read')
  getWarrantyReport(
    @Query('days') days: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getWarrantyReport(parseInt(days || '90'), user.tenantId);
  }

  // ==================== EXPORT ====================

  @Post(':type/export')
  @Permissions('reports:read')
  async exportReport(
    @Param('type') type: string,
    @Query('format') format: string,
    @Body() filters: Record<string, any>,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    if (format === 'pdf') {
      const html = await this.exportService.exportToPdf(type, filters || {}, user.tenantId);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.html"`);
      return res.send(html);
    }

    const csv = await this.exportService.exportToCsv(type, filters || {}, user.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
    return res.send(csv);
  }

  // ==================== SCHEDULED REPORTS ====================

  @Get('scheduled')
  @Permissions('reports:manage')
  getScheduledReports(@CurrentUser() user: RequestUser) {
    return this.exportService.findAllScheduledReports(user.tenantId);
  }

  @Post('scheduled')
  @Permissions('reports:manage')
  createScheduledReport(@Body() dto: Partial<ScheduledReport>, @CurrentUser() user: RequestUser) {
    return this.exportService.createScheduledReport(dto, user.userId, user.tenantId);
  }

  @Patch('scheduled/:id')
  @Permissions('reports:manage')
  updateScheduledReport(@Param('id') id: string, @Body() dto: Partial<ScheduledReport>, @CurrentUser() user: RequestUser) {
    return this.exportService.updateScheduledReport(id, dto, user.tenantId);
  }

  @Delete('scheduled/:id')
  @Permissions('reports:manage')
  deleteScheduledReport(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.exportService.deleteScheduledReport(id, user.tenantId);
  }
}
