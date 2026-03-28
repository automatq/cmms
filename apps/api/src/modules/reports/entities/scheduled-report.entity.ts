import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum ReportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export enum ScheduledReportType {
  WORK_ORDERS = 'work_orders',
  ASSETS = 'assets',
  PM_COMPLIANCE = 'pm_compliance',
  INVENTORY = 'inventory',
  COSTS = 'costs',
  DOWNTIME = 'downtime',
}

@Entity('scheduled_reports')
export class ScheduledReport extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ScheduledReportType, name: 'report_type' })
  reportType: ScheduledReportType;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  @Column()
  schedule: string; // cron expression

  @Column({ type: 'text', array: true, name: 'recipient_emails' })
  recipientEmails: string[];

  @Column({ type: 'enum', enum: ReportFormat, default: ReportFormat.CSV })
  format: ReportFormat;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_run_at' })
  lastRunAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
