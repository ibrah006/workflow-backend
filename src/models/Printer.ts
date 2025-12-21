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

    @Column({ default: 0 })
    workMinutes!: number;

    @Column({ default: 0 })
    maintenanceMinutes!: number;

    // Scheduled minutes for a single day
    // default: 8 hours (480 minutes)
    @Column({ default: 480 })
    scheduledMinutes!: number;

    @ManyToOne(() => Organization, (org)=> org.printers)
    @JoinColumn({ name: 'organizationId' })
    organization!: Organization;

    @Column({nullable: true})
    currentTaskId?: number | null;

    @ManyToOne(() => Task)
    @JoinColumn({ name: 'currentTaskId' })
    currentTask?: Task;

    @Column({ type: 'timestamptz', nullable: true })
    statusLastUpdatedAt?: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    taskAssignedAt?: Date | null;

    // All the tasks done on this printer
    @OneToMany(()=> Task, (task)=> task.printer)
    tasks!: Task[];

    getEffectiveWorkMinutes(): number {
      let total = this.workMinutes;
  
      if (this.currentTaskId && this.taskAssignedAt) {
        const now = Date.now();
        const diffMs = now - this.taskAssignedAt.getTime();
        total += Math.floor(diffMs / 60000);
      }
  
      return total;
    }
  
    getEffectiveMaintenanceMinutes(): number {
      let total = this.maintenanceMinutes;
  
      if (
        this.status === PrinterStatus.MAINTENANCE &&
        this.statusLastUpdatedAt
      ) {
        const now = Date.now();
        const diffMs = now - this.statusLastUpdatedAt.getTime();
        total += Math.floor(diffMs / 60000);
      }
  
      return total;
    }

  }
  