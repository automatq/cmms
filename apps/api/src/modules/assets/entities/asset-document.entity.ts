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

export enum DocumentType {
  MANUAL = 'manual',
  SCHEMATIC = 'schematic',
  WARRANTY = 'warranty',
  CERTIFICATE = 'certificate',
  PHOTO = 'photo',
  OTHER = 'other',
}

@Entity('asset_documents')
export class AssetDocument extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset, (asset) => asset.documents)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: DocumentType, nullable: true })
  type: DocumentType;

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
