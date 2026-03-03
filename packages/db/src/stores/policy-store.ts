import type Database from 'better-sqlite3';
import type { Policy } from '@keepai/proto/types.js';

interface PolicyRow {
  service: string;
  account_id: string;
  agent_id: string;
  policy: string;
  created_at: number;
  updated_at: number;
}

export interface PolicyEntry {
  service: string;
  accountId: string;
  agentId: string;
  policy: Policy;
  createdAt: number;
  updatedAt: number;
}

function rowToEntry(row: PolicyRow): PolicyEntry {
  return {
    service: row.service,
    accountId: row.account_id,
    agentId: row.agent_id,
    policy: JSON.parse(row.policy),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PolicyStore {
  constructor(private db: Database.Database) {}

  upsert(entry: {
    service: string;
    accountId: string;
    agentId: string;
    policy: Policy;
  }): void {
    this.db
      .prepare(
        `INSERT INTO policies (service, account_id, agent_id, policy)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(service, account_id, agent_id) DO UPDATE SET
           policy = excluded.policy,
           updated_at = (unixepoch('now') * 1000)`
      )
      .run(
        entry.service,
        entry.accountId,
        entry.agentId,
        JSON.stringify(entry.policy)
      );
  }

  get(service: string, accountId: string, agentId: string): PolicyEntry | null {
    const row = this.db
      .prepare('SELECT * FROM policies WHERE service = ? AND account_id = ? AND agent_id = ?')
      .get(service, accountId, agentId) as PolicyRow | undefined;
    return row ? rowToEntry(row) : null;
  }

  listByAgent(agentId: string): PolicyEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM policies WHERE agent_id = ? ORDER BY service, account_id')
      .all(agentId) as PolicyRow[];
    return rows.map(rowToEntry);
  }

  listByConnection(service: string, accountId: string): PolicyEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM policies WHERE service = ? AND account_id = ? ORDER BY agent_id')
      .all(service, accountId) as PolicyRow[];
    return rows.map(rowToEntry);
  }

  deleteByAgent(agentId: string): void {
    this.db.prepare('DELETE FROM policies WHERE agent_id = ?').run(agentId);
  }

  deleteByConnection(service: string, accountId: string): void {
    this.db
      .prepare('DELETE FROM policies WHERE service = ? AND account_id = ?')
      .run(service, accountId);
  }
}
