// src/routes/invoice.routes.ts
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { InvoiceController } from '../controller/invoiceController';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { PaymentController } from '../controller/paymentController';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from '../dtos/invoice.dto';

const router            = Router();
const invoiceController = new InvoiceController();
const paymentController = new PaymentController();

// All invoice routes require authentication
router.use(authenticate);

// ─── STATS — must come before /:id to avoid route collision ──────────────────
// GET /invoices/stats
router.get('/stats', invoiceController.getStats);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// GET    /invoices
router.get(
  '/',
  validateQuery(InvoiceQueryDto),
  invoiceController.list
);

// POST   /invoices
router.post(
  '/',
  validateBody(CreateInvoiceDto),
  invoiceController.create
);

// GET    /invoices/:id
router.get('/:id', invoiceController.getById);

// PATCH  /invoices/:id
router.patch(
  '/:id',
  validateBody(UpdateInvoiceDto),
  invoiceController.update
);

// DELETE /invoices/:id
router.delete(
  '/:id',
  requireRole('admin', 'accountant'),
  invoiceController.delete
);

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

// POST   /invoices/:id/send
router.post('/:id/send', invoiceController.send);

// POST   /invoices/:id/cancel
router.post('/:id/cancel', requireRole('admin', 'accountant'), invoiceController.cancel);

// ─── NESTED PAYMENTS ──────────────────────────────────────────────────────────

// GET    /invoices/:invoiceId/payments
router.get('/:invoiceId/payments', paymentController.listForInvoice);

export default router;