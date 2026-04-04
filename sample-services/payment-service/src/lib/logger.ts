/**
 * Structured logger using Pino.
 * Per .claude/rules/typescript.md: never use console.log in production code.
 * All log entries are JSON-structured for Datadog ingestion.
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  base: {
    service: 'payment-service',
    version: process.env.npm_package_version ?? 'unknown',
    env: process.env.NODE_ENV ?? 'development',
  },
});
