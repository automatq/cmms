import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

/**
 * A time-series reading from a sensor/IoT source for an asset. Kept separate
 * from AssetMeter (odometer-style, monotonic) because condition signals such as
 * temperature/vibration go up AND down. Condition-trigger PM plans are evaluated
 * against the latest reading per (asset, metric).
 */
@Entity('sensor_readings')
@Index(['tenantId', 'assetId', 'metric', 'recordedAt'])
export class SensorReading extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'asset_id' })
  assetId: string;

  @Column()
  metric: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  value: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'timestamptz', name: 'recorded_at' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
