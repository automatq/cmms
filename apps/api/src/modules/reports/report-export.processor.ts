import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ExportService } from './export.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
@Processor('report-export')
export class ReportExportProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ReportExportProcessor.name);

  constructor(
    @InjectQueue('report-export')
    private readonly exportQueue: Queue,
    private readonly exportService: ExportService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async onModuleInit() {
    const existingJobs = await this.exportQueue.getRepeatableJobs();

    if (!existingJobs.some((job) => job.name === 'check-scheduled-reports')) {
      await this.exportQueue.add('check-scheduled-reports', {}, {
        repeat: { every: 60000 }, // Every minute
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      this.logger.log('Scheduled report checker registered (every minute)');
    }
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'check-scheduled-reports') {
      await this.checkScheduledReports();
    }

    if (job.name === 'run-scheduled-report') {
      await this.runScheduledReport(job.data);
    }
  }

  private async checkScheduledReports(): Promise<void> {
    const reports = await this.exportService.getActiveScheduledReports();
    const now = new Date();

    for (const report of reports) {
      if (this.shouldRunNow(report.schedule, report.lastRunAt, now)) {
        await this.exportQueue.add('run-scheduled-report', {
          reportId: report.id,
          reportType: report.reportType,
          filters: report.filters,
          format: report.format,
          recipientEmails: report.recipientEmails,
          tenantId: report.tenantId,
        });
      }
    }
  }

  private shouldRunNow(cron: string, lastRunAt: Date | null, now: Date): boolean {
    // Simple cron matching — checks if the current minute matches the cron pattern
    // Format: minute hour dayOfMonth month dayOfWeek
    const parts = cron.split(' ');
    if (parts.length < 5) return false;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const matches = (field: string, value: number): boolean => {
      if (field === '*') return true;
      if (field.includes('/')) {
        const [, step] = field.split('/');
        return value % parseInt(step, 10) === 0;
      }
      if (field.includes(',')) {
        return field.split(',').map(Number).includes(value);
      }
      return parseInt(field, 10) === value;
    };

    const cronMatches =
      matches(minute, now.getMinutes()) &&
      matches(hour, now.getHours()) &&
      matches(dayOfMonth, now.getDate()) &&
      matches(month, now.getMonth() + 1) &&
      matches(dayOfWeek, now.getDay());

    if (!cronMatches) return false;

    // Avoid double-runs within the same minute
    if (lastRunAt) {
      const lastRunMinute = Math.floor(lastRunAt.getTime() / 60000);
      const nowMinute = Math.floor(now.getTime() / 60000);
      if (lastRunMinute === nowMinute) return false;
    }

    return true;
  }

  private async runScheduledReport(data: {
    reportId: string;
    reportType: string;
    filters: Record<string, any>;
    format: string;
    recipientEmails: string[];
    tenantId: string;
  }): Promise<void> {
    try {
      const { reportId, reportType, filters, format, recipientEmails, tenantId } = data;

      let content: string;
      if (format === 'csv') {
        content = await this.exportService.exportToCsv(reportType, filters || {}, tenantId);
      } else {
        content = await this.exportService.exportToPdf(reportType, filters || {}, tenantId);
      }

      // In production, this would email the report to recipientEmails
      // For now, log success and mark as run
      this.logger.log(
        `Scheduled report ${reportId} generated (${format}, ${content.length} chars) for ${recipientEmails.join(', ')}`,
      );

      await this.exportService.markAsRun(reportId);
    } catch (error) {
      this.logger.error(`Failed to run scheduled report ${data.reportId}: ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Report export job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Report export job ${job.id} failed: ${error.message}`, error.stack);
  }
}
