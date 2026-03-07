import { User } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class RefreshToken {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  tokenHash: string;

  @Column({ default: false })
  isRevoked: boolean;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
