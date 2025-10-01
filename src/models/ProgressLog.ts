import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Project } from "./Project";


@Entity() 
export class ProgressLog {

    @PrimaryColumn("uuid")
    id!: string;

    @ManyToOne(()=> Project, project=> project.progressLogs)
    project!: Project;

    @Column()
    status!: string;

    @Column({ default: false })
    isCompleted?: boolean;

    @Column({nullable: true})
    description?: string;

    @Column({ nullable: true })
    issue?: string;

    @Column("date", { nullable: true })
    dueDate?: Date;

    @Column({
        type: 'date',
        default: () => 'CURRENT_DATE',
    })
    startDate!: string; // or Date — both work, but string avoids timezone confusion    

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @Column({ type: 'timestamptz', nullable: true, name: "completedAt" })
    completedAt?: Date | null;
}