import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PmService } from './pm.service';

@Injectable()
@Processor('pm-scheduler')
export class PmSchedulerProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PmSchedulerProcessor.name);

  constructor(
    private readonly pmService: PmService,
    @InjectQueue('pm-scheduler')
    private readonly pmQueue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    // Register repeatable job if not exists
    const existingJobs = await this.pmQueue.getRepeatableJobs();
    const hasJob = existingJobs.some((job) => job.name === 'check-due-pms');

    if (!hasJob) {
      await this.pmQueue.add(
        'check-due-pms',
        {},
        {
          repeat: {
            every: 3600000, // Every hour
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
      this.logger.log('PM scheduler job registered');
    }
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing PM scheduler job: ${job.name}`);

    if (job.name === 'check-due-pms') {
      const result = await this.pmService.processScheduledPMs();
      this.logger.log(`PM scheduler result: ${result.triggered} triggered, ${result.skipped} skipped`);

      const meterResult = await this.pmService.processMeterPms();
      this.logger.log(
        `Meter PM result: ${meterResult.triggered} triggered, ${meterResult.initialized} baselines initialized, ${meterResult.skipped} skipped`,
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`PM job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`PM job ${job.id} failed: ${error.message}`, error.stack);
  }
}
