import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum ContractType {
  FULL_SERVICE = 'full_service',
  LABOR_ONLY = 'labor_only',
  PARTS_ONLY = 'parts_only',
  WARRANTY_EXTENSION = 'warranty_extension',
}

export enum RenewalType {
  AUTO = 'auto',
  MANUAL = 'manual',
  NONE = 'none',
}

export enum ContractStatus {
  ACTIVE = 'active',
  EXPIRING = 'expiring',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('service_contracts')
export class ServiceContract extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  name: string;

  @Column({ nullable: true, name: 'contract_number' })
  contractNumber: string;

  @Column({ type: 'enum', enum: ContractType })
  type: ContractType;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: number;

  @Column({ type: 'enum', enum: RenewalType, default: RenewalType.NONE, name: 'renewal_type' })
  renewalType: RenewalType;

  @Column({ type: 'text', nullable: true })
  terms: string;

  @Column({ type: 'int', nullable: true, name: 'sla_response_hours' })
  slaResponseHours: number;

  @Column({ type: 'int', nullable: true, name: 'sla_resolution_hours' })
  slaResolutionHours: number;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.ACTIVE })
  status: ContractStatus;

  @ManyToMany(() => Asset)
  @JoinTable({
    name: 'service_contract_assets',
    joinColumn: { name: 'contract_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'asset_id', referencedColumnName: 'id' },
  })
  assets: Asset[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
