import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { WebhooksService } from './webhooks.service';
import { assertSafeOutboundUrl, safeHttpAgent, safeHttpsAgent } from './outbound-url';

interface WebhookJobData {
  subscriptionId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
  tenantId: string;
  attemptNumber: number;
}

@Injectable()
@Processor('webhook-delivery')
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { subscriptionId, url, secret, event, payload, tenantId, attemptNumber } = job.data;

    this.logger.log(`Delivering webhook ${event} to ${url} (attempt ${attemptNumber})`);

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    try {
      // Re-validate at delivery time (the URL may predate this check, and IP
      // literals bypass the agent's DNS lookup hook).
      await assertSafeOutboundUrl(url);

      const response = await axios.post(url, body, {
        httpAgent: safeHttpAgent,
        httpsAgent: safeHttpsAgent,
        maxRedirects: 0, // never follow redirects to (possibly internal) hosts
        proxy: false,
        maxContentLength: 64 * 1024,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
        },
        timeout: 10000,
        validateStatus: () => true,
      });

      const success = response.status >= 200 && response.status < 300;

      await this.webhooksService.recordDelivery(
        subscriptionId,
        event,
        payload,
        response.status,
        // Don't persist the receiver's response body: it is shown back to the
        // tenant in delivery logs, which turned webhooks into a read primitive.
        null,
        success,
        attemptNumber,
        tenantId,
      );

      if (!success) {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (error) {
      const errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 500);

      await this.webhooksService.recordDelivery(
        subscriptionId,
        event,
        payload,
        null,
        errorMessage,
        false,
        attemptNumber,
        tenantId,
      );

      throw error; // Let BullMQ handle retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Webhook delivery ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Webhook delivery ${job.id} failed: ${error.message}`);
  }
}
