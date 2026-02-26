# 09 - Database

## Overview

KeepAI uses **better-sqlite3** for local storage. No CRSqlite (no multi-device
sync needed — keepd is a single daemon). Plain SQLite for V1, with a clean upgrade
path to SQLCipher for encryption-at-rest in the future.

## Why better-sqlite3

- **Synchronous API**: Simpler code, no async/callback wrapping needed
- **Faster**: Benchmarks consistently faster than async sqlite3 package
- **SQLCipher upgrade path**: `better-sqlite3-sqlcipher` is a drop-in replacement
  with the same API, just adds `.pragma('key', 'password')` on open
- **Well-maintained**: Active development, good Electron support
- **Simpler native module handling**: Single .node binary, no crsqlite complexity

## Migration from ../keep.ai DB Patterns

| ../keep.ai | KeepAI |
|-----------|--------|
| `@app/db` with async DBInterface | `@keepai/db` with sync better-sqlite3 |
| `db.exec(sql, args)` (async) | `db.prepare(sql).run(...args)` (sync) |
| `db.execO<T>(sql, args)` (async) | `db.prepare(sql).all(...args)` (sync) |
| `db.tx(fn)` (async callback) | `db.transaction(fn)()` (sync) |
| CRSqlite CRR registration | Not needed |
| 51 migrations | Fresh start, new schema |

## Database Wrapper

```typescript
// packages/db/src/database.ts

import Database from "better-sqlite3";

export class KeepDB {
  readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  // Run migrations
  migrate() {
    const version = this.db.pragma("user_version", { simple: true }) as number;
    for (let v = version + 1; v <= MAX_VERSION; v++) {
      const migration = migrations.get(v);
      if (!migration) throw new Error(`Missing migration v${v}`);
      this.db.transaction(() => {
        migration(this.db);
        this.db.pragma(`user_version = ${v}`);
      })();
    }
  }

  close() {
    this.db.close();
  }
}
```

## Schema

### agents

