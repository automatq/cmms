import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';
import { WorkOrder } from './work-order.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Additional technicians on a work order. The WorkOrder.assignedToId stays the
 * "primary" tech; this join lets a crew be assigned. WoLabor already records
 * hours per user, so this complements (doesn't replace) labor tracking.
 */
@Entity('wo_assignees')
@Unique(['woId', 'userId'])
export class WoAssignee extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'wo_id' })
  woId: string;

  @ManyToOne(() => WorkOrder, (wo) => wo.assignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wo_id' })
  workOrder: WorkOrder;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
