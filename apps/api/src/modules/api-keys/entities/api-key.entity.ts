import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

/**
 * Tenant-scoped API key for programmatic access (integrations, sensor
 * gateways, scripts). Only the SHA-256 hash is stored — the full token is
 * shown once at creation. Requests authenticate by sending the raw token in
 * the `x-api-key` header; the auth guard maps it to a RequestUser carrying the
 * key's scoped permissions and the creator's user id (so FK columns like
 * createdById stay valid).
 */
@Entity('api_keys')
export class ApiKey extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // First characters of the token, kept for display ("mk_ab12cd…").
  @Column({ name: 'key_prefix' })
  keyPrefix: string;

  @Index({ unique: true })
  @Column({ name: 'key_hash' })
  keyHash: string;

  // Scoped permission strings granted to this key (subset of app permissions).
  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
