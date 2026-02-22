import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PmService } from './pm.service';

@Injectable()
@Processor('pm-scheduler')
export class PmSchedulerProcessor extends WorkerHost implements OnModuleInit {
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
        },
      );
      console.log('PM scheduler job registered');
    }
  }

  async process(job: Job): Promise<void> {
    console.log(`Processing PM scheduler job: ${job.name}`);

    if (job.name === 'check-due-pms') {
      const result = await this.pmService.processScheduledPMs();
      console.log(`PM scheduler result: ${result.triggered} triggered, ${result.skipped} skipped`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`PM job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`PM job ${job.id} failed:`, error);
  }
}
