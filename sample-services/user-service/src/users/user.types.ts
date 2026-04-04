/**
 * User domain types.
 * Per .claude/rules/typescript.md: ULID for IDs, Zod for validation, no any.
 */

import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(['customer', 'admin', 'support']).default('customer'),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

export type UserStatus = 'active' | 'suspended' | 'pending_verification';

export interface User {
  id: string;         // ULID
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'support';
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type UserError =
  | { type: 'USER_NOT_FOUND'; userId: string }
  | { type: 'EMAIL_ALREADY_EXISTS'; email: string }
  | { type: 'USER_SUSPENDED'; userId: string };
