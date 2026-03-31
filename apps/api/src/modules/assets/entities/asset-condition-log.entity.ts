import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Asset } from './asset.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('asset_condition_logs')
@Index(['tenantId', 'assetId', 'assessedAt'])
export class AssetConditionLog extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'smallint' })
  condition: number; // 1-5 rating

  @Column({ type: 'uuid', name: 'assessed_by' })
  assessedBy: string;

  @Column({ type: 'timestamptz', name: 'assessed_at' })
  assessedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
