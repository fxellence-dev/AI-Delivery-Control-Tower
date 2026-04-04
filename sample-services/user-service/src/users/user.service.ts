/**
 * User service — business logic.
 * Demonstrates the same patterns as payment-service:
 * ULID IDs, Result types, structured logging.
 */

import { ulid } from 'ulid';
import { ok, err, type Result } from 'neverthrow';
import pino from 'pino';
import type { User, UserError, CreateUserRequest } from './user.types';
import type { UserRepository } from './user.repository';

const logger = pino({ base: { service: 'user-service' } });

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async createUser(req: CreateUserRequest): Promise<Result<User, UserError>> {
    const existing = await this.users.findByEmail(req.email);
    if (existing) {
      return err({ type: 'EMAIL_ALREADY_EXISTS', email: req.email });
    }

    const user: User = {
      id: ulid(),  // ULID, not UUID (per .claude/rules/typescript.md)
      email: req.email,
      name: req.name,
      role: req.role,
      status: 'pending_verification',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.users.create(user);
    logger.info({ userId: saved.id }, 'user.created');
    return ok(saved);
  }

  async getUser(userId: string): Promise<Result<User, UserError>> {
    const user = await this.users.findById(userId);
    if (!user) return err({ type: 'USER_NOT_FOUND', userId });
    return ok(user);
  }

  async getUserByEmail(email: string): Promise<Result<User, UserError>> {
    const user = await this.users.findByEmail(email);
    if (!user) return err({ type: 'USER_NOT_FOUND', userId: email });
    return ok(user);
  }
}
