# TypeScript Rules — Nexus Platform

> **[CAPABILITY: MEMORY — .claude/rules/]**
> This file is a domain-specific rule override loaded for TypeScript files.
> It supplements CLAUDE.md with file-type-specific conventions.
> Claude loads the most specific matching rule for the file being edited.

## ID Generation

**Always use ULID, never UUID.**

```typescript
// ✅ CORRECT
import { ulid } from 'ulid';
const paymentId = ulid();

// ❌ WRONG — never use UUID for entity IDs
import { v4 as uuidv4 } from 'uuid';
const paymentId = uuidv4();
```

Why: ULIDs are sortable by creation time, which matters for our audit log queries and cursor-based pagination.

## Error Handling

**Use Result types, never throw in service logic.**

```typescript
// ✅ CORRECT
import { ok, err, Result } from 'neverthrow';

async function processPayment(req: ProcessPaymentRequest): Promise<Result<Payment, PaymentError>> {
  const validation = validateRequest(req);
  if (validation.isErr()) return err(validation.error);
  // ...
  return ok(payment);
}

// ❌ WRONG — throwing makes error paths implicit
async function processPayment(req: ProcessPaymentRequest): Promise<Payment> {
  if (!req.amount) throw new Error('amount required'); // ❌
  // ...
}
```

## Type Safety

- No `any`. Use `unknown` and narrow with type guards.
- All external inputs (request bodies, DB rows, event payloads) must be parsed with `zod`.
- Use `satisfies` operator for const objects that should satisfy an interface.

```typescript
// ✅ Parse all external data at the boundary
import { z } from 'zod';
const PaymentEventSchema = z.object({
  id: z.string().ulid(),
  amount: z.number().positive(),
  currency: z.enum(['EUR', 'GBP', 'USD']),
});
type PaymentEvent = z.infer<typeof PaymentEventSchema>;
```

## Module Structure

```
src/
  payments/
    payment.service.ts        # Business logic
    payment.service.test.ts   # Co-located tests
    payment.repository.ts     # DB access
    payment.repository.test.ts
    payment.types.ts          # Types, schemas
    index.ts                  # Barrel export
```

Never import from deep paths across modules. Use barrel exports:
```typescript
// ✅
import { PaymentService } from '../payments';

// ❌
import { PaymentService } from '../payments/payment.service';
```

## Async Patterns

- All async functions return `Promise<Result<T, E>>`.
- Use `Promise.all` for parallel independent operations.
- Never `await` in a loop — batch with `Promise.all`.

```typescript
// ✅
const results = await Promise.all(userIds.map(id => userRepository.findById(id)));

// ❌
for (const id of userIds) {
  const user = await userRepository.findById(id); // serial, slow
}
```

## Logging

Use structured logging — never `console.log` in production code:

```typescript
import { logger } from '../lib/logger'; // Pino-based

logger.info({ paymentId, amount, currency }, 'payment.processed');
logger.error({ paymentId, error: err.message }, 'payment.failed');
```

## tsconfig Requirements

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```
