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

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({
    type: 'enum',
    enum: PhotoStatus,
    default: PhotoStatus.PENDING,
  })
  status: PhotoStatus;

  @Index()
  @Column({ name: 'file_size_bytes', type: 'int', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'dominant_color', type: 'varchar', length: 7, nullable: true })
  dominantColor: string | null;

  // Palette pondérée extraite à l'ingestion : jusqu'à 5 couleurs avec leur cellule
  // d'atlas et leur poids. Sert au rendu (pastilles) et est la source de vérité
  // des couleurs d'une photo.
  @Column({ name: 'palette', type: 'jsonb', nullable: true })
  palette: { hex: string; cellId: string; weight: number }[] | null;

  // Cellules d'atlas couvertes par la palette (dédupliquées). Colonne tableau
  // indexée en GIN (cf. migration) → requêtes « photos de la cellule X » rapides
  // et appartenance multiple d'une photo à plusieurs couleurs.
  @Column({ name: 'color_cells', type: 'text', array: true, nullable: true })
  colorCells: string[] | null;

  @Column({ name: 'share_token', type: 'varchar', length: 32, nullable: true, unique: true })
  shareToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
