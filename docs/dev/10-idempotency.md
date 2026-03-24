# 10 — Idempotent RPC Calls

## Problem

When an AI agent runs `npx keepai run gmail messages.send ...`, the RPC call traverses
multiple unreliable hops: agent → nostr relay → keepd → Gmail API. A timeout or
transient failure at any hop leaves the agent unsure whether the side-effect (e.g. email
sent) actually happened. Retrying blindly risks duplicates; giving up risks lost work.

**Goal**: Let the agent safely retry any mutation without causing duplicate side-effects.

Read-only operations (`operationType === 'read'`) are inherently idempotent and don't
need this machinery — they pass through as today.

---

## Design Overview

```
  Agent (keepai CLI/SDK)                           keepd (daemon)
  ─────────────────────                           ──────────────
  1. Generate idempotency_key (random UUID)
  2. Write to client DB:
     { key, service, method, params, status: 'pending' }
  3. Send RPC with idempotency_key in request
                                    ──────────►
                                                  4. Receive request, extract idempotency_key
                                                  5. Look up key in idempotency_results table
                                                     → HIT (status='done'):  return stored result
                                                     → HIT (status='executing'): return ALREADY_EXECUTING error
                                                     → MISS: insert with status='executing'
                                                  6. Execute connector (Gmail API, etc.)
                                                  7. Write result to idempotency_results:
                                                     status='done', result=<JSON>, updated_at=now
                                                  8. Return result to agent
                                    ◄──────────
  9. Receive result
  10. Update client DB: status='done', result=<JSON>
  11. Print result

  ON TIMEOUT/TRANSIENT ERROR:
  10'. Update client DB: status='failed'
  11'. Print: "Request may have succeeded on server.
       Retry with: npx keepai retry <idempotency_key>"
```

---

## Client Side

### Client DB

A lightweight SQLite database at `~/.keepai/client/client.db` (same dir as `identity.json`
and `config.json`). Uses `better-sqlite3` (already a dependency).

**Schema** — single table `rpc_log`:

```sql
CREATE TABLE rpc_log (
  idempotency_key TEXT PRIMARY KEY,
  service         TEXT NOT NULL,
  method          TEXT NOT NULL,
  account         TEXT,
  params          TEXT NOT NULL,      -- JSON
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | done | failed
  result          TEXT,               -- JSON, set when done
  error           TEXT,               -- error message, set when failed
  created_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
CREATE INDEX idx_rpc_log_created ON rpc_log(created_at);
```

Rows older than 7 days are pruned on startup (or on each `run`/`retry`).

### Changes to `RPCRequest` type

Add optional field:

```typescript
interface RPCRequest {
  // ... existing fields ...
  idempotencyKey?: string;  // UUID, present for mutations
}
```

### Changes to `KeepAI.run()`

For mutations (`operationType !== 'read'`):

1. Open/init client DB (lazy singleton).
2. Generate `idempotencyKey = crypto.randomUUID()`.
3. Insert into `rpc_log` with `status='pending'`.
4. Pass `idempotencyKey` in the RPC request.
5. On success: update `rpc_log` to `status='done'`, store result.
6. On timeout / transient error: update `rpc_log` to `status='failed'`, store error.
   Print retry hint to stderr.

**How does the client know if an operation is a mutation?** It doesn't need to — the
client can always send an idempotency key. Read operations on the server will simply
ignore it (no DB lookup, no storage). This keeps the client logic simple: always generate
and send a key for `run` commands.

Actually, on reflection, even simpler: **always send an idempotency key for every `run`
call**. The server decides whether to use it based on `operationType`. The client always
records to `rpc_log` for audit/retry purposes, but only mutations get server-side
dedup.

### New CLI command: `npx keepai retry <key>`

```
keepai retry <idempotency_key>
  --timeout <ms>     Request timeout (default: 300000)
```

1. Look up `key` in client DB. If not found, error.
2. Re-read service, method, params, account from the row.
3. Call `KeepAI.run()` but pass the **same** `idempotencyKey` instead of generating a new one.
4. Server returns cached result if it completed, or re-executes if it never ran.
5. Update client DB with result.

### Changes to error output

When a `run` command fails with a timeout or transient error (network error, relay
disconnect), the CLI prints to stderr:

```
Error: RPC timeout after 300000ms

This request may have already executed on the server.
Retry safely with:
  npx keepai retry abc123-def456-...
```

The idempotency key is also included in the JSON error output for programmatic consumers:

```json
{
  "error": "RPC timeout after 300000ms",
  "code": "timeout",
  "idempotencyKey": "abc123-def456-..."
}
```

---

## Server Side

### New DB table: `idempotency_results`

Added via migration 7:

```sql
CREATE TABLE idempotency_results (
  idempotency_key TEXT PRIMARY KEY,
  agent_id        TEXT NOT NULL,
  service         TEXT NOT NULL,
  method          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'executing',  -- executing | done | error
  result          TEXT,          -- JSON, set when done
  error_code      TEXT,          -- set when error
  error_message   TEXT,          -- set when error
  created_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
CREATE INDEX idx_idempotency_agent ON idempotency_results(agent_id);
CREATE INDEX idx_idempotency_created ON idempotency_results(created_at);
```

