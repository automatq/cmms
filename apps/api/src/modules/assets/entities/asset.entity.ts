import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Location } from './location.entity';
import { AssetCategory } from './asset-category.entity';
import { AssetMeter } from './asset-meter.entity';
import { AssetDocument } from './asset-document.entity';
import { AssetDowntime } from './asset-downtime.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum AssetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNDER_REPAIR = 'under_repair',
  RETIRED = 'retired',
}

export enum MeterType {
  HOURS = 'hours',
  CYCLES = 'cycles',
  KM = 'km',
  MILES = 'miles',
  NONE = 'none',
}

@Entity('assets')
@Unique(['tenantId', 'assetNumber'])
export class Asset extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_number' })
  assetNumber: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => AssetCategory)
  @JoinColumn({ name: 'category_id' })
  category: AssetCategory;

  @Column({ nullable: true, name: 'parent_id' })
  parentId: string;

  @ManyToOne(() => Asset, (asset) => asset.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Asset;

  @OneToMany(() => Asset, (asset) => asset.parent)
  children: Asset[];

  @Column({ nullable: true, name: 'location_id' })
  locationId: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true, name: 'serial_number' })
  serialNumber: string;

  @Column({ type: 'date', nullable: true, name: 'purchase_date' })
  purchaseDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'purchase_cost' })
  purchaseCost: number;

  @Column({ type: 'date', nullable: true, name: 'warranty_expiry' })
  warrantyExpiry: Date;

  @Column({ type: 'int', nullable: true, name: 'expected_life_years' })
  expectedLifeYears: number;

  @Column({ type: 'smallint', nullable: true, name: 'asset_condition' })
  assetCondition: number; // 1-5 rating

  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @Column({ default: false, name: 'is_critical' })
  isCritical: boolean;

  @Column({ nullable: true, name: 'qr_code' })
  qrCode: string;

  @Column({ type: 'enum', enum: MeterType, default: MeterType.NONE, name: 'meter_type' })
  meterType: MeterType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'current_meter_value' })
  currentMeterValue: number;

  @Column({ type: 'jsonb', default: {}, name: 'custom_fields' })
  customFields: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  specifications: Record<string, string>;

  @OneToMany(() => AssetMeter, (meter) => meter.asset)
  meters: AssetMeter[];

  @OneToMany(() => AssetDocument, (doc) => doc.asset)
  documents: AssetDocument[];

  @OneToMany(() => AssetDowntime, (downtime) => downtime.asset)
  downtimes: AssetDowntime[];

  @Column({ type: 'simple-array', nullable: true, name: 'warranty_alert_days' })
  warrantyAlertDays: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'retired_at' })
  retiredAt: Date;
}