Paired agent identities.

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,             -- Random hex ID
  name TEXT NOT NULL UNIQUE,       -- User-chosen name ("openclaw")
  agent_pubkey TEXT NOT NULL UNIQUE,  -- Agent's nostr public key (hex)
  keepd_pubkey TEXT NOT NULL UNIQUE,  -- Per-agent keepd public key (hex)
  keepd_privkey TEXT NOT NULL,     -- Per-agent keepd private key (hex)
  status TEXT NOT NULL DEFAULT 'paired',  -- paired, revoked
  paired_at INTEGER NOT NULL,      -- Unix timestamp ms
  last_seen_at INTEGER,            -- Last request timestamp
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
```

### pending_pairings

Temporary pairing codes awaiting agent init.

```sql
CREATE TABLE pending_pairings (
  id TEXT PRIMARY KEY,             -- Same as agent ID
  name TEXT NOT NULL,              -- Agent name
  secret TEXT NOT NULL UNIQUE,     -- One-time pairing secret
  keepd_pubkey TEXT NOT NULL UNIQUE,  -- Per-agent keepd public key (hex)
  keepd_privkey TEXT NOT NULL,     -- Per-agent keepd private key (hex)
  expires_at INTEGER NOT NULL,     -- Expiry timestamp
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
```

### connections

OAuth connection metadata (mirrors ../keep.ai).

```sql
CREATE TABLE connections (
  id TEXT PRIMARY KEY,             -- "{service}:{accountId}"
  service TEXT NOT NULL,           -- "gmail", "notion"
  account_id TEXT NOT NULL,        -- Email or workspace ID
  status TEXT NOT NULL DEFAULT 'connected',  -- connected, expired, error
  label TEXT,                      -- Display name
  error TEXT,                      -- Error message if status=error
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  last_used_at INTEGER,
  metadata TEXT                    -- JSON: service-specific data
);

CREATE INDEX idx_connections_service ON connections(service);
```

### rpc_requests

Request deduplication and status tracking. Every incoming RPC_REQUEST event is
recorded here by nostr event ID before processing. Duplicate events are silently
ignored. See 02-nostr-rpc.md for details.

```sql
CREATE TABLE rpc_requests (
  event_id TEXT PRIMARY KEY,       -- Nostr event ID (dedup key)
  request_id TEXT NOT NULL,        -- RPC request.id (for response correlation)
  agent_pubkey TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',  -- received, processing, responded, rejected
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  responded_at INTEGER
);

CREATE INDEX idx_rpc_requests_created ON rpc_requests(created_at);
```

Cleanup: delete records older than 1 hour.

### approval_queue

Pending and resolved approval requests.

```sql
CREATE TABLE approval_queue (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  service TEXT NOT NULL,
  method TEXT NOT NULL,
  account_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,    -- read, write, delete
  description TEXT NOT NULL,       -- Human-readable description
  request_hash TEXT NOT NULL,      -- SHA-256 of temp file
  temp_file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, denied, expired
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  resolved_at INTEGER,
  resolved_by TEXT,                -- user, timeout

  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_queue_status ON approval_queue(status);
CREATE INDEX idx_queue_agent ON approval_queue(agent_id);
```

### audit_log

All requests — approved, denied, or timed out.

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  service TEXT NOT NULL,
  method TEXT NOT NULL,
  account_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  policy_action TEXT NOT NULL,     -- allow, deny, ask (what policy decided)
  approved INTEGER NOT NULL,       -- 1=yes, 0=no
  approved_by TEXT,                -- policy, user, timeout
  request_summary TEXT,            -- Brief description
  response_status TEXT NOT NULL,   -- success, error
  error_message TEXT,
  duration_ms INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX idx_audit_agent ON audit_log(agent_id);
CREATE INDEX idx_audit_service ON audit_log(service);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

### settings

Key-value store for daemon configuration.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Used for:
- Relay list, timeouts, and other config

Note: keepd has no global nostr keypair. Per-agent keypairs are stored in the
`agents` and `pending_pairings` tables. See 02-nostr-rpc.md for details.

## Store Classes

```typescript
// packages/db/src/stores/agent-store.ts
class AgentStore {
  constructor(private db: Database.Database) {}

  create(agent: { id, name, pubkey }): void
  getById(id: string): Agent | null
  getByPubkey(pubkey: string): Agent | null
  getByName(name: string): Agent | null
  list(): Agent[]
  updateLastSeen(id: string): void
  revoke(id: string): void
}

// packages/db/src/stores/connection-store.ts
class ConnectionStore {
  constructor(private db: Database.Database) {}

  upsert(connection: Connection): void
  getById(id: string): Connection | null
  listByService(service: string): Connection[]
  listAll(): Connection[]
  updateStatus(id: string, status: string, error?: string): void
  updateLastUsed(id: string): void
  delete(id: string): void
}

// packages/db/src/stores/rpc-request-store.ts
class RpcRequestStore {
  constructor(private db: Database.Database) {}

  // Returns false if event_id already exists (duplicate)
  tryInsert(eventId: string, requestId: string, agentPubkey: string, method: string): boolean
  updateStatus(eventId: string, status: string): void
  cleanupOld(maxAgeMs: number): number
}

// packages/db/src/stores/approval-store.ts
class ApprovalStore {
  constructor(private db: Database.Database) {}

  create(entry: ApprovalEntry): void
  getById(id: string): ApprovalEntry | null
  listPending(): ApprovalEntry[]
  resolve(id: string, status: "approved" | "denied", by: string): void
  expireOld(maxAgeMs: number): number  // Returns count expired
  cleanupResolved(maxAgeMs: number): number  // Delete old resolved entries
}

// packages/db/src/stores/audit-store.ts
class AuditStore {
  constructor(private db: Database.Database) {}

  log(entry: AuditEntry): void
  list(filters: { agent?, service?, from?, to?, limit?, offset? }): AuditEntry[]
  count(filters: { agent?, service?, from?, to? }): number
}

// packages/db/src/stores/pairing-store.ts
class PairingStore {
  constructor(private db: Database.Database) {}

  create(pairing: PendingPairing): void
  getBySecret(secret: string): PendingPairing | null
  delete(id: string): void
  expireOld(): number
}

// packages/db/src/stores/settings-store.ts
class SettingsStore {
  constructor(private db: Database.Database) {}

  get(key: string): string | null
  set(key: string, value: string): void
  delete(key: string): void
  getAll(): Record<string, string>
}
```

## API Layer

```typescript
// packages/db/src/api.ts
class KeepDBApi {
  readonly agents: AgentStore;
  readonly connections: ConnectionStore;
  readonly rpcRequests: RpcRequestStore;
  readonly approvals: ApprovalStore;
  readonly audit: AuditStore;
  readonly pairings: PairingStore;
  readonly settings: SettingsStore;

  constructor(db: Database.Database) {
    this.agents = new AgentStore(db);
    this.connections = new ConnectionStore(db);
    this.rpcRequests = new RpcRequestStore(db);
    this.approvals = new ApprovalStore(db);
    this.audit = new AuditStore(db);
    this.pairings = new PairingStore(db);
    this.settings = new SettingsStore(db);
  }
}
```

## Migration Strategy

Fresh start — no need to migrate from ../keep.ai schema.

**v1**: Initial schema (all tables above)

Future migrations follow the same pattern as ../keep.ai:
```typescript
const migrations = new Map<number, (db: Database.Database) => void>();

migrations.set(1, (db) => {
  db.exec(`CREATE TABLE agents (...)`);
  db.exec(`CREATE TABLE pending_pairings (...)`);
  db.exec(`CREATE TABLE connections (...)`);
  db.exec(`CREATE TABLE rpc_requests (...)`);
  db.exec(`CREATE TABLE approval_queue (...)`);
  db.exec(`CREATE TABLE audit_log (...)`);
  db.exec(`CREATE TABLE settings (...)`);
  // Create indexes
});
```

## Future: Encryption at Rest

When we need to harden credential storage:

1. Switch from `better-sqlite3` to `better-sqlite3-sqlcipher` (drop-in replacement)
2. On DB open: `db.pragma("key = '<encryption_key>'")`
3. Encryption key stored in OS keystore:
   - macOS: Keychain
   - Windows: Credential Manager
   - Linux: Secret Service (GNOME Keyring / KDE Wallet)
4. Use `keytar` npm package for cross-platform keystore access

The schema and all store code remain identical — only the DB constructor changes.

## Cleanup Jobs

keepd runs periodic cleanup:

```typescript
// Every 5 minutes
setInterval(() => {
  // Expire old pending pairings
  db.pairings.expireOld();

  // Expire old pending approvals
  db.approvals.expireOld(approvalTimeoutMs);

  // Clean up old resolved approval entries (keep 7 days)
  db.approvals.cleanupResolved(7 * 24 * 60 * 60 * 1000);

  // Clean up old audit log (keep 30 days)
  // (or make configurable)
}, 5 * 60 * 1000);
```