Rows older than 24 hours are pruned periodically (same mechanism as `rpc_requests`
cleanup).

### New store: `IdempotencyStore`

```typescript
class IdempotencyStore {
  /** Try to claim an idempotency key. Returns 'claimed' if new, 'executing' if in-progress, or the stored result if done. */
  tryClaimOrGet(key: string, agentId: string, service: string, method: string):
    | { status: 'claimed' }
    | { status: 'executing' }
    | { status: 'done'; result: unknown }
    | { status: 'error'; errorCode: string; errorMessage: string };

  /** Mark a claimed key as done with a result. */
  markDone(key: string, result: unknown): void;

  /** Mark a claimed key as errored. */
  markError(key: string, errorCode: string, errorMessage: string): void;

  /** Delete old entries. */
  prune(maxAgeMs: number): number;
}
```

`tryClaimOrGet` uses INSERT OR IGNORE + SELECT in a transaction to atomically claim
or retrieve:

```sql
-- Attempt insert (no-op if key exists)
INSERT OR IGNORE INTO idempotency_results
  (idempotency_key, agent_id, service, method, status) VALUES (?, ?, ?, ?, 'executing');

-- Read current state
SELECT * FROM idempotency_results WHERE idempotency_key = ?;
```

If the row was just inserted (status='executing' and we inserted it), return `'claimed'`.
If it already existed, return based on its status.

### Changes to `RPCRouter.executeServiceMethod()`

After policy check + approval, before calling the connector:

```typescript
// --- Idempotency check (mutations only) ---
if (request.idempotencyKey && metadata.operationType !== 'read') {
  const idem = this.idempotencyStore.tryClaimOrGet(
    request.idempotencyKey, agent.id, service, method
  );

  switch (idem.status) {
    case 'done':
      // Return cached result — skip execution entirely
      return { result: idem.result };
    case 'error':
      return { error: { code: idem.errorCode, message: idem.errorMessage } };
    case 'executing':
      // Another request with same key is in-flight
      return { error: { code: 'already_executing', message: 'Request is already being processed' } };
    case 'claimed':
      // Proceed with execution
      break;
  }
}

// Execute connector...
try {
  const result = await this.connectorExecutor.execute(...);
  // Store result for idempotency
  if (request.idempotencyKey && metadata.operationType !== 'read') {
    this.idempotencyStore.markDone(request.idempotencyKey, result);
  }
  // ... audit log, return result
} catch (err) {
  if (request.idempotencyKey && metadata.operationType !== 'read') {
    this.idempotencyStore.markError(request.idempotencyKey, 'service_error', err.message);
  }
  // ... audit log, return error
}
```

### Scoping idempotency keys to agents

The `idempotency_results` table includes `agent_id`. The server verifies that the key's
`agent_id` matches the requesting agent — one agent can't replay another agent's key.

### What about read operations?

Read operations skip idempotency entirely. No DB lookup, no storage. The key may be
present in the request (client always sends it) but the server ignores it for reads.

---

## Edge Cases

### 1. Server crashes mid-execution (status stuck at 'executing')

The row stays in `executing` state. On retry:
- Client sends same idempotency key.
- Server sees `status='executing'`, returns `already_executing` error.
- This is wrong if the server process actually died.

**Mitigation**: Add a `stale_timeout` (e.g. 10 minutes). If `executing` and
`updated_at < now - stale_timeout`, treat as abandoned:
- Delete the row and let the retry claim it fresh.
- Or mark as `error` and let the client decide.

The safe default is to return an error explaining the situation:
```
"Previous execution started but did not complete (possible server crash).
Cannot safely retry without reconciliation. Check the service directly."
```

**Future**: Reconciliation (see below) can resolve this by checking the service.

### 2. Approval flow + idempotency

The idempotency check happens **after** approval. If the first request was approved but
failed during execution, the retry should **not** require re-approval — the key is
already claimed with approval already granted.

Wait — that's not right. The idempotency claim happens after approval. If approval was
granted, then execution failed, the key is in `error` state. The retry hits the
idempotency check and returns the cached error. That's correct for a service_error
but wrong if we want automatic retry of transient errors.

