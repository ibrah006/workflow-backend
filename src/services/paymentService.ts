// src/services/PaymentService.ts
import { Repository } from 'typeorm';
import { Payment, PaymentMethod } from '../models/payment';
import { Invoice, InvoiceStatus } from '../models/invoice';
import { AppDataSource } from '../data-source';
import { RecordPaymentDto, PaymentQueryDto } from '../dtos/payment.dto';

export class PaymentService {
  private paymentRepo: Repository<Payment>;
  private invoiceRepo: Repository<Invoice>;

  constructor() {
    this.paymentRepo = AppDataSource.getRepository(Payment);
    this.invoiceRepo = AppDataSource.getRepository(Invoice);
  }

  // ─── RECEIPT NUMBER ───────────────────────────────────────────────────────

  private async generateReceiptNumber(): Promise<string> {
    const year  = new Date().getFullYear();
    const count = await this.paymentRepo.count();
    const seq   = String(count + 1).padStart(4, '0');
    return `REC-${year}-${seq}`;
  }

  // ─── RECORD PAYMENT ───────────────────────────────────────────────────────

  async recordPayment(
    dto: RecordPaymentDto,
    organizationId: string,
    recordedById: string
  ): Promise<Payment | null> {
    // Fetch and validate invoice
    const invoice = await this.invoiceRepo.findOne({
      where: { id: dto.invoiceId, organizationId },
    });

    if (!invoice) throw new Error('Invoice not found');

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot record payment for a cancelled invoice');
    }
    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new Error('Cannot record payment for a draft invoice — send it first');
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Invoice is already fully paid');
    }

    const amount    = parseFloat(Number(dto.amount).toFixed(2));
    const amountDue = parseFloat(Number(invoice.amountDue).toFixed(2));

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    if (amount > amountDue + 0.01) {
      // Allow tiny float tolerance
      throw new Error(
        `Payment amount (AED ${amount}) exceeds balance due (AED ${amountDue})`
      );
    }

    const receiptNumber = await this.generateReceiptNumber();

    // Create payment record
    const payment = this.paymentRepo.create({
      receiptNumber,
      invoiceId:    dto.invoiceId,
      amount,
      method:       dto.method,
      reference:    dto.reference,
      notes:        dto.notes,
      paidAt:       new Date(dto.paidAt),
      recordedById,
    });

    await this.paymentRepo.save(payment);

    // ── Recalculate invoice ─────────────────────────────────────────────────
    await this._recalculateInvoice(invoice);

    // Return payment with invoice relation loaded
    return this.paymentRepo.findOne({
      where:     { id: payment.id },
      relations: ['invoice', 'recordedBy'],
    });
  }

  // ─── GET PAYMENTS FOR INVOICE ─────────────────────────────────────────────

  async getPaymentsForInvoice(
    invoiceId: string,
    organizationId: string
  ): Promise<Payment[]> {
    // Verify invoice belongs to org
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, organizationId },
    });
    if (!invoice) throw new Error('Invoice not found');

    return this.paymentRepo.find({
      where:     { invoiceId },
      relations: ['recordedBy'],
      order:     { paidAt: 'DESC' },
    });
  }

  // ─── LIST ALL PAYMENTS ────────────────────────────────────────────────────

  async listPayments(
    organizationId: string,
    query: PaymentQueryDto
  ): Promise<{ data: Payment[]; total: number; page: number; limit: number }> {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    // Join through invoice to filter by organizationId
    let qb = this.paymentRepo
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice', 'invoice.organizationId = :organizationId', {
        organizationId,
      })
      .leftJoinAndSelect('payment.invoice', 'inv')
      .leftJoinAndSelect('payment.recordedBy', 'recordedBy')
      .orderBy('payment.paidAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.invoiceId) {
      qb = qb.andWhere('payment.invoiceId = :invoiceId', { invoiceId: query.invoiceId });
    }
    if (query.method) {
      qb = qb.andWhere('payment.method = :method', { method: query.method });
    }
    if (query.fromDate) {
      qb = qb.andWhere('payment.paidAt >= :fromDate', { fromDate: new Date(query.fromDate) });
    }
    if (query.toDate) {
      qb = qb.andWhere('payment.paidAt <= :toDate', { toDate: new Date(query.toDate) });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ─── GET BY ID ────────────────────────────────────────────────────────────

  async getPaymentById(paymentId: string, organizationId: string): Promise<Payment> {
    const payment = await this.paymentRepo
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice', 'invoice.organizationId = :organizationId', {
        organizationId,
      })
      .leftJoinAndSelect('payment.invoice', 'inv')
      .leftJoinAndSelect('payment.recordedBy', 'recordedBy')
      .where('payment.id = :paymentId', { paymentId })
      .getOne();

    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  // ─── DELETE PAYMENT ───────────────────────────────────────────────────────

  async deletePayment(paymentId: string, organizationId: string): Promise<void> {
    const payment = await this.paymentRepo
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice', 'invoice.organizationId = :organizationId', {
        organizationId,
      })
      .leftJoinAndSelect('payment.invoice', 'inv')
      .where('payment.id = :paymentId', { paymentId })
      .getOne();

    if (!payment) throw new Error('Payment not found');

    await this.paymentRepo.delete({ id: paymentId });

    // Recalculate the invoice after deletion
    const invoice = await this.invoiceRepo.findOne({
      where: { id: payment.invoiceId },
    });
    if (invoice) {
      await this._recalculateInvoice(invoice);
    }
  }

  // ─── PAYMENT SUMMARY ──────────────────────────────────────────────────────

  async getPaymentSummary(
    organizationId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<{
    totalCollected:    number;
    paymentCount:      number;
    byMethod:          Record<string, number>;
  }> {
    let qb = this.paymentRepo
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice', 'invoice.organizationId = :organizationId', {
        organizationId,
      });

    if (fromDate) qb = qb.andWhere('payment.paidAt >= :from', { from: new Date(fromDate) });
    if (toDate)   qb = qb.andWhere('payment.paidAt <= :to',   { to:   new Date(toDate) });

    const payments = await qb.getMany();

    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const byMethod: Record<string, number> = {};

    for (const p of payments) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);
    }

    return {
      totalCollected: parseFloat(totalCollected.toFixed(2)),
      paymentCount:   payments.length,
      byMethod,
    };
  }

  // ─── PRIVATE: RECALCULATE INVOICE ────────────────────────────────────────

  private async _recalculateInvoice(invoice: Invoice): Promise<void> {
    const allPayments = await this.paymentRepo.find({
      where: { invoiceId: invoice.id },
    });

    const totalPaid = parseFloat(
      allPayments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)
    );
    const totalAmount = parseFloat(Number(invoice.totalAmount).toFixed(2));
    const amountDue   = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

    let newStatus: InvoiceStatus;
    if (amountDue <= 0) {
      newStatus = InvoiceStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    } else if (
      invoice.status === InvoiceStatus.PARTIALLY_PAID ||
      invoice.status === InvoiceStatus.PAID
    ) {
      // Payment was deleted — revert to sent or overdue
      newStatus =
        new Date(invoice.dueDate) < new Date()
          ? InvoiceStatus.OVERDUE
          : InvoiceStatus.SENT;
    } else {
      newStatus = invoice.status;
    }

    await this.invoiceRepo.update(invoice.id, {
      amountPaid: totalPaid,
      amountDue,
      status:     newStatus,
    });
  }
}