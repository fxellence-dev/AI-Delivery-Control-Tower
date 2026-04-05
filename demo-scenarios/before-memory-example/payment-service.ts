/**
 * DEMO: "Before Memory" Example
 *
 * This is a realistic example of what Claude produces without CLAUDE.md or
 * .claude/rules/ — a clean, working payment service that violates every
 * Nexus Platform standard.
 *
 * Problems to point out during the demo:
 *   ❌ UUID instead of ULID (line 14, 51)
 *   ❌ throw new Error() instead of Result types (lines 64, 71, 88)
 *   ❌ console.log instead of structured Pino logging (lines 57, 78, 96)
 *   ❌ No audit trail on payment creation or refund
 *   ❌ No idempotency key handling
 *   ❌ No PCI-DSS masking — could log raw payment data
 *   ❌ Direct DB call inside route handler (no repository layer)
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';  // ❌ UUID — our standard is ULID

const app = express();
app.use(express.json());

// ❌ In-memory store — no repository layer, mixed with route logic
const payments: Record<string, Payment> = {};

interface Payment {
  id: string;
  amount: number;
  currency: string;
  customerId: string;
  paymentMethodId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: string;
}

interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

const refunds: Record<string, Refund[]> = {};

// POST /payments
app.post('/payments', async (req: Request, res: Response) => {
  const { amount, currency, customerId, paymentMethodId } = req.body;

  // ❌ No idempotency key check — retry = double charge
  // ❌ No Zod validation — trusts raw request body

  const payment: Payment = {
    id: uuidv4(),  // ❌ UUID not ULID
    amount,
    currency,
    customerId,
    paymentMethodId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  console.log('Creating payment:', payment);  // ❌ console.log, not Pino
  // ❌ No audit log — PCI-DSS requires logging every payment state transition

  try {
    // Simulate payment processing
    payment.status = 'succeeded';
    payments[payment.id] = payment;

    console.log('Payment created:', payment.id);  // ❌ could log sensitive data
    res.status(201).json(payment);  // ❌ no standard response wrapper { data, meta }

  } catch (error) {
    throw new Error('Payment failed');  // ❌ throw instead of Result type
  }
});

// POST /payments/:id/refunds
app.post('/payments/:id/refunds', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  const payment = payments[id];

  // ❌ throws exception instead of returning Result<Refund, RefundError>
  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'succeeded') {
    throw new Error('Payment cannot be refunded');
  }

  const refundAmount = amount ?? payment.amount;

  if (refundAmount > payment.amount) {
    throw new Error('Refund amount exceeds payment');  // ❌ throw
  }

  const refund: Refund = {
    id: uuidv4(),  // ❌ UUID not ULID
    paymentId: id,
    amount: refundAmount,
    reason,
    createdAt: new Date().toISOString(),
  };

  if (!refunds[id]) refunds[id] = [];
  refunds[id].push(refund);

  payment.status = 'refunded';

  // ❌ No audit log for the refund
  // ❌ No idempotency — retry = multiple refunds
  console.log('Refund created:', refund.id);  // ❌ console.log

  res.json(refund);  // ❌ no standard response wrapper
});

app.listen(3001, () => {
  console.log('Payment service running on port 3001');  // ❌ console.log
});
