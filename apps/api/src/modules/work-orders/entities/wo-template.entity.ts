import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';
import { WorkOrderType, Priority } from './work-order.entity';

/**
 * Reusable template for ad-hoc (non-PM) work orders. Lets planners spin up a
 * pre-filled corrective/inspection job — type, priority, checklist, estimate —
 * instead of retyping it every time. The new-WO form reads a template and
 * prefills itself; instantiation reuses the existing WorkOrder create path.
 */
@Entity('wo_templates')
export class WoTemplate extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: WorkOrderType, default: WorkOrderType.CORRECTIVE })
  type: WorkOrderType;

  @Column({ type: 'enum', enum: Priority, default: Priority.MEDIUM, name: 'default_priority' })
  defaultPriority: Priority;

  @Column({ type: 'uuid', nullable: true, name: 'checklist_template_id' })
  checklistTemplateId: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'estimated_hours' })
  estimatedHours: number;

  @Column({ type: 'uuid', nullable: true, name: 'asset_id' })
  assetId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
