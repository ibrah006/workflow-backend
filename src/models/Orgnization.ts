import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Project } from './Project';
import { User } from './User';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Project, project => project.organization)
  projects!: Project[];

  @OneToMany(() =>  User, user => user.organization)
  users!: User[];

  @OneToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;
}
