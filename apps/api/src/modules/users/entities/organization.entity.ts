import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'jsonb', default: {
    preventiveMaintenance: true,
    inventory: true,
    purchaseOrders: true,
    reports: true,
    aiAssistant: true,
    sensors: false,
    workRequestsPortal: true,
  }})
  modules: {
    preventiveMaintenance?: boolean;
    inventory?: boolean;
    purchaseOrders?: boolean;
    reports?: boolean;
    aiAssistant?: boolean;
    sensors?: boolean;
    workRequestsPortal?: boolean;
  };

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
