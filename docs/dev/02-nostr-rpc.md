# 02 - Nostr RPC Protocol

## Overview

KeepAI agents communicate with keepd over an e2e encrypted RPC protocol built on
nostr relays. This protocol reuses the encryption and streaming primitives from
`../keep.ai/packages/sync/src/nostr/stream/` but adds a request-response RPC
layer on top, structurally similar to `FileSender/FileReceiver` but JSON-RPC focused.

## Protocol Stack

```
┌─────────────────────────────────────────────────┐
│  RPC Layer                                       │
│  REQUEST → READY/REJECT → stream → RESPONSE     │
│  JSON-RPC-like method calls                      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│  Streaming Layer (NIP-173)                       │
│  StreamWriter / StreamReader                     │
│  Chunked data with linked list chain             │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│  Encryption Layer (NIP-44 v3)                    │
│  ChaCha20 + HMAC-SHA256, up to 1MB per chunk    │
│  Conversation key from ECDH + HKDF              │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│  Nostr Transport                                 │
│  Event signing, relay publish/subscribe          │
│  SimplePool from nostr-tools                     │
└──────────────────────────────────────────────────┘
```

## Source: What to Reuse from ../keep.ai

Copy from `packages/sync/src/nostr/`:
- `nip44-v3.ts` — NIP-44 v3 encryption (extended payload, up to 1MB)
- `stream/encryption.ts` — Encryption wrapper (supports none/nip44/nip44_v3)
- `stream/StreamWriter.ts` — Chunked stream sender
- `stream/StreamReader.ts` — Chunked stream receiver with buffering
- `stream/metadata.ts` — Stream metadata event creation/parsing
- `stream/types.ts` — Type definitions and constants
- `stream/common.ts` — Event creation, signing, relay publishing utilities
- `stream/DefaultStreamFactory.ts` — Factory for reader/writer

Do NOT copy:
- `NostrTransport.ts` — CRSqlite sync transport (not needed)
- `NostrConnector.ts` — Rewrite for our simpler pairing flow
- `FileSender.ts` / `FileReceiver.ts` — Rewrite as RPC caller/handler

## Event Kinds

| Kind | Name | Purpose |
|------|------|---------|
| 21700 | RPC_REQUEST | Agent sends request to keepd |
| 21701 | RPC_READY | Peer acknowledges, ready to receive stream (both directions) |
| 21702 | RPC_REJECT | keepd rejects request (fast fail) |
| 21703 | RPC_RESPONSE | keepd sends response to agent |
| 21704 | RPC_READY_RESPONSE | Agent acknowledges, ready to receive response stream |
| 20173 | STREAM_CHUNK | Streaming data chunks (reuse from NIP-173) |
| 173 | STREAM_METADATA | Stream metadata event (reuse from NIP-173) |

Note: kind numbers are tentative. Using 217xx range (ephemeral-ish, custom).

## RPC Message Format

### Request (agent → keepd)

```typescript
interface RPCRequest {
  id: string;           // Unique request ID (random hex)
  method: string;       // "messages.list", "search", "pair", "ping", "help"
  service?: string;     // "gmail", "notion" — required for service operations
  params?: unknown;     // Method-specific parameters
  account?: string;     // Target account ID (e.g., "user@gmail.com")
  protocolVersion: number; // RPC protocol version (currently 1)
  version: string;      // keepai software version (semver)
}
```

### Response (keepd → agent)

```typescript
interface RPCResponse {
  id: string;           // Matches request ID
  protocolVersion: number; // RPC protocol version (currently 1)
  version: string;      // keepd software version (semver)
  result?: unknown;     // Success payload
  error?: RPCError;     // Error payload (mutually exclusive with result)
}

interface RPCError {
  code: string;         // "not_found", "permission_denied", "approval_timeout",
                        // "service_error", "invalid_request", "internal_error",
                        // "incompatible_protocol"
  message: string;      // Human-readable error description
}
```

## Request Flow

### Small Request (inline payload)

For requests where the full JSON is small (< ~100KB):

