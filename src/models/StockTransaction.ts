// src/entities/StockTransaction.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Material } from './Material';
  import { User } from './User';
  import { Project } from './Project';
  
  export enum TransactionType {
    STOCK_IN = 'stock_in',
    STOCK_OUT = 'stock_out',
    ADJUSTMENT = 'adjustment',
  }
  
  @Entity('stock_transactions')
  export class StockTransaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    materialId!: string;
  
    @ManyToOne(() => Material, (material) => material.transactions)
    @JoinColumn({ name: 'materialId' })
    material!: Material;
  
    @Column({
      type: 'enum',
      enum: TransactionType,
    })
    type!: TransactionType;
  
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    quantity!: number;
  
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    balanceAfter!: number;
  
    @Column({ nullable: true })
    barcode?: string;
  
    @Column({ type: 'text', nullable: true })
    notes?: string;
  
    @Column({ nullable: true })
    projectId!: string;
  
    @ManyToOne(() => Project, { nullable: true })
    @JoinColumn({ name: 'projectId' })
    project!: Project;
  
    @Column()
    createdById!: string;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdById' })
    createdB!: User;
  
    @CreateDateColumn()
    createdAt!: Date;
  }