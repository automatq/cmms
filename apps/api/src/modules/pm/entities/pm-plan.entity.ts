import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum TriggerType {
  TIME = 'time',
  METER = 'meter',
  CONDITION = 'condition',
  CALENDAR = 'calendar',
  EVENT = 'event',
}

export enum FrequencyUnit {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

@Entity('pm_plans')
export class PmPlan extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'enum', enum: TriggerType, name: 'trigger_type' })
  triggerType: TriggerType;

  // Time-based
  @Column({ type: 'int', nullable: true, name: 'frequency_value' })
  frequencyValue: number;

  @Column({ type: 'enum', enum: FrequencyUnit, nullable: true, name: 'frequency_unit' })
  frequencyUnit: FrequencyUnit;

  // Meter-based
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'meter_interval' })
  meterInterval: number;

  @Column({ nullable: true, name: 'meter_unit' })
  meterUnit: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'last_meter_reading' })
  lastMeterReading: number;

  // Calendar-based
  @Column({ type: 'jsonb', nullable: true, name: 'calendar_dates' })
  calendarDates: string[]; // Array of ISO date strings

  // Scheduling
  @Column({ type: 'int', default: 0, name: 'lead_time_days' })
  leadTimeDays: number;

  @Column({ default: true, name: 'rolling_schedule' })
  rollingSchedule: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_triggered_at' })
  lastTriggeredAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'next_due_at' })
  nextDueAt?: Date;

  // Assignment
  @Column('uuid', { array: true, default: [], name: 'assigned_to' })
  assignedTo: string[];

  @Column({ default: 'medium' })
  priority: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'estimated_hours' })
  estimatedHours: number;

  @Column({ nullable: true, name: 'checklist_template_id' })
  checklistTemplateId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
