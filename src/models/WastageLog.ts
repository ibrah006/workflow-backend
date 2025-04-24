import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Task } from "./Task";

@Entity()
export class WastageLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    invoiceItemId!: string;
    // wastage of invoice item per measuring units
    @Column('decimal')
    wastage!: number;

    // Other attributes

    // The task associated with this material wastage
    @ManyToOne(()=> Task, (task)=> task.wastageLog, { onDelete: 'SET NULL' })
    task!: Task;
}