import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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
  }
  