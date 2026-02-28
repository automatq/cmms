import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('asset_meters')
export class AssetMeter extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset, (asset) => asset.meters)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  reading: number;

  @Column({ nullable: true, name: 'recorded_by' })
  recordedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}
