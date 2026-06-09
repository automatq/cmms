import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum NotificationType {
  WO_ASSIGNED = 'wo_assigned',
  WO_STATUS_CHANGED = 'wo_status_changed',
  WO_DUE_SOON = 'wo_due_soon',
  WO_OVERDUE = 'wo_overdue',
  PM_DUE = 'pm_due',
  LOW_STOCK = 'low_stock',
  WORK_REQUEST = 'work_request',
  SYSTEM = 'system',
  WARRANTY_EXPIRING = 'warranty_expiring',
  BUDGET_ALERT = 'budget_alert',
  CONTRACT_EXPIRING = 'contract_expiring',
  MENTION = 'mention',
}

@Entity('notifications')
export class Notification extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
