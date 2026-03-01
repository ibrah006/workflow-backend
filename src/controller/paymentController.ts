// src/controllers/PaymentController.ts
import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { RecordPaymentDto, PaymentQueryDto } from '../dtos/payment.dto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  // ─── POST /payments ────────────────────────────────────────────────────────
  // Records a payment against an invoice, auto-generates receipt number

  record = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const dto      = req.body as RecordPaymentDto;

      const payment = await this.paymentService.recordPayment(
        dto,
        user.organizationId,
        user.id
      );

      res.status(201).json({
        success: true,
        message: `Payment recorded — Receipt: ${payment?.receiptNumber}`,
        data:    payment,
      });
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── GET /payments ─────────────────────────────────────────────────────────
  // Lists all payments across the org, with optional filters

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const query    = req.query as unknown as PaymentQueryDto;
      const result   = await this.paymentService.listPayments(user.organizationId, query);

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

  // ─── GET /payments/:id ─────────────────────────────────────────────────────

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const payment  = await this.paymentService.getPaymentById(
        req.params.id,
        user.organizationId
      );

      res.status(200).json({ success: true, data: payment });
    } catch (err: any) {
      const status = err.message === 'Payment not found' ? 404 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── GET /invoices/:invoiceId/payments ─────────────────────────────────────
  // All payments for a specific invoice

  listForInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const payments = await this.paymentService.getPaymentsForInvoice(
        req.params.invoiceId,
        user.organizationId
      );

      res.status(200).json({ success: true, data: payments });
    } catch (err: any) {
      const status = err.message === 'Invoice not found' ? 404 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── DELETE /payments/:id ──────────────────────────────────────────────────
  // Deletes a payment and rolls back invoice status accordingly

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      await this.paymentService.deletePayment(req.params.id, user.organizationId);

      res.status(200).json({ success: true, message: 'Payment deleted and invoice recalculated' });
    } catch (err: any) {
      const status = err.message === 'Payment not found' ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  };

  // ─── GET /payments/summary ─────────────────────────────────────────────────

  getSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user }               = req as AuthenticatedRequest;
      const { fromDate, toDate }   = req.query as { fromDate?: string; toDate?: string };

      const summary = await this.paymentService.getPaymentSummary(
        user.organizationId,
        fromDate,
        toDate
      );

      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}