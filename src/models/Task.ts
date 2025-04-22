import { Column, Entity, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { WastageLog } from "./WastageLog";
import { Message } from "./Message";
import { WorkActivityLog } from "./WorkActivityLog";


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
    assignees!: User[];

    @Column()
    status!: string;

    // IDs of Stock Entries that have been use in the project
    @Column('text', { array: true })
    materialsUsed!: string[];

    // List of IDs of InvoiceItems 
    @OneToMany(()=> WastageLog, (log)=> log.task)
    wastageLog?: WastageLog[];

    @Column({ type: 'date', nullable: true })
    dateCompleted?: Date;

    @OneToMany(()=> Message, (message)=> message.task)
    discussionThreads!: Message[];

    // derived attributes (NOTE FOR THE FRONT-END):
    // task efficiency


    // Other relations

    // All the work activity logs by all users, checking into this task
    @OneToMany(()=> WorkActivityLog, (log)=> log.task)
    workActivityLogs?: WorkActivityLog[];

}