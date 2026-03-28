import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { Location } from '../../assets/entities/location.entity';
import { User } from '../../users/entities/user.entity';
import { WoLabor } from './wo-labor.entity';
import { WoPart } from './wo-part.entity';
import { WoAttachment } from './wo-attachment.entity';
import { WoChecklistResult } from './wo-checklist-result.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum WorkOrderType {
  CORRECTIVE = 'corrective',
  PREVENTIVE = 'preventive',
  INSPECTION = 'inspection',
  EMERGENCY = 'emergency',
}

export enum WorkOrderStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

@Entity('work_orders')
@Unique(['tenantId', 'woNumber'])
export class WorkOrder extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wo_number' })
  woNumber: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: WorkOrderType })
  type: WorkOrderType;

  @Column({ type: 'enum', enum: Priority, default: Priority.MEDIUM })
  priority: Priority;

  @Column({ type: 'enum', enum: WorkOrderStatus, default: WorkOrderStatus.OPEN })
  status: WorkOrderStatus;

  @Column({ nullable: true, name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ nullable: true, name: 'location_id' })
  locationId: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column('uuid', { array: true, default: [], name: 'assigned_to' })
  assignedTo: string[];

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'scheduled_start' })
  scheduledStart: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'scheduled_end' })
  scheduledEnd: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'actual_start' })
  actualStart: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'actual_end' })
  actualEnd: Date;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'estimated_hours' })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'actual_hours' })
  actualHours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'estimated_cost' })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'actual_cost' })
  actualCost: number;

  @Column({ nullable: true, name: 'failure_code' })
  failureCode: string;

  @Column({ type: 'text', nullable: true, name: 'root_cause' })
  rootCause: string;

  @Column({ type: 'text', nullable: true, name: 'resolution_notes' })
  resolutionNotes: string;

  @Column({ nullable: true, name: 'pm_plan_id' })
  pmPlanId: string;

  @Column({ type: 'uuid', nullable: true, name: 'team_id' })
  teamId: string;

  @Column({ type: 'varchar', nullable: true, name: 'completion_signature' })
  completionSignature: string;

  @Column({ type: 'uuid', nullable: true, name: 'signed_off_by' })
  signedOffBy: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'signed_off_at' })
  signedOffAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => WoLabor, (labor) => labor.workOrder, { cascade: true })
  labor: WoLabor[];

  @OneToMany(() => WoPart, (part) => part.workOrder, { cascade: true })
  parts: WoPart[];

  @OneToMany(() => WoAttachment, (att) => att.workOrder, { cascade: true })
  attachments: WoAttachment[];

  @OneToMany(() => WoChecklistResult, (result) => result.workOrder, { cascade: true })
  checklistResults: WoChecklistResult[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'closed_at' })
  closedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date;
}
