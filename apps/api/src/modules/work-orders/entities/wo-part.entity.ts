import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkOrder } from './work-order.entity';

@Entity('wo_parts')
export class WoPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wo_id' })
  woId: string;

  @ManyToOne(() => WorkOrder, (wo) => wo.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wo_id' })
  workOrder: WorkOrder;

  @Column({ name: 'part_id' })
  partId: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'qty_used' })
  qtyUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'unit_cost' })
  unitCost: number;

  @Column({ default: false })
  reserved: boolean;

  @Column({ nullable: true, name: 'storeroom_id' })
  storeroomId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
