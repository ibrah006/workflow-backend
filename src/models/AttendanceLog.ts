import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class AttendanceLog {

    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(()=> User, (user)=> user.attendanceLogs)
    user!: User;

    @Column({ type: 'date' })
    checkIn!: Date;

    @Column({ type: 'date', nullable: true, default: null })
    checkOut?: Date | null;

    // @Column()
    // reason!: string;
}