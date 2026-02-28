import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TenantAwareEntity } from '../../../common/entities/tenant-aware.entity';

@Entity('asset_categories')
export class AssetCategory extends TenantAwareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, name: 'parent_id' })
  parentId: string;

  @ManyToOne(() => AssetCategory, (cat) => cat.children)
  @JoinColumn({ name: 'parent_id' })
  parent: AssetCategory;

  @OneToMany(() => AssetCategory, (cat) => cat.parent)
  children: AssetCategory[];

  @Column({ type: 'jsonb', default: [], name: 'custom_fields' })
  customFields: Array<{
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
