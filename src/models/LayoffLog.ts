import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { WorkActivityLog } from "./WorkActivityLog";


@Entity()
export class LayoffLog {

    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToMany(()=> WorkActivityLog, (workActivityLog)=> workActivityLog.layoffLogs)
    workActivityLogs!: WorkActivityLog;

    @Column({ type: 'date' })
    start!: Date;

    @Column({ type: 'date' })
    end!: Date;

}