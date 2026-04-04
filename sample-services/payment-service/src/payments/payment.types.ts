/**
 * Payment domain types and Zod schemas.
 * Per .claude/rules/typescript.md: all external inputs validated with Zod.
 * Per .claude/rules/payments.md: no raw card numbers, SEPA mandate validation.
 */

import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  amount: z.number().int().positive().describe('Amount in smallest currency unit (cents)'),
  currency: z.enum(['EUR', 'GBP', 'USD']),
  customerId: z.string().min(1).describe('ULID of the customer'),
  paymentMethodId: z.string().min(1).describe('Token from payment processor — never raw card data'),
  idempotencyKey: z.string().min(1),
  metadata: z.record(z.string()).optional(),
});

export const RefundPaymentSchema = z.object({
  amount: z.number().int().positive().optional().describe('Partial refund amount — omit for full refund'),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']),
  idempotencyKey: z.string().min(1),
});

export type CreatePaymentRequest = z.infer<typeof CreatePaymentSchema>;
export type RefundPaymentRequest = z.infer<typeof RefundPaymentSchema>;

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface Payment {
  id: string;  // ULID
  amount: number;
  currency: string;
  customerId: string;
  paymentMethodId: string;
  status: PaymentStatus;
  cardLast4?: string;  // Masked — never full PAN (per .claude/rules/payments.md)
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, string>;
}

export type PaymentError =
  | { type: 'PAYMENT_NOT_FOUND'; paymentId: string }
  | { type: 'INSUFFICIENT_FUNDS'; customerId: string }
  | { type: 'INVALID_PAYMENT_METHOD'; paymentMethodId: string }
  | { type: 'DUPLICATE_IDEMPOTENCY_KEY'; key: string; existingPaymentId: string }
  | { type: 'REFUND_EXCEEDS_PAYMENT'; requested: number; available: number }
  | { type: 'CUSTOMER_NOT_FOUND'; customerId: string };
