import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
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

  /**
   * Generate a real PDF (application/pdf, parseable by Acrobat/Preview)
   * using pdfkit. Previously this returned an HTML string and the client
   * had to print-to-PDF — see git history for the old implementation.
   *
   * Layout:
   *   - Title header (report type + date range)
   *   - Small "Generated at" line
   *   - Table: column header row + body rows, auto-paginated
   */
  async exportToPdf(reportType: string, filters: Record<string, any>, tenantId: string): Promise<Buffer> {
    const data = await this.getReportData(reportType, filters, tenantId);
    return this.renderPdf(reportType, data, filters);
  }

  private renderPdf(reportType: string, data: Record<string, any>[], filters: Record<string, any>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).text(`${this.formatHeader(reportType)} Report`, { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666');
      if (filters.startDate && filters.endDate) {
        doc.text(`Period: ${filters.startDate} → ${filters.endDate}`);
      }
      doc.text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown(1);
      doc.fillColor('black');

      if (!data.length) {
        doc.fontSize(11).text('No data for the selected filters.', { align: 'center' });
        doc.end();
        return;
      }

      // Table — auto-size columns evenly across the page width
      const headers = Object.keys(data[0]);
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = pageWidth / headers.length;
      const rowHeight = 18;

      const drawHeaderRow = () => {
        const y = doc.y;
        doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#f4f4f5');
        doc.fillColor('#111').fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => {
          doc.text(this.formatHeader(h), doc.page.margins.left + i * colWidth + 4, y + 5, {
            width: colWidth - 8,
            ellipsis: true,
          });
        });
        doc.font('Helvetica').fillColor('black');
        doc.y = y + rowHeight;
      };

      const drawBodyRow = (row: Record<string, any>, zebra: boolean) => {
        const y = doc.y;
        if (zebra) {
          doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#fafafa');
        }
        doc.fillColor('black').fontSize(9);
        headers.forEach((h, i) => {
          const v = row[h];
          const text = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
          doc.text(text, doc.page.margins.left + i * colWidth + 4, y + 5, {
            width: colWidth - 8,
            ellipsis: true,
          });
        });
        doc.y = y + rowHeight;
      };

      drawHeaderRow();
      data.forEach((row, idx) => {
        // Page break if next row wouldn't fit before the bottom margin.
        if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          drawHeaderRow();
        }
        drawBodyRow(row, idx % 2 === 1);
      });

      doc.end();
    });
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
      case 'technician-performance': {
        const report = await this.reportsService.getTechnicianPerformanceReport(query as any, tenantId);
        return report.technicians.map((t) => ({
          name: t.name,
          workOrderCount: t.workOrderCount,
          totalDirectHours: t.totalDirectHours,
          totalTravelHours: t.totalTravelHours,
          totalWaitHours: t.totalWaitHours,
          totalLaborCost: t.totalLaborCost,
          wrenchTimePercent: `${t.wrenchTimePercent}%`,
        }));
      }
      case 'warranties': {
        const withinDays = Number(filters.withinDays) || 90;
        const report = await this.reportsService.getWarrantyReport(withinDays, tenantId);
        return [
          ...report.expired.map((a) => ({
            status: 'Expired',
            assetName: a.name,
            assetNumber: a.assetNumber,
            warrantyExpiry: a.warrantyExpiry,
          })),
          ...report.expiringSoon.map((a) => ({
            status: 'Expiring Soon',
            assetName: a.name,
            assetNumber: a.assetNumber,
            warrantyExpiry: a.warrantyExpiry,
          })),
          ...report.active.map((a) => ({
            status: 'Active',
            assetName: a.name,
            assetNumber: a.assetNumber,
            warrantyExpiry: a.warrantyExpiry,
          })),
        ];
      }
      case 'backlog-aging': {
        const report = await this.reportsService.getBacklogAgingReport(tenantId);
        return report.buckets.map((b) => ({
          bucket: b.label,
          count: b.value,
        }));
      }
      case 'oee': {
        const report = await this.reportsService.getOeeReport(query as any, tenantId);
        return report.assets.map((a) => ({
          assetName: a.assetName,
          assetNumber: a.assetNumber,
          totalDowntimeHours: a.totalDowntimeHours,
          downtimeEvents: a.downtimeEvents,
          availability: a.availability,
          performance: a.performance,
          quality: a.quality,
          oee: a.oee,
        }));
      }
      default:
        throw new BadRequestException(`Unknown report type: ${reportType}`);
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
