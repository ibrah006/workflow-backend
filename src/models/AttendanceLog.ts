import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class AttendanceLog {

    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(()=> User, (user)=> user.attendanceLog)
    user!: User;

    @Column({ type: 'date' })
    checkIn!: Date;

    @Column({ type: 'date' })
    checkOut?: Date | undefined;

    // @Column()
    // reason!: string;

}