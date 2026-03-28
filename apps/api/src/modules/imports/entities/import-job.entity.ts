import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum ImportType {
  ASSETS = 'assets',
  LOCATIONS = 'locations',
  PARTS = 'parts',
  WORK_ORDERS = 'work_orders',
}

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('import_jobs')
export class ImportJob extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ImportType })
  type: ImportType;

  @Column({ type: 'enum', enum: ImportStatus, default: ImportStatus.PENDING })
  status: ImportStatus;

  @Column({ name: 'total_rows', default: 0 })
  totalRows: number;

  @Column({ name: 'processed_rows', default: 0 })
  processedRows: number;

  @Column({ name: 'error_rows', default: 0 })
  errorRows: number;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails: { row: number; errors: string[] }[];

  @Column({ type: 'jsonb', nullable: true, name: 'column_mapping' })
  columnMapping: Record<string, string>;

  @Column({ nullable: true, name: 'storage_key' })
  storageKey: string;

  @Column({ nullable: true, name: 'uploaded_by' })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date;
}
