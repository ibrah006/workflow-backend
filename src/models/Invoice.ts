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
  import { InvoiceLineItem } from './InvoicelineItem'
import { Payment } from './Payment';
  
  export enum InvoiceStatus {
    DRAFT          = 'draft',
    SENT           = 'sent',
    PAID           = 'paid',
    PARTIALLY_PAID = 'partially_paid',
    OVERDUE        = 'overdue',
    CANCELLED      = 'cancelled',
  }
  
  @Entity('invoices')
  export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ unique: true })
    invoiceNumber!: string;
  
    // ─── CLIENT ────────────────────────────────────────────────────────────────
  
    @Column()
    clientId!: string;
  
    @Column()
    clientName!: string;
  
    @Column({ nullable: true })
    clientEmail?: string;
  
    @Column({ nullable: true, type: 'text' })
    clientAddress?: string;
  
    @Column({ nullable: true })
    clientTrn?: string; // UAE VAT Tax Registration Number
  
    // ─── STATUS & DATES ────────────────────────────────────────────────────────
  
    @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
    status!: InvoiceStatus;
  
    @Column({ type: 'date' })
    issueDate!: Date;
  
    @Column({ type: 'date' })
    dueDate!: Date;
  
    // ─── FINANCIALS ────────────────────────────────────────────────────────────
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal!: number;
  
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 5 })
    taxRate!: number; // VAT — default 5% (UAE)
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    taxAmount!: number;
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    discountAmount!: number;
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalAmount!: number;
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    amountPaid!: number;
  
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    amountDue!: number;
  
    // ─── NOTES ─────────────────────────────────────────────────────────────────
  
    @Column({ nullable: true, type: 'text' })
    notes?: string;
  
    @Column({ nullable: true, type: 'text' })
    terms?: string;
  
    // ─── RELATIONS ─────────────────────────────────────────────────────────────
  
    @Column()
    organizationId!: string;
  
    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organizationId' })
    organization!: Organization;
  
    @Column()
    createdById!: string;
  
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'createdById' })
    createdBy!: User;
  
    @OneToMany(() => InvoiceLineItem, (item) => item.invoice, { cascade: true })
    lineItems!: InvoiceLineItem[];
  
    @OneToMany(() => Payment, (payment) => payment.invoice)
    payments!: Payment[];
  
    // ─── TIMESTAMPS ────────────────────────────────────────────────────────────
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  
    // ─── COMPUTED ──────────────────────────────────────────────────────────────
  
    get isOverdue(): boolean {
      return (
        this.status !== InvoiceStatus.PAID &&
        this.status !== InvoiceStatus.CANCELLED &&
        new Date() > new Date(this.dueDate)
      );
    }
  }