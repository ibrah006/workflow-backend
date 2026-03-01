// src/entities/InvoiceLineItem.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Invoice } from './invoice';
  
  @Entity('invoice_line_items')
  export class InvoiceLineItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    invoiceId!: string;
  
    @ManyToOne(() => Invoice, (invoice) => invoice.lineItems, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'invoiceId' })
    invoice!: Invoice;
  
    @Column({ type: 'text' })
    description!: string;
  
    @Column({ nullable: true })
    unit?: string; // e.g. hrs, pcs, days
  
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
    quantity!: number;
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    unitPrice!: number;
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total!: number; // quantity * unitPrice — stored for denormalized reads
  
    @Column({ type: 'int', default: 0 })
    sortOrder!: number;
  }