import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BillingService } from './billing.service';
import { Public } from '../auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Billing Webhooks')
@Controller('billing/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post()
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = this.billingService.constructWebhookEvent(
        req.rawBody!,
        signature,
      );
    } catch (error: any) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
      await this.billingService.handleWebhookEvent(event);
    } catch (error: any) {
      this.logger.error(`Webhook handling error: ${error.message}`, error.stack);
      // Return 200 anyway to prevent Stripe retries for app-level errors
    }

    return res.json({ received: true });
  }
}
