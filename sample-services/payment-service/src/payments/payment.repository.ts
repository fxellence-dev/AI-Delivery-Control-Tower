/**
 * Payment repository — data access layer.
 * Per CLAUDE.md: no direct DB access from route handlers — always through repository.
 * In tests: use a real Postgres DB (via Docker), never mock this layer.
 */

import type { Payment } from './payment.types';

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByIdempotencyKey(key: string): Promise<Payment | null>;
  create(payment: Payment): Promise<Payment>;
  update(id: string, updates: Partial<Payment>): Promise<Payment>;
  list(customerId: string, options?: { limit?: number; cursor?: string }): Promise<Payment[]>;
}

/** In-memory implementation for demo — replace with Postgres in production */
export class InMemoryPaymentRepository implements PaymentRepository {
  private store = new Map<string, Payment>();
  private idempotencyIndex = new Map<string, string>();  // idempotencyKey → paymentId

  async findById(id: string): Promise<Payment | null> {
    return this.store.get(id) ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const paymentId = this.idempotencyIndex.get(key);
    if (!paymentId) return null;
    return this.findById(paymentId);
  }

  async create(payment: Payment): Promise<Payment> {
    this.store.set(payment.id, payment);
    return payment;
  }

  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Payment not found: ${id}`);
    const updated = { ...existing, ...updates };
    this.store.set(id, updated);
    return updated;
  }

  async list(customerId: string, options: { limit?: number; cursor?: string } = {}): Promise<Payment[]> {
    const { limit = 20 } = options;
    return Array.from(this.store.values())
      .filter((p) => p.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
