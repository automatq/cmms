import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkOrder } from './work-order.entity';

@Entity('wo_checklist_results')
export class WoChecklistResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wo_id' })
  woId: string;

  @ManyToOne(() => WorkOrder, (wo) => wo.checklistResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wo_id' })
  workOrder: WorkOrder;

  @Column({ name: 'step_index' })
  stepIndex: number;

  @Column()
  instruction: string;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  value: string;

  @Column({ nullable: true, name: 'pass_fail' })
  passFail: boolean;

  @Column({ nullable: true, name: 'photo_key' })
  photoKey: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true, name: 'completed_by' })
  completedBy: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
