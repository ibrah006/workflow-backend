import { Column, Entity, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Task } from "./Task";
import { LayoffLog } from "./LayoffLog";

@Entity()
export class WorkActivityLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(()=> User, (user)=> user.workActivityLogs)
    user!: User;

    @ManyToOne(()=> Task, (task)=> task.workActivityLogs, { onDelete: 'SET NULL', nullable: true })
    task!: Task | null;
    
    @Column({ type: 'timestamp' })
    start!: Date;

    @Column({ type: 'timestamp', nullable: true })
    end!: Date | null;
}