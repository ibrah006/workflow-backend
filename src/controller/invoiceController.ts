// src/controllers/InvoiceController.ts
import { Request, Response } from 'express';
import { InvoiceService } from '../services/invoiceService';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from '../dto/invoice.dto';

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  // ─── POST /invoices ────────────────────────────────────────────────────────
  // Creates a new invoice (draft or sent)

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const dto = req.body as CreateInvoiceDto;

      const invoice = await this.invoiceService.createInvoice(
        dto,
        user.organizationId,
        user.id
      );

      res.status(201).json({
        success: true,
        message: `Invoice ${invoice.invoiceNumber} created`,
        data:    invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // ─── GET /invoices ─────────────────────────────────────────────────────────
  // Lists invoices for the org with filtering, search, and pagination

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user }   = req as AuthenticatedRequest;
      const query      = req.query as unknown as InvoiceQueryDto;
      const result     = await this.invoiceService.listInvoices(user.organizationId, query);

      res.status(200).json({
        success: true,
        data:    result.data,
        meta: {
          total: result.total,
          page:  result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  // ─── GET /invoices/:id ─────────────────────────────────────────────────────

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const invoice  = await this.invoiceService.getInvoiceById(
        req.params.id,
        user.organizationId
      );

      res.status(200).json({ success: true, data: invoice });
    } catch (err: any) {
      const status = err.message === 'Invoice not found' ? 404 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── PATCH /invoices/:id ───────────────────────────────────────────────────

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const dto      = req.body as UpdateInvoiceDto;

      const invoice = await this.invoiceService.updateInvoice(
        req.params.id,
        dto,
        user.organizationId
      );

      res.status(200).json({
        success: true,
        message: 'Invoice updated',
        data:    invoice,
      });
    } catch (err: any) {
      const status = err.message === 'Invoice not found' ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── POST /invoices/:id/send ───────────────────────────────────────────────

  send = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const invoice  = await this.invoiceService.sendInvoice(
        req.params.id,
        user.organizationId
      );

      res.status(200).json({
        success: true,
        message: `Invoice ${invoice.invoiceNumber} marked as sent`,
        data:    invoice,
      });
    } catch (err: any) {
      const status = err.message === 'Invoice not found' ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── POST /invoices/:id/cancel ─────────────────────────────────────────────

  cancel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const invoice  = await this.invoiceService.cancelInvoice(
        req.params.id,
        user.organizationId
      );

      res.status(200).json({
        success: true,
        message: `Invoice ${invoice.invoiceNumber} cancelled`,
        data:    invoice,
      });
    } catch (err: any) {
      const status = err.message === 'Invoice not found' ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── DELETE /invoices/:id ──────────────────────────────────────────────────

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      await this.invoiceService.deleteInvoice(req.params.id, user.organizationId);

      res.status(200).json({ success: true, message: 'Invoice deleted' });
    } catch (err: any) {
      const status = err.message === 'Invoice not found' ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── GET /invoices/stats ───────────────────────────────────────────────────

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const stats    = await this.invoiceService.getDashboardStats(user.organizationId);

      res.status(200).json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}