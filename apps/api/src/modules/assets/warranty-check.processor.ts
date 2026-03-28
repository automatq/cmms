import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ServiceContract, ContractStatus } from '../inventory/entities/service-contract.entity';

@Injectable()
@Processor('warranty-checker')
export class WarrantyCheckProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(WarrantyCheckProcessor.name);

  constructor(
    @InjectQueue('warranty-checker')
    private readonly warrantyQueue: Queue,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(ServiceContract)
    private readonly contractRepository: Repository<ServiceContract>,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async onModuleInit() {
    const existingJobs = await this.warrantyQueue.getRepeatableJobs();

    if (!existingJobs.some((job) => job.name === 'check-warranty-expiry')) {
      await this.warrantyQueue.add('check-warranty-expiry', {}, {
        repeat: { pattern: '0 6 * * *' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      this.logger.log('Warranty check job registered (daily at 6 AM)');
    }

    if (!existingJobs.some((job) => job.name === 'check-contract-expiry')) {
      await this.warrantyQueue.add('check-contract-expiry', {}, {
        repeat: { pattern: '0 6 * * *' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      this.logger.log('Contract expiry check job registered (daily at 6 AM)');
    }
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name}`);

    if (job.name === 'check-warranty-expiry') {
      await this.checkWarrantyExpiry();
    }

    if (job.name === 'check-contract-expiry') {
      await this.checkContractExpiry();
    }
  }

  private async checkWarrantyExpiry(): Promise<void> {
    const alertWindows = [30, 60, 90];
    const now = new Date();
    let totalAlerts = 0;

    for (const days of alertWindows) {
      const alertDate = new Date(now);
      alertDate.setDate(alertDate.getDate() + days);

      const startOfDay = new Date(alertDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(alertDate);
      endOfDay.setHours(23, 59, 59, 999);

      const assets = await this.assetRepository
        .createQueryBuilder('asset')
        .where('asset.warrantyExpiry >= :start', { start: startOfDay })
        .andWhere('asset.warrantyExpiry <= :end', { end: endOfDay })
        .andWhere('asset.status != :retired', { retired: 'retired' })
        .getMany();

      for (const asset of assets) {
        try {
          await this.notificationsService.broadcastToTenant(
            'warranty_expiring',
            `Warranty Expiring: ${asset.name}`,
            `Asset ${asset.name} (${asset.assetNumber}) warranty expires in ${days} days on ${asset.warrantyExpiry}.`,
            { assetId: asset.id, daysUntilExpiry: days },
            asset.tenantId,
          );
          totalAlerts++;
        } catch (error) {
          this.logger.error(`Failed to create warranty alert for asset ${asset.id}: ${(error as Error).message}`);
        }
      }
    }

    this.logger.log(`Warranty check complete: ${totalAlerts} alerts created`);
  }

  private async checkContractExpiry(): Promise<void> {
    const alertWindows = [30, 60, 90];
    const now = new Date();
    let totalAlerts = 0;

    for (const days of alertWindows) {
      const alertDate = new Date(now);
      alertDate.setDate(alertDate.getDate() + days);

      const startOfDay = new Date(alertDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(alertDate);
      endOfDay.setHours(23, 59, 59, 999);

      const contracts = await this.contractRepository
        .createQueryBuilder('contract')
        .leftJoinAndSelect('contract.supplier', 'supplier')
        .where('contract.end_date >= :start', { start: startOfDay })
        .andWhere('contract.end_date <= :end', { end: endOfDay })
        .andWhere('contract.status != :cancelled', { cancelled: ContractStatus.CANCELLED })
        .getMany();

      for (const contract of contracts) {
        try {
          await this.notificationsService.broadcastToTenant(
            'contract_expiring',
            `Contract Expiring: ${contract.name}`,
            `Service contract "${contract.name}"${contract.supplier ? ` with ${contract.supplier.name}` : ''} expires in ${days} days on ${contract.endDate}.`,
            { contractId: contract.id, daysUntilExpiry: days },
            contract.tenantId,
          );
          totalAlerts++;
        } catch (error) {
          this.logger.error(`Failed to create contract expiry alert for ${contract.id}: ${(error as Error).message}`);
        }
      }
    }

    this.logger.log(`Contract expiry check complete: ${totalAlerts} alerts created`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }
}
