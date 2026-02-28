import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { WebhookController } from './webhook.controller';
import { UsageService } from './usage.service';
import { TenantModule } from '../../common/tenant/tenant.module';

@Module({
  imports: [ConfigModule, TenantModule],
  controllers: [BillingController, WebhookController],
  providers: [BillingService, UsageService],
  exports: [BillingService, UsageService, TenantModule],
})
export class BillingModule {}
