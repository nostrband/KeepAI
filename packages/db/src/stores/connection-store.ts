import type Database from 'better-sqlite3';
import type { Connection } from '@keepai/proto/types.js';

interface ConnectionRow {
  id: string;
  service: string;
  account_id: string;
  status: string;
  label: string | null;
  error: string | null;
  created_at: number;
  last_used_at: number | null;
  metadata: string | null;
}

function rowToConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    service: row.service,
    accountId: row.account_id,
    status: row.status as Connection['status'],
    label: row.label,
    error: row.error,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    metadata: row.metadata,
  };
}

export class ConnectionStore {
  constructor(private db: Database.Database) {}

  upsert(conn: {
    id: string;
    service: string;
    accountId: string;
    status?: string;
    label?: string;
    metadata?: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO connections (id, service, account_id, status, label, metadata)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           label = excluded.label,
           metadata = excluded.metadata,
           error = NULL`
      )
      .run(
        conn.id,
        conn.service,
        conn.accountId,
        conn.status ?? 'connected',
        conn.label ?? null,
        conn.metadata ?? null
      );
  }

  getById(id: string): Connection | null {
    const row = this.db
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(id) as ConnectionRow | undefined;
    return row ? rowToConnection(row) : null;
  }

  listByService(service: string): Connection[] {
    const rows = this.db
      .prepare('SELECT * FROM connections WHERE service = ? ORDER BY created_at DESC')
      .all(service) as ConnectionRow[];
    return rows.map(rowToConnection);
  }

  listAll(): Connection[] {
    const rows = this.db
      .prepare('SELECT * FROM connections ORDER BY created_at DESC')
      .all() as ConnectionRow[];
    return rows.map(rowToConnection);
  }

  updateStatus(id: string, status: string, error?: string): void {
    this.db
      .prepare('UPDATE connections SET status = ?, error = ? WHERE id = ?')
      .run(status, error ?? null, id);
  }

  updateLastUsed(id: string): void {
    this.db
      .prepare('UPDATE connections SET last_used_at = (unixepoch(\'now\') * 1000) WHERE id = ?')
      .run(id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM connections WHERE id = ?').run(id);
  }
}
