import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";


@Entity()
export class LayoffLog {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'timestamp' })
    start!: Date;

    @Column({ type: 'timestamp', nullable: true })
    end?: Date | null;

    @ManyToOne(()=> User, (user)=> user.layoffLogs)
    user!: User;

}