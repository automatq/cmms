import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('checklist_templates')
export class ChecklistTemplate {
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
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
