import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { WastageLog } from "./WastageLog";
import { Message } from "./Message";
import { WorkActivityLog } from "./WorkActivityLog";
import { MaterialLog } from "./MaterialLog";


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

    @Column({ type: 'timestamp' })
    dueDate!: Date;

    @ManyToMany(()=> User, (user)=> user.tasks)
    @JoinTable()
    assignees!: User[];

    @Column()
    status!: string;

    // IDs of Stock Entries that have been use in the project
    @OneToMany(()=> MaterialLog, (log)=> log.materialsUsedTask)
    materialsUsed?: MaterialLog[];

    // IDs of Stock Entries that have been use in the project
    @OneToMany(()=> MaterialLog, (log)=> log.materialsEstimatedTask)
    materialsEstimated?: MaterialLog[];

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

    // All the Material logs initiated for this task
    // @OneToMany(()=> MaterialLog, (log)=> log.task)
    // materialLogs!: MaterialLog[];

    // derived attributes (NOTE FOR THE FRONT-END):
    // task efficiency


    // Other relations

    // All the work activity logs by all users, checking into this task
    @OneToMany(()=> WorkActivityLog, (log)=> log.task)
    workActivityLogs?: WorkActivityLog[];

}