// src/entities/Material.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from './Organization';
import { User } from './User';
import { StockTransaction } from './StockTransaction';

export enum MeasureType {
  RUNNING_METER = 'running_meter',
  ITEM_QUANTITY = 'item_quantity',
  LITERS = 'liters',
  KILOGRAMS = 'kilograms',
  SQUARE_METER = 'square_meter',
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', nullable: true })
  materialNumber!: number;

  @Column({ nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: MeasureType,
  })
  measureType!: MeasureType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentStock!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minStockLevel!: number;

  @Column()
  organizationId!: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column()
  createdById!: string;

  @Column()
  barcode!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @OneToMany(() => StockTransaction, (transaction) => transaction.material)
  transactions!: StockTransaction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}



