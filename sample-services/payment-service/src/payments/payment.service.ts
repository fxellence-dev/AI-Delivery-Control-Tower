/**
 * Payment service — business logic layer.
 *
 * Key patterns demonstrated here (per .claude/rules/typescript.md):
 * - ULID for entity IDs
 * - Result types (neverthrow) instead of throwing
 * - Structured logging (pino)
 * - Audit trail for all payment operations (per .claude/rules/payments.md)
 * - No raw card data in logs
 */

import { ulid } from 'ulid';
import { ok, err, type Result } from 'neverthrow';
import { logger } from '../lib/logger';
import type {
  Payment,
  PaymentError,
  CreatePaymentRequest,
  RefundPaymentRequest,
} from './payment.types';
import type { PaymentRepository } from './payment.repository';
import type { AuditLogRepository } from '../audit/audit.repository';

export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async createPayment(
    req: CreatePaymentRequest,
    requestId: string,
    ipAddress: string,
  ): Promise<Result<Payment, PaymentError>> {
    // Check idempotency
    const existing = await this.payments.findByIdempotencyKey(req.idempotencyKey);
    if (existing) {
      logger.info(
        { requestId, idempotencyKey: req.idempotencyKey, existingId: existing.id },
        'payment.idempotent.hit',
      );
      return ok(existing);
    }

    // Generate ULID for payment ID (per .claude/rules/typescript.md — never UUID)
    const paymentId = ulid();

    const payment: Payment = {
      id: paymentId,
      amount: req.amount,
      currency: req.currency,
      customerId: req.customerId,
      paymentMethodId: req.paymentMethodId,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: req.metadata,
    };

    const saved = await this.payments.create(payment);

    // Audit trail required for all payment operations (per .claude/rules/payments.md)
    await this.auditLog.record({
      action: 'payment.created',
      entityType: 'payment',
      entityId: paymentId,
      actorId: req.customerId,
      ipAddress,
      requestId,
      metadata: {
        amount: req.amount,
        currency: req.currency,
        // ✅ No card numbers in logs — only masked last4 if available
      },
    });

    logger.info(
      {
        requestId,
        paymentId,
        customerId: req.customerId,
        amount: req.amount,
        currency: req.currency,
        // ✅ Per .claude/rules/payments.md — NO cardNumber, NO cvv in logs
      },
      'payment.created',
    );

    return ok(saved);
  }

  async refundPayment(
    paymentId: string,
    req: RefundPaymentRequest,
    requestId: string,
    ipAddress: string,
    actorId: string,
  ): Promise<Result<Payment, PaymentError>> {
    const payment = await this.payments.findById(paymentId);

    if (!payment) {
      return err({ type: 'PAYMENT_NOT_FOUND', paymentId });
    }

    const refundAmount = req.amount ?? payment.amount;

    if (refundAmount > payment.amount) {
      return err({
        type: 'REFUND_EXCEEDS_PAYMENT',
        requested: refundAmount,
        available: payment.amount,
      });
    }

    const updatedPayment = await this.payments.update(paymentId, {
      status: refundAmount === payment.amount ? 'refunded' : 'partially_refunded',
      updatedAt: new Date(),
    });

    // Audit trail for refund (per .claude/rules/payments.md)
    await this.auditLog.record({
      action: 'payment.refund.processed',
      entityType: 'payment',
      entityId: paymentId,
      actorId,
      ipAddress,
      requestId,
      metadata: {
        refundAmount,
        originalAmount: payment.amount,
        reason: req.reason,
        originalPaymentId: paymentId,
      },
    });

    logger.info({ requestId, paymentId, refundAmount, reason: req.reason }, 'payment.refunded');

    return ok(updatedPayment);
  }

  async getPayment(
    paymentId: string,
    customerId: string,
  ): Promise<Result<Payment, PaymentError>> {
    const payment = await this.payments.findById(paymentId);

    if (!payment) {
      return err({ type: 'PAYMENT_NOT_FOUND', paymentId });
    }

    // Authorization: customers can only see their own payments
    if (payment.customerId !== customerId) {
      return err({ type: 'PAYMENT_NOT_FOUND', paymentId });  // 404, not 403, to avoid enumeration
    }

    return ok(payment);
  }
}