```
Agent                               keepd
  │                                   │
  │─── RPC_REQUEST ──────────────────►│  kind: 21700
  │    content: encrypted({           │  tags: [["p", keepd_pubkey]]
  │      id, method, params, account  │
  │    })                             │
  │                                   │  (validate, check agent identity)
  │                                   │
  │◄── RPC_RESPONSE ─────────────────│  kind: 21703
  │    content: encrypted({           │  tags: [["e", request_event_id],
  │      id, result                   │         ["p", agent_pubkey]]
  │    })                             │
  │                                   │
```

### Large Request (streamed payload)

When request payload is too large for inline (e.g., sending email with attachments):

```
Agent                               keepd
  │                                   │
  │─── RPC_REQUEST ──────────────────►│  kind: 21700
  │    content: encrypted({           │  Contains stream metadata for
  │      id, method, account,         │  the request payload stream
  │      stream: <metadata_event>     │
  │    })                             │
  │                                   │  (validate agent, prepare to receive)
  │                                   │
  │◄── RPC_READY ────────────────────│  kind: 21701
  │    tags: [["e", request_id]]      │  (confirms keepd is listening)
  │                                   │
  │═══ STREAM_CHUNK ═════════════════►│  kind: 20173 (multiple chunks)
  │═══ STREAM_CHUNK ═════════════════►│  linked list via "prev" tags
  │═══ STREAM_CHUNK (done) ══════════►│  status: "done" on last chunk
  │                                   │
  │                                   │  (process request)
  │                                   │
  │◄── RPC_RESPONSE ─────────────────│  kind: 21703 (inline or streamed)
  │                                   │
```

### Large Response (streamed)

When response is too large for inline. Symmetric with large request flow —
agent sends READY_RESPONSE to confirm it's alive before keepd starts streaming.
This matters because response may come after a long approval wait (user might
take minutes to approve), and the agent might have gone offline. Without READY
confirmation, keepd would waste bandwidth and relay storage streaming into void.

```
Agent                               keepd
  │                                   │
  │◄── RPC_RESPONSE ─────────────────│  kind: 21703
  │    content: encrypted({           │  Contains stream metadata for
  │      id,                          │  the response payload stream
  │      stream: <metadata_event>     │
  │    })                             │
  │                                   │
  │─── RPC_READY_RESPONSE ──────────►│  kind: 21704
  │    tags: [["e", response_id]]     │  (confirms agent is ready to receive)
  │                                   │
  │◄═══ STREAM_CHUNK ════════════════│  kind: 20173
  │◄═══ STREAM_CHUNK ════════════════│
  │◄═══ STREAM_CHUNK (done) ═════════│
  │                                   │
```

If agent doesn't send READY_RESPONSE within 60s, keepd drops the pending
response stream and cleans up. Agent can retry the full request if needed.

### Rejection (fast fail)

When keepd can immediately reject (unknown agent, invalid method, service not
connected):

```
Agent                               keepd
  │                                   │
  │─── RPC_REQUEST ──────────────────►│
  │                                   │
  │◄── RPC_REJECT ───────────────────│  kind: 21702
  │    content: encrypted({           │  tags: [["e", request_event_id]]
  │      id, error: { code, message } │
  │    })                             │
  │                                   │
```

## Pairing Protocol

### Connection Code Format

keepd generates a **per-agent keypair** and pairing code containing:
```typescript
{
  pubkey: string;        // Unique pubkey for this agent connection (hex)
  relays: string[];      // Relay URLs
  secret: string;        // One-time pairing secret (random hex)
  protocolVersion: number; // RPC protocol version (starts at 1)
}
```

Encoded as base64url string. Each pairing code gets its own keypair — keepd has no
global identity. This provides isolation: revoking one agent's access (deleting its
keypair) doesn't affect other agents. The privkey is stored in the DB alongside the
pairing/agent record. Presented to user in ui as copyable text.

### Pairing Flow

