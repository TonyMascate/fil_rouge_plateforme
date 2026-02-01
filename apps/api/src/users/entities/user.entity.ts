import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { User as UserInterface } from '@repo/shared/user';

@Entity()
export class User implements UserInterface {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @CreateDateColumn()
  createdAt: Date;
}
