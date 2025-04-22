import { Column, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

export class Message {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(()=> User, (user)=> user.messages)
    user!: User;

    @Column()
    message!: string;

    @Column({ type: 'date' })
    date!: Date;
}