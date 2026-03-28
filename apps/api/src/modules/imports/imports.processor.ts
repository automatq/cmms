import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ImportsService } from './imports.service';

@Injectable()
@Processor('data-imports')
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private readonly importsService: ImportsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { jobId, type, storageKey, columnMapping, tenantId } = job.data;
    this.logger.log(`Processing import job ${jobId} (type: ${type})`);
    await this.importsService.processImport(jobId, type, storageKey, columnMapping, tenantId);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Import job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Import job ${job.id} failed: ${error.message}`, error.stack);
  }
}
