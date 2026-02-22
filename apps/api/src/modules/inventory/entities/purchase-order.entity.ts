import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { PoLineItem } from './po-line-item.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIAL = 'partial',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'po_number' })
  poNumber: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ nullable: true, name: 'approved_by' })
  approvedBy: string;

  @Column({ type: 'date', nullable: true, name: 'requested_date' })
  requestedDate: Date;

  @Column({ type: 'date', nullable: true, name: 'expected_date' })
  expectedDate: Date;

  @Column({ type: 'date', nullable: true, name: 'received_date' })
  receivedDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true, name: 'shipping_address' })
  shippingAddress: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'total_cost' })
  totalCost: number;

  @OneToMany(() => PoLineItem, (item) => item.purchaseOrder, { cascade: true })
  lineItems: PoLineItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
