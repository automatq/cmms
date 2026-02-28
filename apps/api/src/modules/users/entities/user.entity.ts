import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Unique,
} from 'typeorm';
import { Role } from './role.entity';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Unique(['tenantId', 'username'])
@Unique(['tenantId', 'email'])
export class User extends TenantAwareEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, name: 'job_title' })
  jobTitle: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'hourly_rate' })
  hourlyRate: number;

  @Column({ type: 'jsonb', default: {}, name: 'notification_preferences' })
  notificationPreferences: Record<string, boolean>;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: Role[];

  @Column({ type: 'timestamptz', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
