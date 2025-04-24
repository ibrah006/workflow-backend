import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class AttendanceLog {

    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(()=> User, (user)=> user.attendanceLogs)
    user!: User;

    @Column({ type: 'timestamp' })
    checkIn!: Date;

    @Column({ type: 'timestamp', nullable: true, default: null })
    checkOut?: Date | null;

    // @Column()
    // reason!: string;
}