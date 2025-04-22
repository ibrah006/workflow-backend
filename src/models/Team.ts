import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Team {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    description!: string;

    @OneToMany(()=> User, (user)=> user.department)
    members!: User[];

    @ManyToOne(()=> User, (user)=> user)
    createdBy!: User;

    @CreateDateColumn()
    createdAt!: Date;
}