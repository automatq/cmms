import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from './role.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ nullable: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  image: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
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

  // Mixed values: per-event email toggles (boolean) plus channel config such as
  // SMS phone / Slack & Teams webhook URLs (string) and channel enable flags.
  @Column({ type: 'jsonb', default: {}, name: 'notification_preferences' })
  notificationPreferences: Record<string, unknown>;

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
