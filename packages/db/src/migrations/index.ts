import type Database from 'better-sqlite3';

export const MAX_VERSION = 5;

export const migrations = new Map<number, (db: Database.Database) => void>();

migrations.set(1, (db) => {
  db.exec(`
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      agent_pubkey TEXT NOT NULL UNIQUE,
      keepd_pubkey TEXT NOT NULL UNIQUE,
      keepd_privkey TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'paired',
      paired_at INTEGER NOT NULL,
      last_seen_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )
  `);

  db.exec(`
    CREATE TABLE pending_pairings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      secret TEXT NOT NULL UNIQUE,
      keepd_pubkey TEXT NOT NULL UNIQUE,
      keepd_privkey TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )
  `);

  db.exec(`
    CREATE TABLE connections (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL,
      account_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'connected',
      label TEXT,
      error TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
      last_used_at INTEGER,
      metadata TEXT
    )
  `);
  db.exec(`CREATE INDEX idx_connections_service ON connections(service)`);

  db.exec(`
    CREATE TABLE rpc_requests (
      event_id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      agent_pubkey TEXT NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
      responded_at INTEGER
    )
  `);
  db.exec(`CREATE INDEX idx_rpc_requests_created ON rpc_requests(created_at)`);

  db.exec(`
    CREATE TABLE approval_queue (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      service TEXT NOT NULL,
      method TEXT NOT NULL,
      account_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      description TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      temp_file_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
      resolved_at INTEGER,
      resolved_by TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `);
  db.exec(`CREATE INDEX idx_queue_status ON approval_queue(status)`);
  db.exec(`CREATE INDEX idx_queue_agent ON approval_queue(agent_id)`);

  db.exec(`
    CREATE TABLE audit_log (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      service TEXT NOT NULL,
      method TEXT NOT NULL,
      account_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      policy_action TEXT NOT NULL,
      approved INTEGER NOT NULL,
      approved_by TEXT,
      request_summary TEXT,
      response_status TEXT NOT NULL,
      error_message TEXT,
      duration_ms INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )
  `);
  db.exec(`CREATE INDEX idx_audit_agent ON audit_log(agent_id)`);
  db.exec(`CREATE INDEX idx_audit_service ON audit_log(service)`);
  db.exec(`CREATE INDEX idx_audit_created ON audit_log(created_at)`);

  db.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
});

migrations.set(2, (db) => {
  db.exec(`
    CREATE TABLE policies (
      service TEXT NOT NULL,
      account_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      policy TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
      PRIMARY KEY (service, account_id, agent_id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `);
  db.exec(`CREATE INDEX idx_policies_agent ON policies(agent_id)`);
  db.exec(`CREATE INDEX idx_policies_connection ON policies(service, account_id)`);
});

migrations.set(3, (db) => {
  db.exec(`ALTER TABLE connections ADD COLUMN last_health_check_at INTEGER`);
});

migrations.set(4, (db) => {
  // Re-key connections from "service:accountId" to random UUIDs
  // to prevent PII (emails, usernames) from leaking into URLs and telemetry.
  const { randomUUID } = require('crypto');

  const rows = db.prepare('SELECT id, service, account_id FROM connections').all() as Array<{ id: string; service: string; account_id: string }>;

  // Build old→new ID mapping
  const idMap = new Map<string, string>();
  for (const row of rows) {
    idMap.set(row.id, randomUUID());
  }

  // Update each connection's primary key
  for (const [oldId, newId] of idMap) {
    db.prepare('UPDATE connections SET id = ? WHERE id = ?').run(newId, oldId);
  }

  // Add unique constraint on (service, account_id)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_service_account ON connections(service, account_id)`);
});

migrations.set(5, (db) => {
  // Move credentials from files into the database.
  // The column stores a JSON blob of OAuthCredentials.
  // Actual file→DB migration is done at startup by ConnectionManager.migrateFileCredentials().
  db.exec(`ALTER TABLE connections ADD COLUMN credentials TEXT`);
});
