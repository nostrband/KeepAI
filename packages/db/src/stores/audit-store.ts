import type Database from 'better-sqlite3';
import type { AuditEntry } from '@keepai/proto/types.js';

interface AuditRow {
  id: string;
  agent_id: string;
  agent_name: string;
  service: string;
  method: string;
  account_id: string;
  operation_type: string;
  policy_action: string;
  approved: number;
  approved_by: string | null;
  request_summary: string | null;
  response_status: string;
  error_message: string | null;
  duration_ms: number | null;
  created_at: number;
}

function rowToAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    service: row.service,
    method: row.method,
    accountId: row.account_id,
    operationType: row.operation_type as AuditEntry['operationType'],
    policyAction: row.policy_action as AuditEntry['policyAction'],
    approved: row.approved === 1,
    approvedBy: row.approved_by,
    requestSummary: row.request_summary,
    responseStatus: row.response_status as AuditEntry['responseStatus'],
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

export interface AuditFilters {
  agentId?: string;
  service?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export class AuditStore {
  constructor(private db: Database.Database) {}

  log(entry: Omit<AuditEntry, 'createdAt'>): void {
    this.db
      .prepare(
        `INSERT INTO audit_log
         (id, agent_id, agent_name, service, method, account_id, operation_type,
          policy_action, approved, approved_by, request_summary,
          response_status, error_message, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.agentId,
        entry.agentName,
        entry.service,
        entry.method,
        entry.accountId,
        entry.operationType,
        entry.policyAction,
        entry.approved ? 1 : 0,
        entry.approvedBy,
        entry.requestSummary,
        entry.responseStatus,
        entry.errorMessage,
        entry.durationMs
      );
  }

  list(filters: AuditFilters = {}): AuditEntry[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.agentId) {
      conditions.push('agent_id = ?');
      params.push(filters.agentId);
    }
    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }
    if (filters.from) {
      conditions.push('created_at >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('created_at <= ?');
      params.push(filters.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const rows = this.db
      .prepare(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as AuditRow[];
    return rows.map(rowToAudit);
  }

  count(filters: AuditFilters = {}): number {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.agentId) {
      conditions.push('agent_id = ?');
      params.push(filters.agentId);
    }
    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }
    if (filters.from) {
      conditions.push('created_at >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('created_at <= ?');
      params.push(filters.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_log ${where}`)
      .get(...params) as { count: number };
    return row.count;
  }

  /**
   * Delete entries older than maxAgeMs. Returns count deleted.
   */
  cleanupOld(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db
      .prepare('DELETE FROM audit_log WHERE created_at < ?')
      .run(cutoff);
    return result.changes;
  }
}
