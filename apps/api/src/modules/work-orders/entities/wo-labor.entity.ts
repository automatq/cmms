import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkOrder } from './work-order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('wo_labor')
export class WoLabor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wo_id' })
  woId: string;

  @ManyToOne(() => WorkOrder, (wo) => wo.labor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wo_id' })
  workOrder: WorkOrder;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  hours: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'hourly_rate' })
  hourlyRate: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'logged_at' })
  loggedAt: Date;
}
