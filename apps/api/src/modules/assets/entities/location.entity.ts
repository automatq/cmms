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

export enum LocationType {
  SITE = 'site',
  BUILDING = 'building',
  ZONE = 'zone',
  ROOM = 'room',
}

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: LocationType, nullable: true })
  type: LocationType;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, name: 'parent_id' })
  parentId: string;

  @ManyToOne(() => Location, (loc) => loc.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Location;

  @OneToMany(() => Location, (loc) => loc.parent)
  children: Location[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
