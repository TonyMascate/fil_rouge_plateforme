import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '@app/users/entities/user.entity';
import { AlbumPhoto } from './album-photo.entity';
import { AlbumMember } from './album-member.entity';

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => AlbumPhoto, (ap) => ap.album)
  albumPhotos!: AlbumPhoto[];

  @OneToMany(() => AlbumMember, (am) => am.album)
  members!: AlbumMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
