import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetService } from './budget.service';
import { MaintenanceBudget } from './entities/maintenance-budget.entity';
import { Tenant } from '../users/entities/tenant.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
@Processor('budget-checker')
export class BudgetCheckProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(BudgetCheckProcessor.name);

  constructor(
    @InjectQueue('budget-checker')
    private readonly budgetQueue: Queue,
    private readonly budgetService: BudgetService,
    @InjectRepository(MaintenanceBudget)
    private readonly budgetRepository: Repository<MaintenanceBudget>,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async onModuleInit() {
    const existingJobs = await this.budgetQueue.getRepeatableJobs();
    const hasJob = existingJobs.some((job) => job.name === 'check-budget-threshold');

    if (!hasJob) {
      await this.budgetQueue.add(
        'check-budget-threshold',
        {},
        {
          repeat: {
            pattern: '0 7 * * *', // Daily at 7 AM
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
      this.logger.log('Budget check job registered (daily at 7 AM)');
    }
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing budget check job: ${job.name}`);

    if (job.name === 'check-budget-threshold') {
      await this.checkAllTenantBudgets();
    }
  }

  private async checkAllTenantBudgets(): Promise<void> {
    // Get distinct tenant IDs from active budgets
    const now = new Date();
    const tenantIds = await this.budgetRepository
      .createQueryBuilder('b')
      .select('DISTINCT b.tenant_id', 'tenantId')
      .where('b.period_start <= :now', { now })
      .andWhere('b.period_end >= :now', { now })
      .getRawMany();

    let totalAlerts = 0;

    for (const { tenantId } of tenantIds) {
      try {
        const alerts = await this.budgetService.checkBudgetThresholds(tenantId);

        for (const alert of alerts) {
          const level = alert.percentUsed >= 100 ? 'exceeded' : 'approaching limit';
          await this.notificationsService.broadcastToTenant(
            'budget_alert',
            `Budget ${level}: ${alert.budgetName}`,
            `Maintenance budget "${alert.budgetName}" is at ${alert.percentUsed}% of planned amount.`,
            { budgetId: alert.budgetId, percentUsed: alert.percentUsed },
            tenantId,
          );
          totalAlerts++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to check budgets for tenant ${tenantId}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`Budget check complete: ${totalAlerts} alerts created`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Budget check job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Budget check job ${job.id} failed: ${error.message}`, error.stack);
  }
}
