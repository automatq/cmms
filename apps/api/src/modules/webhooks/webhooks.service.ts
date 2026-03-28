import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookLog } from './entities/webhook-log.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepository: Repository<WebhookSubscription>,
    @InjectRepository(WebhookLog)
    private readonly logRepository: Repository<WebhookLog>,
    @InjectQueue('webhook-delivery')
    private readonly webhookQueue: Queue,
  ) {}

  async create(
    dto: { url: string; events: string[] },
    tenantId: string,
  ): Promise<WebhookSubscription> {
    const secret = crypto.randomBytes(32).toString('hex');
    const subscription = this.subscriptionRepository.create({
      ...dto,
      secret,
      tenantId,
    });
    return this.subscriptionRepository.save(subscription);
  }

  async findAll(tenantId: string): Promise<WebhookSubscription[]> {
    return this.subscriptionRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<WebhookSubscription> {
    const sub = await this.subscriptionRepository.findOne({
      where: { id, tenantId },
    });
    if (!sub) throw new NotFoundException(`Webhook ${id} not found`);
    return sub;
  }

  async update(
    id: string,
    dto: Partial<{ url: string; events: string[]; isActive: boolean }>,
    tenantId: string,
  ): Promise<WebhookSubscription> {
    const sub = await this.findOne(id, tenantId);
    Object.assign(sub, dto);
    if (dto.isActive === true) {
      sub.failCount = 0; // Reset fail count when re-enabling
    }
    return this.subscriptionRepository.save(sub);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const sub = await this.findOne(id, tenantId);
    await this.subscriptionRepository.remove(sub);
  }

  async getLogs(
    subscriptionId: string,
    tenantId: string,
    limit = 50,
  ): Promise<WebhookLog[]> {
    return this.logRepository.find({
      where: { subscriptionId, tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async trigger(
    event: string,
    payload: Record<string, unknown>,
    tenantId: string,
  ): Promise<void> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { tenantId, isActive: true },
    });

    const matching = subscriptions.filter((s) => s.events.includes(event));

    for (const sub of matching) {
      await this.webhookQueue.add(
        'deliver-webhook',
        {
          subscriptionId: sub.id,
          url: sub.url,
          secret: sub.secret,
          event,
          payload,
          tenantId,
          attemptNumber: 1,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 min, 5 min, 30 min
          },
        },
      );
    }
  }

  async sendTestWebhook(id: string, tenantId: string): Promise<void> {
    const sub = await this.findOne(id, tenantId);
    await this.webhookQueue.add('deliver-webhook', {
      subscriptionId: sub.id,
      url: sub.url,
      secret: sub.secret,
      event: 'test',
      payload: { message: 'This is a test webhook', timestamp: new Date().toISOString() },
      tenantId,
      attemptNumber: 1,
    });
  }

  async redeliverLog(logId: string, tenantId: string): Promise<void> {
    const log = await this.logRepository.findOne({
      where: { id: logId, tenantId },
      relations: ['subscription'],
    });

    if (!log) throw new NotFoundException(`Webhook log ${logId} not found`);

    await this.webhookQueue.add('deliver-webhook', {
      subscriptionId: log.subscriptionId,
      url: log.subscription.url,
      secret: log.subscription.secret,
      event: log.event,
      payload: log.payload,
      tenantId,
      attemptNumber: 1,
    });
  }

  async recordDelivery(
    subscriptionId: string,
    event: string,
    payload: Record<string, unknown>,
    responseStatus: number | null,
    responseBody: string | null,
    success: boolean,
    attemptNumber: number,
    tenantId: string,
  ): Promise<void> {
    const log = this.logRepository.create({
      subscriptionId,
      event,
      payload,
      responseStatus: responseStatus ?? undefined,
      responseBody: responseBody?.substring(0, 10000),
      success,
      attemptNumber,
      tenantId,
    });
    await this.logRepository.save(log);

    // Update subscription
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });
    if (sub) {
      sub.lastTriggeredAt = new Date();
      if (success) {
        sub.failCount = 0;
      } else {
        sub.failCount += 1;
        if (sub.failCount >= 10) {
          sub.isActive = false;
          this.logger.warn(`Webhook ${sub.id} disabled after 10 consecutive failures`);
        }
      }
      await this.subscriptionRepository.save(sub);
    }
  }
}
