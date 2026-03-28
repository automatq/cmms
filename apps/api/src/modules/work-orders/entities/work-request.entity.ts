import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { Location } from '../../assets/entities/location.entity';
import { WorkOrder } from './work-order.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum WorkRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONVERTED = 'converted',
}

@Entity('work_requests')
export class WorkRequest extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'location_id' })
  locationId: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ nullable: true, name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ default: 'medium' })
  priority: string;

  @Column({ type: 'enum', enum: WorkRequestStatus, default: WorkRequestStatus.PENDING })
  status: WorkRequestStatus;

  @Column({ nullable: true, name: 'submitted_by' })
  submittedBy: string;

  @Column({ nullable: true, name: 'submitter_name' })
  submitterName: string;

  @Column({ nullable: true, name: 'submitter_email' })
  submitterEmail: string;

  @Column({ nullable: true, name: 'submitter_phone' })
  submitterPhone: string;

  @Column({ type: 'varchar', nullable: true, unique: true, name: 'tracking_token' })
  trackingToken: string;

  @Column({ nullable: true, name: 'wo_id' })
  woId: string;

  @ManyToOne(() => WorkOrder, { nullable: true })
  @JoinColumn({ name: 'wo_id' })
  workOrder: WorkOrder;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string;

  @Column({ nullable: true, name: 'approved_by' })
  approvedBy: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
