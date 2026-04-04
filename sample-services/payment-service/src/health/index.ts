import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/ready', (_req, res) => {
  // In production: check DB connection, SQS reachability, etc.
  res.json({
    status: 'ok',
    version: process.env.npm_package_version ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
});
