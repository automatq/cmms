import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('user_push_tokens')
export class UserPushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  token: string;

  @Column()
  platform: string; // 'ios' | 'android'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
