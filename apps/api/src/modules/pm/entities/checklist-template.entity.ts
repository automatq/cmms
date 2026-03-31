import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('checklist_templates')
export class ChecklistTemplate extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  items: Array<{
    step: number;
    instruction: string;
    requiresPhoto?: boolean;
    requiresValue?: boolean;
    unit?: string;
    passFail?: boolean;
    safetyNotes?: string;
    requiredPPE?: string[];
  }>;

  @Column({ name: 'lockout_required', default: false })
  lockoutRequired: boolean;

  @Column({ name: 'is_library', default: false })
  isLibrary: boolean;

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
