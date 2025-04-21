import { Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

export class Message {
    @PrimaryGeneratedColumn()
    id!: number;

    @OneToMany(()=> User, (user)=> user.messages)
    user!: User;

    @Column()
    message!: string;

    @Column({ type: 'date' })
    date!: Date;
}