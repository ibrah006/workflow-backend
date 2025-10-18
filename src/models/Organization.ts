import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
import { User } from './User';
import { Project } from './Project';
import { Team } from './Team';
import { Company } from './Company';

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

    @OneToMany(()=> User, (user)=> user.organization)
    users!: User;
  
    @Column('uuid')
    createdById!: string;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;

    // Other relations

    @OneToMany(() => Project, (project) => project.organization)
    projects!: Project[];

    @OneToMany(() => Team, (team) => team.organization)
    teams!: Team[];

    @OneToMany(() => Company, (company) => company.organization)
    companies!: Company[];
  }
  