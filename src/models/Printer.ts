import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Organization } from "./Organization";
import { Task } from "./Task";

export enum PrinterStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    MAINTENANCE = 'maintenance',
    OFFLINE = 'offline',
  }
  
  @Entity('printers')
  export class Printer {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    name!: string;                 // Example: “HP Latex 365”
  
    @Column()
    nickname!: string;             // Example: “Front Desk Wide”
  
    @Column({ nullable: true })
    location?: string;             // Optional e.g. "Warehouse A"
  
    @Column({
      type: 'enum',
      enum: PrinterStatus,
      default: PrinterStatus.ACTIVE
    })
    status!: PrinterStatus;
  
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    maxWidth?: number;             // Maximum printable width in meters/inches
  
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    printSpeed?: number;           // Sq m per hour / linear m per min (whatever you standardize)
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;

    @Column()
    organizationId!: string;

    @ManyToOne(() => Organization, (org)=> org.printers)
    @JoinColumn({ name: 'organizationId' })
    organization!: Organization;

    @Column({nullable: true})
    currentTaskId?: string;

    @ManyToOne(() => Task)
    @JoinColumn({ name: 'currentTaskId' })
    currentTask?: Task;

    // All the tasks done on this printer
    @OneToMany(()=> Task, (task)=> task.printer)
    tasks!: Task[];

  }
  