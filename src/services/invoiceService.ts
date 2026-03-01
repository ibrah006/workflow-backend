// src/services/InvoiceService.ts
import { Repository, DataSource, ILike, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
// import { Invoice, InvoiceStatus } from '../models/invoice';
import { InvoiceLineItem } from '../models/InvoiceLineItem';
import { Organization } from '../models/Organization';
import { AppDataSource } from '../data-source';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto, LineItemDto } from '../dtos/invoice.dto';
import { Payment } from '../models/Payment';
import { Invoice, InvoiceStatus } from '../models/Invoice';

export class InvoiceService {
  private invoiceRepo: Repository<Invoice>;
  private lineItemRepo: Repository<InvoiceLineItem>;
  private paymentRepo: Repository<Payment>;
  private organizationRepo: Repository<Organization>;

  constructor() {
    this.invoiceRepo       = AppDataSource.getRepository(Invoice);
    this.lineItemRepo      = AppDataSource.getRepository(InvoiceLineItem);
    this.paymentRepo       = AppDataSource.getRepository(Payment);
    this.organizationRepo  = AppDataSource.getRepository(Organization);
  }

  // ─── INVOICE NUMBER ────────────────────────────────────────────────────────

  private async generateInvoiceNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceRepo.count({ where: { organizationId } });
    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }

  // ─── TOTALS CALCULATOR ────────────────────────────────────────────────────

  private computeTotals(
    lineItems: LineItemDto[],
    taxRate: number,
    discountAmount: number
  ) {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount   = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
    const totalAmount = parseFloat((subtotal + taxAmount - discountAmount).toFixed(2));
    return {
      subtotal:     parseFloat(subtotal.toFixed(2)),
      taxAmount,
      totalAmount,
      amountDue:    totalAmount,
    };
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async createInvoice(
    dto: CreateInvoiceDto,
    organizationId: string,
    createdById: string
  ): Promise<Invoice> {
    // Validate organization
    const org = await this.organizationRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new Error('Organization not found');

    // Validate dates
    const issueDate = new Date(dto.issueDate);
    const dueDate   = new Date(dto.dueDate);
    if (dueDate < issueDate) {
      throw new Error('Due date cannot be before issue date');
    }

    const taxRate        = dto.taxRate ?? 5;
    const discountAmount = dto.discountAmount ?? 0;
    const { subtotal, taxAmount, totalAmount, amountDue } = this.computeTotals(
      dto.lineItems,
      taxRate,
      discountAmount
    );

    const invoiceNumber = await this.generateInvoiceNumber(organizationId);

    // Build invoice
    const invoice = this.invoiceRepo.create({
      invoiceNumber,
      clientId:       dto.clientId,
      clientName:     dto.clientName,
      clientEmail:    dto.clientEmail,
      clientAddress:  dto.clientAddress,
      clientTrn:      dto.clientTrn,
      status:         dto.status ?? InvoiceStatus.DRAFT,
      issueDate,
      dueDate,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
      amountPaid:     0,
      amountDue,
      notes:          dto.notes,
      terms:          dto.terms,
      organizationId,
      createdById,
    });

    const saved = await this.invoiceRepo.save(invoice);

    // Save line items
    await this._saveLineItems(saved.id, dto.lineItems);

    return this.getInvoiceById(saved.id, organizationId);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async updateInvoice(
    invoiceId: string,
    dto: UpdateInvoiceDto,
    organizationId: string
  ): Promise<Invoice> {
    const invoice = await this._findOrFail(invoiceId, organizationId);

    // Only draft/sent invoices can be freely edited
    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new Error(`Cannot edit a ${invoice.status} invoice`);
    }

    // Merge simple fields
    if (dto.clientId)      invoice.clientId      = dto.clientId;
    if (dto.clientName)    invoice.clientName    = dto.clientName;
    if (dto.clientEmail)   invoice.clientEmail   = dto.clientEmail;
    if (dto.clientAddress) invoice.clientAddress = dto.clientAddress;
    if (dto.clientTrn)     invoice.clientTrn     = dto.clientTrn;
    if (dto.notes  !== undefined) invoice.notes  = dto.notes;
    if (dto.terms  !== undefined) invoice.terms  = dto.terms;
    if (dto.status)        invoice.status        = dto.status;

    if (dto.issueDate) invoice.issueDate = new Date(dto.issueDate);
    if (dto.dueDate)   invoice.dueDate   = new Date(dto.dueDate);

    if (invoice.dueDate < invoice.issueDate) {
      throw new Error('Due date cannot be before issue date');
    }

    // Recompute financials if anything changed
    const lineItems      = dto.lineItems ?? await this._getLineItemDtos(invoiceId);
    const taxRate        = dto.taxRate ?? Number(invoice.taxRate);
    const discountAmount = dto.discountAmount ?? Number(invoice.discountAmount);

    const { subtotal, taxAmount, totalAmount } = this.computeTotals(
      lineItems,
      taxRate,
      discountAmount
    );

    invoice.taxRate        = taxRate;
    invoice.discountAmount = discountAmount;
    invoice.subtotal       = subtotal;
    invoice.taxAmount      = taxAmount;
    invoice.totalAmount    = totalAmount;
    invoice.amountDue      = parseFloat(
      (totalAmount - Number(invoice.amountPaid)).toFixed(2)
    );

    await this.invoiceRepo.save(invoice);

    if (dto.lineItems) {
      await this._saveLineItems(invoiceId, dto.lineItems);
    }

    return this.getInvoiceById(invoiceId, organizationId);
  }

  // ─── GET BY ID ────────────────────────────────────────────────────────────

  async getInvoiceById(invoiceId: string, organizationId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where:     { id: invoiceId, organizationId },
      relations: ['lineItems', 'payments', 'createdBy'],
      order:     { lineItems: { sortOrder: 'ASC' } },
    });

    if (!invoice) throw new Error('Invoice not found');

    // Auto-mark overdue
    if (invoice.isOverdue && invoice.status === InvoiceStatus.SENT) {
      invoice.status = InvoiceStatus.OVERDUE;
      await this.invoiceRepo.save(invoice);
    }

    return invoice;
  }

  // ─── LIST ─────────────────────────────────────────────────────────────────

  async listInvoices(
    organizationId: string,
    query: InvoiceQueryDto
  ): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const where: FindOptionsWhere<Invoice> = { organizationId };

    if (query.status)   where.status   = query.status;
    if (query.clientId) where.clientId = query.clientId;

    // Date range filter
    if (query.fromDate && query.toDate) {
      where.issueDate = Between(new Date(query.fromDate), new Date(query.toDate));
    } else if (query.fromDate) {
      where.issueDate = MoreThanOrEqual(new Date(query.fromDate));
    } else if (query.toDate) {
      where.issueDate = LessThanOrEqual(new Date(query.toDate));
    }

    const sortBy    = query.sortBy    ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    let qb = this.invoiceRepo.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.lineItems', 'lineItems')
      .leftJoinAndSelect('invoice.createdBy', 'createdBy')
      .where(where)
      .orderBy(`invoice.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);

    // Full-text search on invoiceNumber + clientName
    if (query.search) {
      const term = `%${query.search}%`;
      qb = qb.andWhere(
        '(invoice.invoiceNumber ILIKE :term OR invoice.clientName ILIKE :term)',
        { term }
      );
    }

    const [data, total] = await qb.getManyAndCount();

    // Auto-mark overdues in bulk
    const now = new Date();
    const toMark = data.filter(
      (i) =>
        i.status === InvoiceStatus.SENT &&
        new Date(i.dueDate) < now
    );
    if (toMark.length > 0) {
      await this.invoiceRepo
        .createQueryBuilder()
        .update(Invoice)
        .set({ status: InvoiceStatus.OVERDUE })
        .whereInIds(toMark.map((i) => i.id))
        .execute();
      toMark.forEach((i) => (i.status = InvoiceStatus.OVERDUE));
    }

    return { data, total, page, limit };
  }

  // ─── SEND ─────────────────────────────────────────────────────────────────

  async sendInvoice(invoiceId: string, organizationId: string): Promise<Invoice> {
    const invoice = await this._findOrFail(invoiceId, organizationId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be sent');
    }
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      throw new Error('Cannot send an invoice with no line items');
    }

    invoice.status = InvoiceStatus.SENT;
    await this.invoiceRepo.save(invoice);

    // TODO: trigger email notification
    // await emailService.sendInvoiceEmail(invoice);

    return invoice;
  }

  // ─── CANCEL ───────────────────────────────────────────────────────────────

  async cancelInvoice(invoiceId: string, organizationId: string): Promise<Invoice> {
    const invoice = await this._findOrFail(invoiceId, organizationId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Cannot cancel a paid invoice');
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Invoice is already cancelled');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    await this.invoiceRepo.save(invoice);
    return invoice;
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────

  async deleteInvoice(invoiceId: string, organizationId: string): Promise<void> {
    const invoice = await this._findOrFail(invoiceId, organizationId);

    if (invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.CANCELLED) {
      throw new Error('Only draft or cancelled invoices can be deleted');
    }

    await this.invoiceRepo.delete({ id: invoiceId });
  }

  // ─── DASHBOARD STATS ──────────────────────────────────────────────────────

  async getDashboardStats(organizationId: string): Promise<{
    totalOutstanding:    number;
    totalOverdue:        number;
    totalPaidThisMonth:  number;
    draftCount:          number;
    invoiceCount:        number;
    overdueCount:        number;
  }> {
    const now       = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const all = await this.invoiceRepo.find({ where: { organizationId } });

    const totalOutstanding = all
      .filter((i) => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED)
      .reduce((s, i) => s + Number(i.amountDue), 0);

    const totalOverdue = all
      .filter(
        (i) =>
          i.status !== InvoiceStatus.PAID &&
          i.status !== InvoiceStatus.CANCELLED &&
          new Date(i.dueDate) < now
      )
      .reduce((s, i) => s + Number(i.amountDue), 0);

    const overdueCount = all.filter(
      (i) =>
        i.status !== InvoiceStatus.PAID &&
        i.status !== InvoiceStatus.CANCELLED &&
        new Date(i.dueDate) < now
    ).length;

    const totalPaidThisMonth = all
      .filter(
        (i) =>
          i.status === InvoiceStatus.PAID &&
          new Date(i.updatedAt) >= monthStart
      )
      .reduce((s, i) => s + Number(i.amountPaid), 0);

    const draftCount   = all.filter((i) => i.status === InvoiceStatus.DRAFT).length;
    const invoiceCount = all.length;

    return {
      totalOutstanding:   parseFloat(totalOutstanding.toFixed(2)),
      totalOverdue:       parseFloat(totalOverdue.toFixed(2)),
      totalPaidThisMonth: parseFloat(totalPaidThisMonth.toFixed(2)),
      draftCount,
      invoiceCount,
      overdueCount,
    };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private async _findOrFail(invoiceId: string, organizationId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where:     { id: invoiceId, organizationId },
      relations: ['lineItems', 'payments'],
    });
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  private async _saveLineItems(invoiceId: string, items: LineItemDto[]): Promise<void> {
    // Delete existing and replace — cleanest approach for edits
    await this.lineItemRepo.delete({ invoiceId });

    const entities = items.map((item, idx) =>
      this.lineItemRepo.create({
        invoiceId,
        description: item.description,
        unit:        item.unit,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice,
        total:       parseFloat((item.quantity * item.unitPrice).toFixed(2)),
        sortOrder:   item.sortOrder ?? idx,
      })
    );

    await this.lineItemRepo.save(entities);
  }

  private async _getLineItemDtos(invoiceId: string): Promise<LineItemDto[]> {
    const items = await this.lineItemRepo.find({ where: { invoiceId } });
    return items.map((i) => ({
      id:          i.id,
      description: i.description,
      unit:        i.unit,
      quantity:    Number(i.quantity),
      unitPrice:   Number(i.unitPrice),
      sortOrder:   i.sortOrder,
    }));
  }
}