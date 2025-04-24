import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Task } from "./Task";

@Entity()
export class Message {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(()=> User, (user)=> user.messages)
    user!: User;

    @Column()
    message!: string;

    @Column({ type: 'date' })
    date!: Date;

    @ManyToOne(()=> Task, (task)=> task.discussionThreads, {
        onDelete: 'CASCADE'
    })
    task!: Task;
}