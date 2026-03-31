import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

export enum FailureCodeLevel {
  CATEGORY = 'category',
  MECHANISM = 'mechanism',
  CAUSE = 'cause',
}

@Entity('failure_codes')
@Unique(['tenantId', 'code'])
export class FailureCode extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: FailureCodeLevel })
  level: FailureCodeLevel;

  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string;

  @ManyToOne(() => FailureCode, (fc) => fc.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: FailureCode;

  @OneToMany(() => FailureCode, (fc) => fc.parent)
  children: FailureCode[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
