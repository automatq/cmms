import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WebhookSubscription } from './webhook-subscription.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('webhook_logs')
export class WebhookLog extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subscription_id' })
  subscriptionId: string;

  @ManyToOne(() => WebhookSubscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: WebhookSubscription;

  @Column()
  event: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'int', nullable: true, name: 'response_status' })
  responseStatus: number;

  @Column({ type: 'text', nullable: true, name: 'response_body' })
  responseBody: string;

  @Column()
  success: boolean;

  @Column({ type: 'int', name: 'attempt_number' })
  attemptNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
