import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Task } from "./Task";
import { User } from "./User";
import { Company } from "./Company";
import { ProgressLog } from "./ProgressLog";


@Entity()
export class Project {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

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

    // derived attributes (NOTE FOR THE FRONT-END):
    // project efficiency

    @OneToMany(()=> ProgressLog, log=> log.project)
    progressLogs?: ProgressLog[];
    
}