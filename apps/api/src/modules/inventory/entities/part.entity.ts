import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum AbcClass {
  A = 'A',
  B = 'B',
  C = 'C',
}

@Entity('parts')
@Unique(['tenantId', 'sku'])
export class Part extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sku: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 'each', name: 'unit_of_measure' })
  unitOfMeasure: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'unit_cost' })
  unitCost: number;

  @Column({ nullable: true, name: 'supplier_id' })
  supplierId: string;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'int', nullable: true, name: 'lead_time_days' })
  leadTimeDays: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'min_stock' })
  minStock: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'max_stock' })
  maxStock: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'reorder_qty' })
  reorderQty: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'reorder_point' })
  reorderPoint: number;

  @Column({ default: false, name: 'is_critical' })
  isCritical: boolean;

  @Column({ type: 'enum', enum: AbcClass, nullable: true, name: 'abc_class' })
  abcClass: AbcClass;

  @Column({ nullable: true, name: 'image_key' })
  imageKey: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
