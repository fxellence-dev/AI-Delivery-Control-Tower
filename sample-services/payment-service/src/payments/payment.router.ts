/**
 * Payment HTTP routes.
 * Per .claude/rules/typescript.md: validate all inputs with Zod.
 * Per .claude/rules/payments.md: idempotency-key required for payment creation.
 * Per CLAUDE.md: API versioned at /v1/ in URL path.
 */

import { Router, type Request, type Response } from 'express';
import { CreatePaymentSchema, RefundPaymentSchema } from './payment.types';
import { PaymentService } from './payment.service';
import { InMemoryPaymentRepository } from './payment.repository';
import { InMemoryAuditLogRepository } from '../audit/audit.repository';

const paymentsRepository = new InMemoryPaymentRepository();
const auditLogRepository = new InMemoryAuditLogRepository();
const paymentService = new PaymentService(paymentsRepository, auditLogRepository);

export const paymentRouter = Router();

// POST /v1/payments
paymentRouter.post('/', async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return res.status(400).json({
      error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'idempotency-key header is required' },
    });
  }

  const parse = CreatePaymentSchema.safeParse({ ...req.body, idempotencyKey });
  if (!parse.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parse.error.errors },
    });
  }

  const result = await paymentService.createPayment(
    parse.data,
    req.requestId,
    req.ip ?? 'unknown',
  );

  if (result.isErr()) {
    const { error } = result;
    if (error.type === 'INSUFFICIENT_FUNDS') return res.status(402).json({ error });
    if (error.type === 'INVALID_PAYMENT_METHOD') return res.status(422).json({ error });
    return res.status(500).json({ error: { code: 'PAYMENT_PROCESSING_ERROR', message: 'Payment failed' } });
  }

  const payment = result.value;
  return res.status(201).json({
    data: payment,
    meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
  });
});

// GET /v1/payments/:id
paymentRouter.get('/:id', async (req: Request, res: Response) => {
  const customerId = req.headers['x-customer-id'];
  if (!customerId || typeof customerId !== 'string') {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'x-customer-id header required' },
    });
  }

  const result = await paymentService.getPayment(req.params.id, customerId);

  if (result.isErr()) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
  }

  return res.json({
    data: result.value,
    meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
  });
});

// POST /v1/payments/:id/refunds
paymentRouter.post('/:id/refunds', async (req: Request, res: Response) => {
  const actorId = req.headers['x-actor-id'];
  if (!actorId || typeof actorId !== 'string') {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'x-actor-id required' } });
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return res.status(400).json({ error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'idempotency-key required' } });
  }

  const parse = RefundPaymentSchema.safeParse({ ...req.body, idempotencyKey });
  if (!parse.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parse.error.errors } });
  }

  const result = await paymentService.refundPayment(
    req.params.id,
    parse.data,
    req.requestId,
    req.ip ?? 'unknown',
    actorId,
  );

  if (result.isErr()) {
    const { error } = result;
    if (error.type === 'PAYMENT_NOT_FOUND') return res.status(404).json({ error });
    if (error.type === 'REFUND_EXCEEDS_PAYMENT') return res.status(422).json({ error });
    return res.status(500).json({ error: { code: 'REFUND_FAILED' } });
  }

  return res.json({
    data: result.value,
    meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
  });
});