**Resolution**: For retries, when the cached status is `error` and the error was
transient (network timeout, 5xx from provider), the server should **clear the old
entry and re-execute** rather than returning the cached error. The `error_code` field
distinguishes transient vs permanent errors:
- `service_error` with transient indicator → clear and retry
- `permission_denied`, `invalid_request` → return cached error (retry won't help)

To keep V1 simple: **always return the cached error on retry**. The client/agent sees
the error and can decide whether to generate a new idempotency key for a fresh attempt.
Add smart retry in V2.

### 3. Concurrent duplicate requests (same key)

Two nostr events with the same idempotency key arrive simultaneously (e.g. published
to multiple relays). The `INSERT OR IGNORE` + SELECT approach ensures only one claims
the key. The other gets `already_executing` and the client can handle it as a transient
condition.

This already dovetails with the existing `rpc_requests` deduplication by `event_id`.
Idempotency keys add a higher-level dedup across different events.

### 4. Large results

Some connector results can be large (e.g. full email body). Storing them in
`idempotency_results.result` is fine for 24h retention with periodic pruning. SQLite
handles TEXT blobs efficiently.

### 5. Key format and collision resistance

Client generates keys with `crypto.randomUUID()` (UUIDv4, 122 bits of randomness).
Collision probability is negligible.

---

## Future: Reconciliation (Post-V1)

For the case where the server itself fails mid-execution (e.g. crashes after calling
Gmail API but before writing the result), we need reconciliation:

1. **Provider-level idempotency**: Some APIs (e.g. Stripe) accept idempotency keys
   natively. Pass our key through to the provider.
2. **Read-after-write check**: For mutations like `messages.send`, do a follow-up
   read (e.g. search for the message by subject/recipient/timestamp) to verify whether
   it actually went through.
3. **Manual reconciliation UI**: Show "unresolved" executions in the UI and let the
   user mark them as succeeded or failed.

This is deferred to post-V1 but the schema supports it — the `executing` state with
timestamps provides the data needed.

---

## Implementation Plan

### Phase 1: Client-side (apps/keepai)

1. **Add `better-sqlite3` client DB** in `apps/keepai/src/client-db.ts`:
   - Lazy-open `~/.keepai/client/client.db`
   - Create `rpc_log` table on first open
   - Prune old entries on open
   - Methods: `insert()`, `markDone()`, `markFailed()`, `getByKey()`

2. **Add `idempotencyKey` to `RPCRequest`** in `packages/proto/src/types.ts`.

3. **Update `RPCCaller.call()`** in `packages/nostr-rpc/src/rpc-caller.ts`:
   - Accept optional `idempotencyKey` in params, include in the `RPCRequest` payload.

4. **Update `KeepAI.run()`** in `apps/keepai/src/sdk.ts`:
   - Generate key, write to client DB, pass to caller, update on success/failure.

5. **Add `retry` command** in `apps/keepai/src/cli.ts`:
   - Look up key in client DB, re-run with same key.

6. **Update error handling** in CLI:
   - Print retry hint on timeout/transient errors.

### Phase 2: Server-side (packages/db + apps/keepd)

7. **Add migration 7** in `packages/db/src/migrations/index.ts`:
   - Create `idempotency_results` table.

8. **Add `IdempotencyStore`** in `packages/db/src/stores/idempotency-store.ts`.

9. **Register in `KeepDBApi`** in `packages/db/src/api.ts`.

10. **Update `RPCRouter.executeServiceMethod()`** in `apps/keepd/src/rpc-router.ts`:
    - Add idempotency check before connector execution.
    - Store results after execution.

11. **Add pruning** — prune `idempotency_results` entries older than 24h, triggered
    alongside existing `rpc_requests` cleanup.

### Phase 3: Polish

12. **Add `already_executing`** to `RPCErrorCode` in `packages/proto/src/types.ts`.

13. **Tests**: Unit tests for `IdempotencyStore`, integration test for the full
    retry flow.

---

## Open Questions & Feedback

1. **Client DB necessity**: The client DB (`rpc_log`) gives agents a local record for
   retry. But an alternative is stateless: just print the idempotency key on failure
   and let `retry` accept service+method+params+key as CLI args. The DB approach is
   nicer UX (just `npx keepai retry <key>`) but adds a dependency. Given `better-sqlite3`
   is already a dep of the monorepo (used by keepd), it's not a new dep per se, but it
   does increase the agent-side package weight. **Decision needed**: Is the client DB
   approach acceptable, or should we go stateless on the client?

2. **Idempotency window**: 24h server-side retention seems reasonable. Too short and
   retries fail; too long and the DB grows. Is 24h right, or should it be configurable?

3. **Stale `executing` timeout**: Proposed 10 minutes. If keepd restarts, all
   `executing` entries from before restart are stale. Should we detect keepd restart
   (e.g. via a boot timestamp in settings) and bulk-mark old `executing` entries as
   `error` on startup?

4. **Should `already_executing` be retryable by the client automatically?** If the
   client gets this error, it could poll/retry after a short delay. Or leave it to the
   agent. For V1, returning the error and letting the agent decide seems simplest.

5. **Approval + retry interaction**: If a mutation was approved but the execution timed
   out, should the retry skip approval? The current design says yes (idempotency check
   happens after approval in the first request, and on retry the cached result/error is
   returned before reaching approval). But if the key is in `executing` state and we
   clear it for retry, the retry would go through the full pipeline again including
   approval. This might surprise users. **Proposal**: Store the approval decision in
   `idempotency_results` so retries can skip re-approval.

6. **SDK (programmatic) usage**: The `KeepAI` class is used both by the CLI and by
   agent frameworks programmatically. For programmatic use, the client DB path should
   be configurable. The current `configDir` option already handles this. Should `run()`
   return the `idempotencyKey` alongside the result so SDK consumers can handle retries
   themselves?
