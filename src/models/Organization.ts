import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
import { User } from './User';

@Entity()
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ unique: true })
    name!: string;
  
    @Column({ nullable: true })
    description?: string;
  
    // 👇 New relation to track creator
    @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'createdById' })
    createdBy!: User;
  
    @Column('uuid')
    createdById!: string;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }
  