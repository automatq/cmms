import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { TenantService, PLAN_LIMITS } from '../../common/tenant/tenant.service';
import { PlanTier, TenantStatus } from '../users/entities/tenant.entity';

const PLAN_PRICE_MAP: Record<string, PlanTier> = {};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;
  private readonly proPriceId: string;
  private readonly enterprisePriceId: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantService: TenantService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY', ''),
      { apiVersion: '2025-04-30.basil' as any },
    );
    this.proPriceId = this.configService.get<string>('STRIPE_PRO_PRICE_ID', '');
    this.enterprisePriceId = this.configService.get<string>('STRIPE_ENTERPRISE_PRICE_ID', '');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    // Build reverse lookup: price ID -> plan tier
    if (this.proPriceId) PLAN_PRICE_MAP[this.proPriceId] = PlanTier.PRO;
    if (this.enterprisePriceId) PLAN_PRICE_MAP[this.enterprisePriceId] = PlanTier.ENTERPRISE;
  }

  // ==================== CUSTOMER MANAGEMENT ====================

  async getOrCreateCustomer(tenantId: string, email: string): Promise<string> {
    const tenant = await this.tenantService.findById(tenantId);

    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email,
      name: tenant.name,
      metadata: { tenantId: tenant.id, slug: tenant.slug },
    });

    await this.tenantService.findById(tenantId); // re-fetch for safety
    // Update tenant with Stripe customer ID directly
    const tenantEntity = await this.tenantService.findById(tenantId);
    (tenantEntity as any).stripeCustomerId = customer.id;
    // Save via the repository through tenant service
    await this.tenantService.updateStripeCustomerId(tenantId, customer.id);

    return customer.id;
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  async createCheckoutSession(
    tenantId: string,
    plan: 'pro' | 'enterprise',
    email: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    const customerId = await this.getOrCreateCustomer(tenantId, email);
    const priceId = plan === 'enterprise' ? this.enterprisePriceId : this.proPriceId;

    if (!priceId) {
      throw new BadRequestException(`Price not configured for plan: ${plan}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenantId },
      subscription_data: {
        metadata: { tenantId },
      },
    });

    return { url: session.url! };
  }

  async createBillingPortalSession(
    tenantId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const tenant = await this.tenantService.findById(tenantId);

    if (!tenant.stripeCustomerId) {
      throw new BadRequestException('No billing account found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async getSubscription(tenantId: string): Promise<{
    plan: PlanTier;
    status: string;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }> {
    const tenant = await this.tenantService.findById(tenantId);

    if (!tenant.stripeSubscriptionId) {
      return {
        plan: tenant.plan,
        status: 'free',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      tenant.stripeSubscriptionId,
    ) as unknown as Stripe.Subscription;

    return {
      plan: tenant.plan,
      status: subscription.status,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    };
  }

  async cancelSubscription(tenantId: string): Promise<void> {
    const tenant = await this.tenantService.findById(tenantId);

    if (!tenant.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription');
    }

    await this.stripe.subscriptions.update(tenant.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // ==================== USAGE / INVOICES ====================

  async getInvoices(tenantId: string, limit = 10): Promise<Stripe.Invoice[]> {
    const tenant = await this.tenantService.findById(tenantId);

    if (!tenant.stripeCustomerId) {
      return [];
    }

    const invoices = await this.stripe.invoices.list({
      customer: tenant.stripeCustomerId,
      limit,
    });

    return invoices.data;
  }

  // ==================== WEBHOOK HANDLING ====================

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId || !session.subscription) return;

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;

    await this.tenantService.updateStripeSubscriptionId(tenantId, subscriptionId);

    // Determine plan from subscription price
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? (PLAN_PRICE_MAP[priceId] || PlanTier.PRO) : PlanTier.PRO;

    await this.tenantService.updatePlan(tenantId, plan);
    await this.tenantService.updateStatus(tenantId, TenantStatus.ACTIVE);

    this.logger.log(`Tenant ${tenantId} upgraded to ${plan}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? (PLAN_PRICE_MAP[priceId] || PlanTier.PRO) : PlanTier.PRO;

    if (subscription.status === 'active') {
      await this.tenantService.updatePlan(tenantId, plan);
      await this.tenantService.updateStatus(tenantId, TenantStatus.ACTIVE);
    } else if (subscription.status === 'past_due') {
      this.logger.warn(`Tenant ${tenantId} subscription is past due`);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    await this.tenantService.updatePlan(tenantId, PlanTier.FREE);
    await this.tenantService.updateStatus(tenantId, TenantStatus.ACTIVE);
    await this.tenantService.updateStripeSubscriptionId(tenantId, '');

    this.logger.log(`Tenant ${tenantId} downgraded to free (subscription cancelled)`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) return;

    this.logger.warn(`Payment failed for customer ${customerId}`);
  }
}
