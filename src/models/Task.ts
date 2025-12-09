import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { WastageLog } from "./WastageLog";
import { Message } from "./Message";
import { WorkActivityLog } from "./WorkActivityLog";
import { MaterialLog } from "./MaterialLog";
import { ProgressLog } from "./ProgressLog";
import { Printer } from "./Printer";
import { Material } from "./Material";

@Entity()
export class Task {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @ManyToOne(()=> Project, (project)=> project.tasks)
    project!: Project;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'timestamp', nullable: true })
    dueDate?: Date;

    @ManyToMany(()=> User, (user)=> user.tasks)
    @JoinTable()
    assignees!: User[];

    @Column({ type: 'timestamptz', nullable: true })
    assigneesLastAdded?: Date | null;

    @Column({ default: "pending" })
    status!: string;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    workActivityLogsLastModifiedAt?: Date | null;

    // List of IDs of InvoiceItems 
    @OneToMany(()=> WastageLog, (log)=> log.task)
    wastageLog?: WastageLog[];

    @Column({ type: 'date', nullable: true })
    dateCompleted?: Date;

    @OneToMany(()=> Message, (message)=> message.task, {
        cascade: ['remove'],
        onDelete: 'CASCADE'
    })
    discussionThreads!: Message[];

    @ManyToMany(() => ProgressLog, { nullable: false })
    progressLogs!: ProgressLog[];

    // The printer that this job(task) was completed on
    @Column()
    printerId!: string;

    @ManyToOne(() => Printer, (printer)=> printer.tasks)
    @JoinColumn({ name: 'printer' })
    printer!: Printer;

    // Repeat of this task - How many times this task is supposed to repeat
    @Column({ default: 1 })
    runs!: number;

    // Production Duration in minutes
    @Column({ nullable: true })
    productionDuration?: number;

    // All the Material logs initiated for this task
    // @OneToMany(()=> MaterialLog, (log)=> log.task)
    // materialLogs!: MaterialLog[];

    @Column()
    materialId!: string;

    // Material used for this task
    @ManyToOne(()=> Material)
    @JoinColumn({ name: 'materialId' })
    material!: Material[];

    // derived attributes (NOTE FOR THE FRONT-END):
    // task efficiency


    // Other relations

    // All the work activity logs by all users, checking into this task
    @OneToMany(()=> WorkActivityLog, (log)=> log.task)
    workActivityLogs?: WorkActivityLog[];

}