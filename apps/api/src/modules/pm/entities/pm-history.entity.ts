import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PmPlan } from './pm-plan.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum PmHistoryStatus {
  ON_TIME = 'on_time',
  LATE = 'late',
  SKIPPED = 'skipped',
}

@Entity('pm_history')
export class PmHistory extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pm_plan_id' })
  pmPlanId: string;

  @ManyToOne(() => PmPlan)
  @JoinColumn({ name: 'pm_plan_id' })
  pmPlan: PmPlan;

  @Column({ nullable: true, name: 'wo_id' })
  woId: string;

  @Column({ type: 'timestamptz', name: 'due_at' })
  dueAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'enum', enum: PmHistoryStatus, nullable: true })
  status: PmHistoryStatus;

  @CreateDateColumn({ name: 'triggered_at' })
  triggeredAt: Date;
}
