import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum PlanTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Entity('organizations')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.TRIAL,
  })
  status: TenantStatus;

  @Column({
    type: 'enum',
    enum: PlanTier,
    default: PlanTier.FREE,
  })
  plan: PlanTier;

  @Column({
    type: 'jsonb',
    default: {
      preventiveMaintenance: true,
      inventory: false,
      purchaseOrders: false,
      reports: false,
      aiAssistant: false,
      sensors: false,
      workRequestsPortal: true,
    },
  })
  modules: {
    preventiveMaintenance?: boolean;
    inventory?: boolean;
    purchaseOrders?: boolean;
    reports?: boolean;
    aiAssistant?: boolean;
    sensors?: boolean;
    workRequestsPortal?: boolean;
  };

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @Column({ nullable: true, name: 'stripe_customer_id' })
  stripeCustomerId: string;

  @Column({ nullable: true, name: 'stripe_subscription_id' })
  stripeSubscriptionId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'int', default: 0, name: 'user_count' })
  userCount: number;

  @Column({ type: 'int', default: 0, name: 'asset_count' })
  assetCount: number;

  @Column({ type: 'bigint', default: 0, name: 'storage_bytes_used' })
  storageBytesUsed: number;

  @Column({ name: 'onboarding_completed', default: false })
  onboardingCompleted: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'trial_ends_at' })
  trialEndsAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