```
Agent                               keepd
  │                                   │
  │  (user runs: npx keepai init <code>)
  │  (agent decodes code, gets pubkey + relays + secret + protocolVersion)
  │  (agent checks protocolVersion — fail fast if unsupported)
  │  (agent generates its own keypair, stores in ~/.keepai/client/)
  │                                   │
  │─── RPC_REQUEST ──────────────────►│  (encrypted to per-agent pubkey from code)
  │    method: "pair"                 │
  │    params: {                      │
  │      secret: "<pairing_secret>",  │
  │      protocolVersion: 1,          │
  │      version: "0.1.0"            │  (keepai software version)
  │    }                              │
  │                                   │  (verify secret matches pending pairing)
  │                                   │  (reject if protocolVersion mismatch)
  │                                   │  (register agent pubkey, move keypair to
  │                                   │   agents table with user-chosen name)
  │                                   │  (delete pending pairing - single use)
  │                                   │
  │◄── RPC_RESPONSE ─────────────────│
  │    result: {                      │
  │      paired: true,                │  (no name/id revealed to agent)
  │      protocolVersion: 1,          │
  │      version: "0.1.0"            │  (keepd software version)
  │    }                              │
  │                                   │
```

After pairing, keepd identifies the agent by the pubkey it sent the request to
(the per-agent keepd pubkey from the pairing code). The pairing secret is never
used again.

## Encryption Details

Reuse NIP-44 v3 from ../keep.ai:
- ECDH key exchange: agent privkey + per-agent keepd pubkey → shared secret
- HKDF-SHA256 for key derivation
- ChaCha20 for encryption, HMAC-SHA256 for authentication
- Max chunk payload: ~512KB binary (683KB base64)
- Conversation key cached per peer pair

Each agent has a unique conversation key (derived from its own keypair + the
per-agent keepd keypair). All RPC events (REQUEST, READY, REJECT, RESPONSE) are
encrypted with NIP-44 v3 using this conversation key. Stream chunks are encrypted
using ephemeral keys as in the existing streaming protocol.

## Relay Configuration

Default relays (configurable):
- `wss://relay1.getkeep.ai` and `wss://relay2.getkeep.ai`
- no fallbacks, no relay in config - fail with error

Relays specified in:
- Pairing code (keepd tells agent which relays to use)
- keepd config `~/.keepai/server/settings.json`
- keepai can't dictate to keepd which relays to use

## Relay Resilience (V1)

All relays act as full mirrors — both sides publish events to all configured relays
and deduplicate received events by nostr event ID. Relay handling patterns reused
from `../keep.ai/packages/sync/src/nostr/` (SimplePool from nostr-tools).

**V1 guarantees:**
- Requests that don't get a response within the timeout simply fail — agent retries
  with a new event ID if desired
- Duplicate events (from reconnection, multiple relays) are harmless — deduped by
  event ID on both sides (keepd via `rpc_requests` table, agent by request ID matching)
- If a relay drops, the other relay provides redundancy

**Deferred to post-V1** (based on real-world testing):
- Request expiry / TTL on relay
- Idempotency keys for non-idempotent operations
- Explicit reconnection strategies / backoff
- Relay health monitoring and failover logic
- Offline request queueing on the agent side

## Subscriptions

### keepd subscribes to:
```
filter: { kinds: [21700], "#p": [agent1_keepd_pubkey, agent2_keepd_pubkey, ...], since: <now - 10s> }
```
Watches for incoming RPC_REQUEST events tagged to any of its per-agent pubkeys.
The `#p` list includes pubkeys from all active agents AND pending pairings.
Subscription is updated when agents are paired or revoked. -10s for clock drift.

Also, when waiting for agent READY_RESPONSE for a streamed response:
```
filter: { kinds: [21704], "#e": [response_event_id], since: <now - 10s> }
```

### Agent subscribes to (per request):
```
filter: { kinds: [21701, 21702, 21703], "#e": [request_event_id], since: <now - 10s> }
```
Watches for READY/REJECT/RESPONSE events referencing its request.

For streamed responses, agent also subscribes to stream chunks using the
stream metadata from the RESPONSE event.

## Versioning

Two version identifiers are exchanged between keepai and keepd:

| Version | Type | Purpose |
|---------|------|---------|
| `protocolVersion` | integer | RPC wire format version. Starts at `1`. Bumped only for breaking changes (message structure, encryption, event kinds). Mismatch = reject. |
| `version` | semver string | Software version (e.g., `"0.1.0"`). Informational — for diagnostics, logs, and future feature negotiation. |

