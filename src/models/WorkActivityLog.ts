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

    @ManyToOne(()=> Task, (task)=> task.workActivityLogs)
    task!: Task;
    
    @Column({ type: 'date' })
    start!: Date;

    @Column({ type: 'date', nullable: true })
    end!: Date | undefined;
}