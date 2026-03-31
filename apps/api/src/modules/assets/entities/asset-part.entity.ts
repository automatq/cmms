import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Asset } from './asset.entity';
import { Part } from '../../inventory/entities/part.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('asset_parts')
@Unique(['tenantId', 'assetId', 'partId'])
export class AssetPart extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'part_id' })
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 1 })
  qty: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