**Where versions appear:**
- **Pairing code**: includes `protocolVersion` so agent can fail fast before connecting
- **Every RPCRequest**: agent sends its `protocolVersion` + `version`
- **Every RPCResponse**: keepd sends its `protocolVersion` + `version`

Both fields are required on every request and response. Either side may upgrade
independently after pairing, so version info must be checked on every call, not
just at pairing time.

**V1 behavior**: keepd rejects any request with an incompatible `protocolVersion`,
with error `{ code: "incompatible_protocol", message: "Protocol version 2 not supported, expected 1. Please update keepai." }`.
No downgrade logic — both sides must speak the same protocol version.

## Timeouts

| Operation | Default | Notes |
|-----------|---------|-------|
| Request → RESPONSE/REJECT | 300s (5 min) | Overall request timeout. Includes potential user approval wait. No separate READY timeout — READY is only exchanged for streamed payloads and is covered by this overall timeout. |
| RESPONSE → READY_RESPONSE | 60s | Agent must confirm readiness for streamed response. If not received, keepd drops the response. |
| Stream chunk interval | 60s | TTL between consecutive chunks within a stream |
| Pairing code validity | 10 min | Code expires if not used |

There is no separate "READY timeout" for the request direction. The READY event
is only exchanged when the request payload needs streaming (too large for inline).
If keepd never sends READY (because it's offline or rejects), the agent simply
hits the overall 5-minute timeout. The agent cannot know in advance whether keepd
will need READY (since keepd decides based on its own state), so a single timeout
keeps things simple. Agents should assume any request might take up to the full
timeout and might get interrupted.

## Request Deduplication

**Critical**: keepd MUST deduplicate incoming RPC_REQUEST events. Nostr relays may
deliver the same event multiple times (reconnection, multiple relays, subscription
overlap). Without deduplication, a single agent request could be executed twice.

**Implementation**:
- When keepd receives an RPC_REQUEST, it writes the nostr event ID to the DB
  as the primary key of the request record before any processing.
- If the event ID already exists in DB → silently ignore (already being processed
  or already completed).
- The request record tracks status: `received` → `processing` → `responded` / `rejected`.
- Agent retries on timeout by sending a NEW RPC_REQUEST event (new event ID).
  The old request record remains in DB; it will be cleaned up on schedule.
- This also protects against replay attacks where old events resurface from relays.

```sql
-- In the requests table (part of keepd's DB, not the shared schema)
CREATE TABLE rpc_requests (
  event_id TEXT PRIMARY KEY,       -- Nostr event ID (dedup key)
  request_id TEXT NOT NULL,        -- RPC request.id (for response correlation)
  agent_pubkey TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',  -- received, processing, responded, rejected
  created_at INTEGER NOT NULL,
  responded_at INTEGER
);

CREATE INDEX idx_rpc_requests_created ON rpc_requests(created_at);
```

Cleanup: delete records older than 1 hour (well beyond the 5-min request timeout).

## Implementation Plan

### @keepai/nostr-rpc package

**rpc-caller.ts** (used by keepai CLI/SDK):
- `call(method, params, options?)` → Promise<result>
- Handles request creation, encryption, publishing
- Waits for REJECT/RESPONSE (and sends READY_RESPONSE for streamed replies)
- Handles streaming for large payloads (both directions)
- Single overall timeout (default 5 min)

**rpc-handler.ts** (used by keepd):
- `listen(callback)` → subscribe to RPC_REQUEST events
- **Deduplicates** by event ID (writes to DB before processing, ignores known IDs)
- Dispatches to handler callback with request context
- Sends READY (for streamed requests) / REJECT / RESPONSE
- For streamed responses: waits for READY_RESPONSE from agent before streaming
- Handles streaming for large request/response payloads

**pairing.ts**:
- `generatePairingCode(pubkey, relays, secret)` → code string
- `parsePairingCode(code)` → { pubkey, relays, secret }
- `executePairing(code, agentName)` → { paired, agentId, name }

**Copied/adapted files from ../keep.ai:**
- encryption.ts, stream-writer.ts, stream-reader.ts, metadata.ts, types.ts, common.ts
- nip44-v3.ts (into this package or shared)
