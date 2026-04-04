# Payments Rules — Nexus Platform (PCI-DSS)

> **[CAPABILITY: MEMORY — .claude/rules/]**
> PCI-DSS compliance rules and payment-specific coding conventions.
> These apply to ALL code in payment-service/ and any service that
> handles payment data. Claude reads this file before modifying payment code.

## PCI-DSS Hard Rules

These are non-negotiable. Violations will block PR merge:

1. **Never log card numbers, CVVs, or full PANs.** Log only the last 4 digits (`**** **** **** 1234`).
2. **Never store CVV/CVC after authorization.** Not in the database, not in logs, not in events.
3. **Card numbers in transit must be tokenized** before leaving the payment processor boundary. Use Stripe tokens, never raw PANs in your own DB.
4. **All payment API endpoints require authentication AND authorization.** No anonymous payment operations.
5. **Every payment state transition must be recorded in the audit log** with: `userId`, `paymentId`, `action`, `timestamp`, `ipAddress`, `requestId`.
6. **Refunds require the original payment record to exist.** Validate linkage before processing.

## Audit Trail Requirements

```typescript
// ✅ CORRECT — every payment action must be audited
await auditLog.record({
  action: 'payment.refund.initiated',
  entityType: 'payment',
  entityId: paymentId,
  actorId: userId,
  ipAddress: req.ip,
  requestId: req.requestId,
  metadata: {
    amount: refundAmount,
    reason: refundReason,
    originalPaymentId: payment.id,
  },
});

// ❌ WRONG — never skip the audit log on payment operations
await paymentRepository.createRefund(refund);  // no audit trail
```

## Sensitive Data Masking

```typescript
// ✅ CORRECT — mask before logging
logger.info({
  paymentId,
  cardLast4: payment.cardLast4,       // "1234"
  // ❌ cardNumber: payment.cardNumber  // NEVER
  // ❌ cvv: payment.cvv               // NEVER
}, 'payment.authorized');
```

## SEPA Rules

- SEPA payments require IBAN validation before initiating.
- SEPA mandate must exist and be active before any debit.
- SEPA failures must surface the specific SEPA error code (e.g., `AM04` for insufficient funds).
- SEPA refunds: R-transactions must reference the original transaction's EndToEndId.

## Idempotency

All payment endpoints must implement idempotency keys:

```typescript
// ✅ CORRECT
router.post('/payments', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) return res.status(400).json({ error: 'idempotency-key header required' });

  const existing = await idempotencyStore.get(idempotencyKey);
  if (existing) return res.status(200).json(existing);  // return cached response

  const payment = await paymentService.process(req.body);
  await idempotencyStore.set(idempotencyKey, payment, { ttl: 24 * 60 * 60 });
  return res.status(201).json(payment);
});
```

## Security Review Trigger

Any PR touching `payment-service/` must run the `payments-risk-review` skill before merge. This is enforced by the security-reviewer agent and the payments plugin.

## Encryption at Rest

All payment records in the database use column-level encryption for:
- `card_last4` (still encrypted even though it's masked)
- `bank_account_last4`
- `billing_address`

Use the `encrypt` / `decrypt` utility from `src/lib/encryption.ts` — never roll your own crypto.
