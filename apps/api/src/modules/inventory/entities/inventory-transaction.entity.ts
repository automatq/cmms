import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Part } from './part.entity';
import { Storeroom } from './storeroom.entity';

export enum TransactionType {
  RECEIVE = 'receive',
  ISSUE = 'issue',
  ADJUST = 'adjust',
  TRANSFER = 'transfer',
  RETURN = 'return',
  RESERVE = 'reserve',
  RELEASE = 'release',
}

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'part_id' })
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Column({ name: 'storeroom_id' })
  storeroomId: string;

  @ManyToOne(() => Storeroom)
  @JoinColumn({ name: 'storeroom_id' })
  storeroom: Storeroom;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  qty: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'unit_cost' })
  unitCost: number;

  @Column({ nullable: true, name: 'reference_id' })
  referenceId: string; // WO ID or PO ID

  @Column({ nullable: true, name: 'reference_type' })
  referenceType: string; // 'work_order' or 'purchase_order'

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true, name: 'performed_by' })
  performedBy: string;

  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;
}
