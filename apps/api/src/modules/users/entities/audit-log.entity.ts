import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('audit_logs')
export class AuditLog extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  action: string;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ nullable: true, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'before_data' })
  beforeData: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true, name: 'after_data' })
  afterData: Record<string, unknown>;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
