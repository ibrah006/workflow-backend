import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Task } from "./Task";
import { User } from "./User";
import { Company } from "./Company";
import { ProgressLog } from "./ProgressLog";
import { MaterialLog } from "./MaterialLog";
import { AppDataSource } from "../data-source";
import { Organization } from "./Organization";


@Entity()
export class Project {
    @PrimaryColumn({ type: 'varchar' })
    id!: string;
    
    @BeforeInsert()
      async generateProjectId() {
        if (!this.organizationId) {
          throw new Error('Project must have an organizationId before saving');
        }
    
        const year = new Date().getFullYear();
    
        const projectRepo = AppDataSource.getRepository(Project);
        const countThisYearForOrg = await projectRepo
          .createQueryBuilder('project')
          .where('project.organizationId = :orgId', { orgId: this.organizationId })
          .andWhere(`EXTRACT(YEAR FROM project."createdAt") = :year`, { year })
          .getCount();
    
        const sequenceNumber = String(countThisYearForOrg + 1).padStart(3, '0');
    
        this.id = `PRJ-${this.organizationId}-${year}-${sequenceNumber}`;
    }
    
    @ManyToOne(() => Organization, (org) => org.projects, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    organization!: Organization;

    @Column('uuid')
    organizationId!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @Column()
    name!: string;

    @Column({nullable: true})
    description?: string;

    @Column()
    status!: string;

    @CreateDateColumn({ type: 'date', nullable: true })
    dateStarted!: Date;

    @Column({ type: 'date', nullable: true })
    dueDate?: Date;

    @Column({ type: 'date', nullable: true })
    estimatedProductionStart?: Date;

    @Column({ type: 'date', nullable: true })
    estimatedSiteFixing?: Date;

    @OneToMany(()=> Task, (task)=> task.project)
    tasks!: Task[];

    @ManyToMany(()=> User, (user)=> user.managedProjects)
    @JoinTable()
    assignedManagers!: User[];

    @ManyToOne(()=> Company, (company)=> company.projects)
    client!: Company;

    @Column({default: 0})
    priority!: number;

    @Column({ type: 'timestamptz', nullable: true })
    progressLogLastModifiedAt?: Date | null;
    
    @Column({ type: 'timestamptz', nullable: true })
    tasksLastModifiedAt?: Date | null;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @OneToMany(()=> MaterialLog, (log)=> log.project)
    materialLogs!: MaterialLog[];

    // derived attributes (NOTE FOR THE FRONT-END):
    // project efficiency

    @OneToMany(()=> ProgressLog, log=> log.project)
    progressLogs?: ProgressLog[];
    
}