import type Database from 'better-sqlite3';
import type { Agent } from '@keepai/proto/types.js';

interface AgentRow {
  id: string;
  name: string;
  agent_pubkey: string;
  keepd_pubkey: string;
  keepd_privkey: string;
  status: string;
  paired_at: number;
  last_seen_at: number | null;
  created_at: number;
}

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    agentPubkey: row.agent_pubkey,
    keepdPubkey: row.keepd_pubkey,
    keepdPrivkey: row.keepd_privkey,
    status: row.status as Agent['status'],
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

export class AgentStore {
  constructor(private db: Database.Database) {}

  create(agent: {
    id: string;
    name: string;
    agentPubkey: string;
    keepdPubkey: string;
    keepdPrivkey: string;
    pairedAt: number;
  }): void {
    this.db
      .prepare(
        `INSERT INTO agents (id, name, agent_pubkey, keepd_pubkey, keepd_privkey, paired_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        agent.id,
        agent.name,
        agent.agentPubkey,
        agent.keepdPubkey,
        agent.keepdPrivkey,
        agent.pairedAt
      );
  }

  getById(id: string): Agent | null {
    const row = this.db
      .prepare('SELECT * FROM agents WHERE id = ?')
      .get(id) as AgentRow | undefined;
    return row ? rowToAgent(row) : null;
  }

  getByPubkey(agentPubkey: string): Agent | null {
    const row = this.db
      .prepare('SELECT * FROM agents WHERE agent_pubkey = ?')
      .get(agentPubkey) as AgentRow | undefined;
    return row ? rowToAgent(row) : null;
  }

  getByKeepdPubkey(keepdPubkey: string): Agent | null {
    const row = this.db
      .prepare('SELECT * FROM agents WHERE keepd_pubkey = ?')
      .get(keepdPubkey) as AgentRow | undefined;
    return row ? rowToAgent(row) : null;
  }

  getByName(name: string): Agent | null {
    const row = this.db
      .prepare('SELECT * FROM agents WHERE name = ?')
      .get(name) as AgentRow | undefined;
    return row ? rowToAgent(row) : null;
  }

  list(): Agent[] {
    const rows = this.db
      .prepare('SELECT * FROM agents ORDER BY created_at DESC')
      .all() as AgentRow[];
    return rows.map(rowToAgent);
  }

  updateLastSeen(id: string): void {
    this.db
      .prepare('UPDATE agents SET last_seen_at = (unixepoch(\'now\') * 1000) WHERE id = ?')
      .run(id);
  }

  pause(id: string): void {
    this.db.prepare("UPDATE agents SET status = 'paused' WHERE id = ? AND status = 'paired'").run(id);
  }

  unpause(id: string): void {
    this.db.prepare("UPDATE agents SET status = 'paired' WHERE id = ? AND status = 'paused'").run(id);
  }

  revoke(id: string): void {
    this.db.prepare("UPDATE agents SET status = 'revoked' WHERE id = ?").run(id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  }
}
