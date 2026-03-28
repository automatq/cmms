import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Asset } from './asset.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('asset_downtimes')
@Index(['tenantId', 'assetId'])
@Index(['tenantId', 'startedAt'])
export class AssetDowntime extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'uuid', nullable: true, name: 'work_order_id' })
  workOrderId: string;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'ended_at' })
  endedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  reason: string;

  @Column({ type: 'uuid', name: 'reported_by' })
  reportedBy: string;

  @Column({ type: 'int', nullable: true, name: 'duration_minutes' })
  durationMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
