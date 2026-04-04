/**
 * Express middleware: request logging + requestId injection.
 * Per CLAUDE.md: all responses include meta.requestId (ULID).
 */

import { type Request, type Response, type NextFunction } from 'express';
import { ulid } from 'ulid';
import { logger } from './logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = ulid();  // ULID, per .claude/rules/typescript.md
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', req.requestId);

  res.on('finish', () => {
    logger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - req.startTime,
      },
      'http.request'
    );
  });

  next();
}
