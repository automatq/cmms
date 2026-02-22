import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Part } from './part.entity';
import { Storeroom } from './storeroom.entity';

@Entity('po_line_items')
export class PoLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'po_id' })
  poId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'part_id' })
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'qty_ordered' })
  qtyOrdered: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'qty_received' })
  qtyReceived: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'unit_cost' })
  unitCost: number;

  @Column({ nullable: true, name: 'storeroom_id' })
  storeroomId: string;

  @ManyToOne(() => Storeroom, { nullable: true })
  @JoinColumn({ name: 'storeroom_id' })
  storeroom: Storeroom;
}
