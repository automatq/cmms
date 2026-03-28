import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Location } from '../../assets/entities/location.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('maintenance_budgets')
export class MaintenanceBudget extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd: Date;

  @Column({ type: 'uuid', nullable: true, name: 'location_id' })
  locationId: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'planned_amount' })
  plannedAmount: number;

  @Column({ type: 'jsonb', default: {}, name: 'allocated_categories' })
  allocatedCategories: Record<string, number>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
