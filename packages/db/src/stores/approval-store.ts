import type Database from 'better-sqlite3';
import type { ApprovalEntry } from '@keepai/proto/types.js';

interface ApprovalRow {
  id: string;
  agent_id: string;
  agent_name: string;
  service: string;
  method: string;
  account_id: string;
  operation_type: string;
  description: string;
  request_hash: string;
  temp_file_path: string;
  status: string;
  created_at: number;
  resolved_at: number | null;
  resolved_by: string | null;
}

function rowToApproval(row: ApprovalRow): ApprovalEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    service: row.service,
    method: row.method,
    accountId: row.account_id,
    operationType: row.operation_type as ApprovalEntry['operationType'],
    description: row.description,
    requestHash: row.request_hash,
    tempFilePath: row.temp_file_path,
    status: row.status as ApprovalEntry['status'],
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

export class ApprovalStore {
  constructor(private db: Database.Database) {}

  create(entry: Omit<ApprovalEntry, 'status' | 'resolvedAt' | 'resolvedBy'>): void {
    this.db
      .prepare(
        `INSERT INTO approval_queue
         (id, agent_id, agent_name, service, method, account_id,
          operation_type, description, request_hash, temp_file_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.agentId,
        entry.agentName,
        entry.service,
        entry.method,
        entry.accountId,
        entry.operationType,
        entry.description,
        entry.requestHash,
        entry.tempFilePath
      );
  }

  getById(id: string): ApprovalEntry | null {
    const row = this.db
      .prepare('SELECT * FROM approval_queue WHERE id = ?')
      .get(id) as ApprovalRow | undefined;
    return row ? rowToApproval(row) : null;
  }

  listPending(): ApprovalEntry[] {
    const rows = this.db
      .prepare("SELECT * FROM approval_queue WHERE status = 'pending' ORDER BY created_at DESC")
      .all() as ApprovalRow[];
    return rows.map(rowToApproval);
  }

  resolve(id: string, status: 'approved' | 'denied', by: string): void {
    this.db
      .prepare(
        `UPDATE approval_queue
         SET status = ?, resolved_at = (unixepoch('now') * 1000), resolved_by = ?
         WHERE id = ?`
      )
      .run(status, by, id);
  }

  /**
   * Expire pending approvals older than maxAgeMs. Returns count expired.
   */
  expireOld(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db
      .prepare(
        `UPDATE approval_queue
         SET status = 'expired', resolved_at = (unixepoch('now') * 1000), resolved_by = 'timeout'
         WHERE status = 'pending' AND created_at < ?`
      )
      .run(cutoff);
    return result.changes;
  }

  /**
   * Find and expire pending approvals older than timeoutMs.
   * Returns the expired entries so the caller can clean up temp files and broadcast SSE events.
   */
  expireByTimeout(timeoutMs: number): ApprovalEntry[] {
    const cutoff = Date.now() - timeoutMs;
    const rows = this.db
      .prepare(
        "SELECT * FROM approval_queue WHERE status = 'pending' AND created_at < ?"
      )
      .all(cutoff) as ApprovalRow[];

    if (rows.length === 0) return [];

    this.db
      .prepare(
        `UPDATE approval_queue
         SET status = 'denied', resolved_at = (unixepoch('now') * 1000), resolved_by = 'timeout'
         WHERE status = 'pending' AND created_at < ?`
      )
      .run(cutoff);

    return rows.map(rowToApproval);
  }

  /**
   * Delete old resolved entries. Returns count deleted.
   */
  cleanupResolved(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db
      .prepare(
        "DELETE FROM approval_queue WHERE status != 'pending' AND resolved_at < ?"
      )
      .run(cutoff);
    return result.changes;
  }
}
