import type { User } from './user.types';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
}

export class InMemoryUserRepository implements UserRepository {
  private store = new Map<string, User>();
  private emailIndex = new Map<string, string>();

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = this.emailIndex.get(email);
    if (!id) return null;
    return this.findById(id);
  }

  async create(user: User): Promise<User> {
    this.store.set(user.id, user);
    this.emailIndex.set(user.email, user.id);
    return user;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`User not found: ${id}`);
    const updated = { ...existing, ...updates };
    this.store.set(id, updated);
    return updated;
  }
}
