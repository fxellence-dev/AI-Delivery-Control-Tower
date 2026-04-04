/**
 * Audit log repository.
 * Per .claude/rules/payments.md: every payment state transition must be audited.
 * Audit records are immutable — no UPDATE or DELETE on this table in production.
 */

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  ipAddress: string;
  requestId: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface AuditLogRepository {
  record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry>;
  findByEntityId(entityId: string): Promise<AuditEntry[]>;
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private log: AuditEntry[] = [];

  async record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const { ulid } = await import('ulid');
    const fullEntry: AuditEntry = {
      ...entry,
      id: ulid(),
      timestamp: new Date(),
    };
    this.log.push(fullEntry);
    return fullEntry;
  }

  async findByEntityId(entityId: string): Promise<AuditEntry[]> {
    return this.log.filter((e) => e.entityId === entityId);
  }
}
