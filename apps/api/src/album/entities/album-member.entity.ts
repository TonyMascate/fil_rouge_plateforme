import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Album } from './album.entity';
import { User } from '@app/users/entities/user.entity';

@Entity('album_members')
export class AlbumMember {
  @PrimaryColumn({ name: 'album_id' })
  albumId!: string;

  @Index()
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Album, (album) => album.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'album_id' })
  album!: Album;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
