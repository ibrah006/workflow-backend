// src/routes/payment.routes.ts
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { PaymentController } from '../controller/paymentController';
import { RecordPaymentDto, PaymentQueryDto } from '../dtos/payment.dto';

const router            = Router();
const paymentController = new PaymentController();

router.use(authenticate);

// ─── SUMMARY — must come before /:id ─────────────────────────────────────────
// GET /payments/summary
router.get('/summary', paymentController.getSummary);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// GET  /payments
router.get(
  '/',
  validateQuery(PaymentQueryDto),
  paymentController.list
);

// POST /payments
router.post(
  '/',
  validateBody(RecordPaymentDto),
  paymentController.record
);

// GET  /payments/:id
router.get('/:id', paymentController.getById);

// DELETE /payments/:id
router.delete(
  '/:id',
  requireRole('admin', 'accountant'),
  paymentController.delete
);

export default router;