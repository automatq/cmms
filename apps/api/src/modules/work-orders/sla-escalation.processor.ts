import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';

/**
 * Scans open work orders every 15 minutes and fires SLA due-soon / overdue
 * escalation notifications. Mirrors the PM scheduler's repeatable-job pattern.
 */
@Injectable()
@Processor('sla-escalation')
export class SlaEscalationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SlaEscalationProcessor.name);

  constructor(
    private readonly workOrdersService: WorkOrdersService,
    @InjectQueue('sla-escalation')
    private readonly slaQueue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    const existingJobs = await this.slaQueue.getRepeatableJobs();
    const hasJob = existingJobs.some((job) => job.name === 'check-sla');

    if (!hasJob) {
      await this.slaQueue.add(
        'check-sla',
        {},
        {
          repeat: {
            every: 900000, // Every 15 minutes
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
      this.logger.log('SLA escalation job registered');
    }
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'check-sla') {
      const result = await this.workOrdersService.processSlaEscalations();
      this.logger.log(
        `SLA sweep: ${result.dueSoon} due-soon, ${result.overdue} overdue, ${result.escalated} escalated`,
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`SLA job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`SLA job ${job.id} failed: ${error.message}`, error.stack);
  }
}
