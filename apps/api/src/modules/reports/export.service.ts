import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { ScheduledReport, ScheduledReportType, ReportFormat } from './entities/scheduled-report.entity';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private readonly scheduledReportRepo: Repository<ScheduledReport>,
    private readonly reportsService: ReportsService,
  ) {}

  // ==================== CSV EXPORT ====================

  async exportToCsv(reportType: string, filters: Record<string, any>, tenantId: string): Promise<string> {
    const data = await this.getReportData(reportType, filters, tenantId);
    return this.convertToCsv(data);
  }

  private convertToCsv(data: Record<string, any>[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const lines = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            // Escape CSV fields that contain commas, quotes, or newlines
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(','),
      ),
    ];

    return lines.join('\n');
  }

  // ==================== PDF EXPORT ====================

  async exportToPdf(reportType: string, filters: Record<string, any>, tenantId: string): Promise<string> {
    const data = await this.getReportData(reportType, filters, tenantId);
    // Generate a simple HTML table and return it — actual PDF rendering
    // would use puppeteer-core in production; for now return HTML that
    // the client can print/save as PDF
    return this.convertToHtmlTable(reportType, data);
  }

  private convertToHtmlTable(title: string, data: Record<string, any>[]): string {
    if (!data.length) return '<html><body><p>No data</p></body></html>';

    const headers = Object.keys(data[0]);
    const headerRow = headers.map((h) => `<th style="border:1px solid #ccc;padding:8px;background:#f5f5f5">${this.formatHeader(h)}</th>`).join('');
    const bodyRows = data
      .map(
        (row) =>
          '<tr>' +
          headers
            .map((h) => `<td style="border:1px solid #ccc;padding:8px">${row[h] ?? ''}</td>`)
            .join('') +
          '</tr>',
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title} Report</title>
<style>body{font-family:sans-serif;margin:20px}table{border-collapse:collapse;width:100%}h1{font-size:18px}</style>
</head>
<body>
<h1>${this.formatHeader(title)} Report</h1>
<p>Generated: ${new Date().toISOString()}</p>
<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;
  }

  private formatHeader(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
  }

  // ==================== DATA FETCHING ====================

  private async getReportData(reportType: string, filters: Record<string, any>, tenantId: string): Promise<Record<string, any>[]> {
    const query = {
      startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: filters.endDate || new Date().toISOString(),
      ...filters,
    };

    switch (reportType) {
      case ScheduledReportType.WORK_ORDERS:
      case 'work-orders': {
        const report = await this.reportsService.getWorkOrderReport(query as any, tenantId);
        return report.details?.length ? report.details : [
          ...report.byType.map((d) => ({ metric: 'By Type', category: d.label, count: d.value })),
          ...report.byPriority.map((d) => ({ metric: 'By Priority', category: d.label, count: d.value })),
        ];
      }
      case ScheduledReportType.ASSETS:
      case 'assets': {
        const report = await this.reportsService.getAssetReport(query as any, tenantId);
        return [
          ...report.byStatus.map((d) => ({ metric: 'By Status', category: d.label, count: d.value })),
          ...report.byCategory.map((d) => ({ metric: 'By Category', category: d.label, count: d.value })),
          ...report.topFailures.map((f) => ({
            metric: 'Top Failures',
            assetName: f.assetName,
            assetNumber: f.assetNumber,
            failureCount: f.failureCount,
          })),
        ];
      }
      case ScheduledReportType.PM_COMPLIANCE:
      case 'pm-compliance': {
        const report = await this.reportsService.getPmComplianceReport(query as any, tenantId);
        return report.byPlan.map((p) => ({
          planName: p.planName,
          total: p.total,
          onTime: p.onTime,
          compliance: `${p.compliance}%`,
        }));
      }
      case ScheduledReportType.INVENTORY:
      case 'inventory': {
        const report = await this.reportsService.getInventoryReport(query as any, tenantId);
        return report.lowStockItems.map((item) => ({
          partName: item.partName,
          sku: item.sku,
          qtyOnHand: item.qtyOnHand,
          reorderPoint: item.reorderPoint,
          deficit: item.deficit,
        }));
      }
      case ScheduledReportType.COSTS:
      case 'costs': {
        const report = await this.reportsService.getCostReport(query as any, tenantId);
        return report.costByAsset.map((a) => ({
          assetName: a.assetName,
          totalCost: a.totalCost,
        }));
      }
      default:
        return [];
    }
  }

  // ==================== SCHEDULED REPORTS CRUD ====================

  async createScheduledReport(dto: Partial<ScheduledReport>, userId: string, tenantId: string): Promise<ScheduledReport> {
    const report = this.scheduledReportRepo.create({
      ...dto,
      createdBy: userId,
      tenantId,
    });
    return this.scheduledReportRepo.save(report);
  }

  async findAllScheduledReports(tenantId: string): Promise<ScheduledReport[]> {
    return this.scheduledReportRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneScheduledReport(id: string, tenantId: string): Promise<ScheduledReport> {
    const report = await this.scheduledReportRepo.findOne({ where: { id, tenantId } });
    if (!report) throw new NotFoundException(`Scheduled report ${id} not found`);
    return report;
  }

  async updateScheduledReport(id: string, dto: Partial<ScheduledReport>, tenantId: string): Promise<ScheduledReport> {
    const report = await this.findOneScheduledReport(id, tenantId);
    Object.assign(report, dto);
    return this.scheduledReportRepo.save(report);
  }

  async deleteScheduledReport(id: string, tenantId: string): Promise<void> {
    const report = await this.findOneScheduledReport(id, tenantId);
    await this.scheduledReportRepo.remove(report);
  }

  async getActiveScheduledReports(): Promise<ScheduledReport[]> {
    return this.scheduledReportRepo.find({ where: { isActive: true } });
  }

  async markAsRun(id: string): Promise<void> {
    await this.scheduledReportRepo.update(id, { lastRunAt: new Date() });
  }
}
