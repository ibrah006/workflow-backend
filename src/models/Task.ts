import { BeforeUpdate, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { WastageLog } from "./WastageLog";
import { Message } from "./Message";
import { WorkActivityLog } from "./WorkActivityLog";
import { MaterialLog } from "./MaterialLog";
import { ProgressLog } from "./ProgressLog";
import { Printer } from "./Printer";
import { Material } from "./Material";
import { StockTransaction } from "./StockTransaction";

@Entity()
export class Task {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @ManyToOne(()=> Project, (project)=> project.tasks)
    project!: Project;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'timestamp', nullable: true })
    dueDate?: Date;

    @ManyToMany(()=> User, (user)=> user.tasks)
    @JoinTable()
    assignees!: User[];

    @Column({ type: 'timestamptz', nullable: true })
    assigneesLastAdded?: Date | null;

    @Column({ default: "pending" })
    status!: string;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    workActivityLogsLastModifiedAt?: Date | null;

    // List of IDs of InvoiceItems 
    @OneToMany(()=> WastageLog, (log)=> log.task)
    wastageLog?: WastageLog[];

    @Column({ type: 'date', nullable: true })
    dateCompleted?: Date;

    @OneToMany(()=> Message, (message)=> message.task, {
        cascade: ['remove'],
        onDelete: 'CASCADE'
    })
    discussionThreads!: Message[];

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    completedAt!: Date;

    @ManyToMany(() => ProgressLog, (log)=> log.tasks)
    @JoinTable()
    progressLogs!: ProgressLog[];

    // The printer that this job(task) was completed on
    @Column("character varying", { nullable: true })
    printerId?: string | null;

    @ManyToOne(() => Printer, (printer)=> printer.tasks, { nullable: true })
    @JoinColumn({ name: 'printerId' })
    printer?: Printer;

    // Repeat of this task - How many times this task is supposed to repeat
    @Column({ default: 1 })
    runs!: number;

    // Estimated production duration in minutes
    @Column({ nullable: true })
    productionDuration?: number;

    // Estimated start time
    @Column({ type: 'timestamptz', nullable: true })
    productionStartTime?: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    actualProductionStartTime?: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    actualProductionEndTime?: Date | null;

    /**
     * @deprecated
     */
    @Column({ type: 'decimal', nullable: true })
    productionQuantity?: number;

    // All the Material logs initiated for this task
    // @OneToMany(()=> MaterialLog, (log)=> log.task)
    // materialLogs!: MaterialLog[];
    
    @Column({ nullable: true })
    materialId?: string;

    // Material used for this task
    @ManyToOne(()=> Material)
    @JoinColumn({ name: 'materialId' })
    material!: Material;

    @Column({ default: 1 })
    priority!: number;

    @Column({ nullable: true })
    stockTransactionId!: string;
  
    @OneToOne(() => StockTransaction, (stockTransaction)=> stockTransaction.task, { nullable: true })
    @JoinColumn({ name: 'stockTransactionId' })
    stockTransaction!: StockTransaction;

    // derived attributes (NOTE FOR THE FRONT-END):
    // task efficiency


    // Other relations

    // All the work activity logs by all users, checking into this task
    @OneToMany(()=> WorkActivityLog, (log)=> log.task)
    workActivityLogs?: WorkActivityLog[];

    @BeforeUpdate()
    updateCompletedAt() {
        // Only set completedAt if status is changing to 'completed' AND completedAt is not already set
        if (this.status === 'completed' && !this.completedAt) {
            this.completedAt = new Date();
        }
    }

}