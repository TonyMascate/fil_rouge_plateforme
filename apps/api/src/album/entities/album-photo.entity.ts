import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Album } from './album.entity';
import { Photo } from '@app/photo/entities/photo.entity';

@Entity('album_photos')
export class AlbumPhoto {
  @PrimaryColumn({ name: 'album_id' })
  albumId!: string;

  @PrimaryColumn({ name: 'photo_id' })
  photoId!: string;

  @ManyToOne(() => Album, (album) => album.albumPhotos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'album_id' })
  album!: Album;

  @ManyToOne(() => Photo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photo_id' })
  photo!: Photo;

  @CreateDateColumn({ name: 'added_at' })
  addedAt!: Date;
}
