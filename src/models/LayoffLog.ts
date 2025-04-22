import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { WorkActivityLog } from "./WorkActivityLog";
import { User } from "./User";


@Entity()
export class LayoffLog {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'date' })
    start!: Date;

    @Column({ type: 'date' })
    end!: Date;

    @ManyToOne(()=> User, (user)=> user.layoffLogs)
    user!: User;

}