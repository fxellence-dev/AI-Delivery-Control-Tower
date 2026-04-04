// Barrel export for payments module (per .claude/rules/typescript.md)
export { paymentRouter } from './payment.router';
export { PaymentService } from './payment.service';
export { InMemoryPaymentRepository } from './payment.repository';
export type { Payment, PaymentError, CreatePaymentRequest } from './payment.types';
