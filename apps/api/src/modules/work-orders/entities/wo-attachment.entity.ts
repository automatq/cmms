import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkOrder } from './work-order.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('wo_attachments')
export class WoAttachment extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wo_id' })
  woId: string;

  @ManyToOne(() => WorkOrder, (wo) => wo.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wo_id' })
  workOrder: WorkOrder;

  @Column()
  name: string;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ nullable: true, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint', nullable: true, name: 'size_bytes' })
  sizeBytes: number;

  @Column({ nullable: true, name: 'uploaded_by' })
  uploadedBy: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
