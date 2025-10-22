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

    @Column('uuid')
    createdById!: string;

    @OneToMany(()=> User, (user)=> user.organization)
    users!: User[];

    @Column()
    isSample!: boolean;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    projectsLastAdded?: Date | null;

    // With this, any verified user (with the same domain) that signs up, will be automatically invited to join their organization
    @Column({ default: false })
    isDomainOwner!: boolean;

    @Column({ nullable: true })
    privateDomain!: string;

    // Other relations

    @OneToMany(() => Project, (project) => project.organization)
    projects!: Project[];

    @OneToMany(() => Team, (team) => team.organization)
    teams!: Team[];

    @OneToMany(() => Company, (company) => company.organization)
    companies!: Company[];
  }
  