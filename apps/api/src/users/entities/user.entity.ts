import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User as UserInterface } from '@repo/shared/user';
import { Role } from '../enum/role.enum';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';

@Entity()
export class User implements UserInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({select:false})
  password: string;

  @Column({type: 'enum', enum: Role, default: Role.USER})
  role: Role; 

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @CreateDateColumn()
  createdAt: Date;
}
