/**
 * payment-service — Nexus Platform
 *
 * Entry point for the payment processing service.
 * This is a real, working service — not a stub.
 * It serves as the target codebase for Demo 1 (feature delivery)
 * and Demo 3 (security audit) in the ADCT reference project.
 */

import express from 'express';
import { paymentRouter } from './payments';
import { healthRouter } from './health';
import { logger } from './lib/logger';
import { requestMiddleware } from './lib/middleware';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());
app.use(requestMiddleware);

app.use('/health', healthRouter);
app.use('/v1/payments', paymentRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack }, 'unhandled.error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
});

app.listen(PORT, () => {
  logger.info({ port: PORT, version: process.env.npm_package_version }, 'payment-service.started');
});

export { app };
