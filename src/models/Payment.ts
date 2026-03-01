// src/entities/Payment.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Invoice } from './invoice';
  import { User } from './User';
  
  export enum PaymentMethod {
    BANK_TRANSFER = 'bank_transfer',
    CARD          = 'card',
    CASH          = 'cash',
    CHEQUE        = 'cheque',
    OTHER         = 'other',
  }
  
  @Entity('payments')
  export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ unique: true })
    receiptNumber!: string; // e.g. REC-2024-0001
  
    // ─── INVOICE ───────────────────────────────────────────────────────────────
  
    @Column()
    invoiceId!: string;
  
    @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'invoiceId' })
    invoice!: Invoice;
  
    // ─── FINANCIALS ────────────────────────────────────────────────────────────
  
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount!: number;
  
    @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.BANK_TRANSFER })
    method!: PaymentMethod;
  
    @Column({ nullable: true })
    reference?: string; // bank transaction ref, cheque number, etc.
  
    @Column({ nullable: true, type: 'text' })
    notes?: string;
  
    @Column({ type: 'date' })
    paidAt!: Date;
  
    // ─── RECORDED BY ───────────────────────────────────────────────────────────
  
    @Column({ nullable: true })
    recordedById!: string;
  
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'recordedById' })
    recordedBy?: User;
  
    // ─── TIMESTAMPS ────────────────────────────────────────────────────────────
  
    @CreateDateColumn()
    createdAt1!: Date;
  }