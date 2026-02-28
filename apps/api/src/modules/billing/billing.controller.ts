import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @Permissions('billing:read')
  @ApiOperation({ summary: 'Get current subscription details' })
  getSubscription(@CurrentUser() user: RequestUser) {
    return this.billingService.getSubscription(user.tenantId);
  }

  @Post('checkout')
  @Permissions('billing:write')
  @ApiOperation({ summary: 'Create Stripe checkout session for plan upgrade' })
  @ApiResponse({ status: 200, description: 'Checkout URL' })
  createCheckout(
    @CurrentUser() user: RequestUser,
    @Body() body: { plan: 'pro' | 'enterprise'; successUrl: string; cancelUrl: string },
  ) {
    return this.billingService.createCheckoutSession(
      user.tenantId,
      body.plan,
      user.email,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post('portal')
  @Permissions('billing:read')
  @ApiOperation({ summary: 'Create Stripe billing portal session' })
  @ApiResponse({ status: 200, description: 'Portal URL' })
  createPortalSession(
    @CurrentUser() user: RequestUser,
    @Body() body: { returnUrl: string },
  ) {
    return this.billingService.createBillingPortalSession(
      user.tenantId,
      body.returnUrl,
    );
  }

  @Post('cancel')
  @Permissions('billing:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  cancelSubscription(@CurrentUser() user: RequestUser) {
    return this.billingService.cancelSubscription(user.tenantId);
  }

  @Get('invoices')
  @Permissions('billing:read')
  @ApiOperation({ summary: 'Get invoice history' })
  getInvoices(
    @CurrentUser() user: RequestUser,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.getInvoices(user.tenantId, limit || 10);
  }
}
