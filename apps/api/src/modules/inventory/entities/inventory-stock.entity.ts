import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Part } from './part.entity';
import { Storeroom } from './storeroom.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('inventory_stock')
@Unique(['tenantId', 'partId', 'storeroomId'])
export class InventoryStock extends TenantAwareEntity {
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

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'qty_on_hand' })
  qtyOnHand: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'qty_reserved' })
  qtyReserved: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'qty_on_order' })
  qtyOnOrder: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_counted_at' })
  lastCountedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_received_at' })
  lastReceivedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
