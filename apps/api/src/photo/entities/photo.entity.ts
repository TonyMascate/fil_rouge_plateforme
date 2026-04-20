import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PhotoStatus } from '@repo/shared';
import { User } from '@app/users/entities/user.entity';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ name: 'cloudfront_url', type: 'text', nullable: true })
  cloudFrontUrl: string | null;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({
    type: 'enum',
    enum: PhotoStatus,
    default: PhotoStatus.PENDING,
  })
  status: PhotoStatus;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
