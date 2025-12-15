import { Column, CreateDateColumn, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Project } from "./Project";
import { Task } from "./Task";


@Entity() 
export class ProgressLog {

    @PrimaryColumn("uuid")
    id!: string;

    @ManyToOne(() => Project, project => project.progressLogs, { nullable: false })
    @JoinColumn({ name: "projectId" })
    project!: Project;

    @Column()
    projectId!: string;

    @Column()
    status!: string;

    @Column({ default: false })
    isCompleted?: boolean;

    @Column({nullable: true})
    description?: string;

    @Column({ nullable: true })
    issue?: string;

    @Column("date", { nullable: true })
    dueDate?: Date;

    @Column({
        type: 'date',
        default: () => 'CURRENT_DATE',
    })
    startDate!: string; // or Date — both work, but string avoids timezone confusion    

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @Column({ type: 'timestamptz', nullable: true, name: "completedAt" })
    completedAt?: Date | null;

    // @ManyToOne(() => Task, (task)=> task.progressLogs, { nullable: false })
    // task!: Task;

    @ManyToMany(() => Task, (task)=> task.progressLogs)
    tasks!: Task[];
}