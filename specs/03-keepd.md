# 03 - keepd (Daemon)

## Overview

keepd is the trusted daemon running on the user's device. It holds credentials,
enforces policies, processes agent requests, and serves the ui web interface.

Runs as a Fastify server on localhost. Packaged inside the electron app but can
also run standalone (npm, Docker).

## Source: What to Reuse from ../keep.ai

### Copy and adapt from `apps/server/`:
- `server.ts` — Fastify setup, static file serving, lifecycle management
  - Strip: agent scheduler, workflow scheduler, push notifications, file transfer
  - Keep: server creation pattern, static file serving, config loading
- `routes/connectors.ts` — OAuth flow routes (connect, callback, disconnect, check, list)
  - Copy mostly as-is, update imports
- `tsup.config.ts` — Build config with secret injection pattern

### Copy and adapt from `packages/connectors/`:
- `manager.ts` — ConnectionManager (credential lifecycle, token refresh)
- `oauth.ts` — OAuthHandler (auth URL generation, code exchange, token refresh)
- `store.ts` — CredentialStore (file-based, 0o600 permissions)
- `types.ts` — Service/OAuth type definitions
- `db-adapter.ts` — Adapt for better-sqlite3 (sync instead of async)
- `services/google.ts` — Google OAuth service definitions
- `services/notion.ts` — Notion OAuth service definition

### NEW code needed:
- Agent management (pairing, identity, sessions)
- Policy engine (JSON-based, per-agent per-service)
- Approval queue (persistent, hash-verified)
- Nostr RPC handler (listening for agent requests)
- Connector executor (dispatch requests to service APIs with policy checks)
- SSE endpoint for ui real-time updates
- Audit logging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  keepd                                                       │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ HTTP Routes  │    │ Nostr RPC    │    │  SSE Endpoint │  │
│  │ (Fastify)   │    │ Handler      │    │  (real-time)  │  │
│  └──────┬──────┘    └──────┬───────┘    └───────┬───────┘  │
│         │                  │                    │            │
│  ┌──────┴──────────────────┴────────────────────┴───────┐   │
│  │                    Service Layer                       │   │
│  │                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ AgentManager │  │ PolicyEngine │  │  Approval   │ │   │
│  │  │              │  │              │  │  Queue      │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  │                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ Connection   │  │ Connector    │  │  Audit     │ │   │
│  │  │ Manager      │  │ Executor     │  │  Logger    │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ SQLite DB    │  │ Credential   │  │  Policy Files    │  │
│  │ (better-     │  │ Files        │  │  (JSON)          │  │
│  │  sqlite3)    │  │ (0o600)      │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## HTTP API Routes (for ui)

### Connections (OAuth)
Copied from ../keep.ai `routes/connectors.ts` with minimal changes.

```
GET    /api/connections                     List all connections
GET    /api/connections/services            List available services
POST   /api/connections/:service/connect    Start OAuth flow → { authUrl }
GET    /api/connections/:service/callback   OAuth callback (redirect from provider)
DELETE /api/connections/:service/:accountId Disconnect (revoke + delete)
POST   /api/connections/:service/:accountId/check  Test connection
```

### Agents
```
GET    /api/agents                   List paired agents (name, pubkey, status, last_seen)
POST   /api/agents/new?name=openclaw  Generate pairing code → { code }
                                     Name is required, chosen by user in ui.
DELETE /api/agents/:agentId          Revoke agent (delete identity + policies)
GET    /api/agents/:agentId          Get agent details
```

Pairing flow from ui perspective:
1. User clicks "Add Agent", enters name "openclaw"
2. ui calls `POST /api/agents/new?name=openclaw` → gets `{ code }`
3. ui shows: "Tell your agent to run: `npx keepai init <code>`"
4. Agent runs init → sends "pair" RPC with secret
5. keepd verifies secret, creates agent record with the user-chosen name
6. keepd emits SSE event: `pairing_completed` with agent record
7. ui receives SSE event, shows success

Agent name is **always chosen by the user** — never by the agent. This prevents
phishing where a malicious agent names itself "trusted_admin" or similar.

### Policies
```
GET    /api/agents/:agentId/policies                List all policies for agent
GET    /api/agents/:agentId/policies/:service       Get policy for agent+service
PUT    /api/agents/:agentId/policies/:service       Update policy
         body: { default: "ask", rules: [...] }
```

### Approval Queue
```
GET    /api/queue                    List pending approvals
POST   /api/queue/:id/approve       Approve request
POST   /api/queue/:id/deny          Deny request
```

### Logs
```
GET    /api/logs                     List audit log entries
         query: { agent?, service?, from?, to?, limit?, offset? }
```

### Real-time (SSE)
```
GET    /api/events                   SSE stream for ui
         Events:
         - approval_request: new item in approval queue
         - approval_resolved: item approved/denied
         - pairing_completed: agent finished pairing
         - agent_connected: agent came online
         - agent_disconnected: agent went offline
         - request_completed: agent request finished (for logs)
```

### Config
```
GET    /api/config                   Get daemon config (port, relays, etc.)
PUT    /api/config                   Update daemon config
GET    /api/status                   Health check + summary stats
```

## Nostr RPC Handler

keepd runs an RPC handler (from `@keepai/nostr-rpc`) that:

1. Subscribes to RPC_REQUEST events tagged to any of its per-agent pubkeys
   (from `agents` + `pending_pairings` tables). Updates subscription on pair/revoke.
2. For each request:
   a. Identify agent by the `p` tag (which per-agent keepd pubkey was targeted)
      → look up in agents table (or pending_pairings for "pair" method)
   b. Decrypt using the matching per-agent keypair
   c. Reject if pubkey not recognized
   d. Route to appropriate handler based on method (and service, if present)

### RPC Methods

| Method | Service | Description |
|--------|---------|-------------|
| `pair` | — | Complete pairing handshake (exchanges protocolVersion + version) |
| `ping` | — | Health check / keepalive (returns protocolVersion + version) |
| `help` | — | List available services and methods |
| `help` | `gmail` etc. | Detailed help for a service |
| `messages.list`, etc. | `gmail` etc. | Execute a service operation |

### Request Processing Pipeline

```
Incoming RPC Request
        │
        ▼
  ┌─────────────┐
  │ Decrypt &   │
  │ Parse       │──── invalid ──► REJECT (invalid_request)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │ Identify    │
  │ Agent       │──── unknown ──► REJECT (unauthorized)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │ Route to    │
  │ Handler     │──── unknown service/method ──► REJECT (not_found)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │ Validate    │
  │ Account     │──── not connected ──► RESPONSE (error: service_not_connected)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │ Extract     │
  │ Perm Meta   │  connector.extractPermMetadata(service, method, params)
  └──────┬──────┘  → { service, accountId, opType, resourceType, description }
         │
  ┌──────▼──────┐
  │ Policy      │
  │ Check       │──── "deny" ──► RESPONSE (error: permission_denied)
  └──────┬──────┘
         │ "allow" or "ask"
         │
  ┌──────▼──────┐
  │ Approval    │  if "ask":
  │ Flow        │  1. Write request to temp file
  │ (if needed) │  2. Hash → store in queue DB
  └──────┬──────┘  3. Push SSE event to ui
         │         4. Wait for approval (or timeout)
         │         5. Verify hash on approval
         │
  ┌──────▼──────┐
  │ Execute     │
  │ Connector   │  connector.execute(method, params, credentials)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │ Audit Log   │
  │ + Respond   │
  └─────────────┘
```

## Agent Management

### AgentManager

```typescript
class AgentManager {
  // Generate pairing code. Creates a new keypair for this agent connection.
  // Name chosen by user in ui. Keypair stored in pending_pairings table.
  createPairing(name: string): { code: string }

  // Complete pairing (called from RPC handler on "pair" method).
  // Name + keypair already stored from createPairing — agent cannot override.
  // Moves keypair from pending_pairings to agents table.
  completePairing(agentPubkey: string, secret: string): Agent

  // Look up agent by the per-agent keepd pubkey (from the "p" tag on incoming request)
  getAgentByKeepdPubkey(pubkey: string): Agent | null

  // List all agents
  listAgents(): Agent[]

  // Revoke agent access
  revokeAgent(agentId: string): void

  // Update last seen
  touchAgent(agentId: string): void
}
```

### Pairing Code Lifecycle

1. User clicks "Add Agent" in ui, enters name "openclaw"
2. ui calls `POST /api/agents/new?name=openclaw`
3. keepd generates:
   - New nostr keypair for this agent connection
   - `secret` (random hex, one-time)
   - Stores in DB: `pending_pairings` table: `{name, secret, keepd_pubkey, keepd_privkey, expires_at}`
   - Updates nostr subscription to include the new pubkey
   - Creates pairing code: base64url({ pubkey, relays, secret })
   - Returns `{ code }`
4. ui displays: "Tell your agent to run: `npx keepai init <code>`"
5. Agent runs `npx keepai init <code>`:
   - Decodes code → gets per-agent keepd pubkey, relays, secret
   - Generates its own keypair, stores in `~/.keepai/client/identity.json`
   - Sends "pair" RPC encrypted to per-agent keepd pubkey, with `{ secret }`
6. keepd receives on the per-agent pubkey, verifies secret matches pending pairing
7. Creates agent record with user-chosen name, agent's pubkey, and the keypair
   from pending_pairings. Deletes pending pairing (single-use).
8. keepd emits SSE event: `pairing_completed` with agent record
9. ui receives SSE event, shows success

Expiry: pending pairings expire after 10 minutes (configurable).
Expired pairings are cleaned up and their pubkeys removed from the subscription.

## Connector Executor

See [06-connectors.md](./06-connectors.md) for detailed connector design.

The executor sits between the policy engine and the actual service API:

```typescript
class ConnectorExecutor {
  // Execute a service request
  async execute(
    service: string,
    method: string,
    params: unknown,
    accountId: string
  ): Promise<unknown>

  // Extract permission-relevant metadata from a request
  extractPermMetadata(
    service: string,
    method: string,
    params: unknown,
    accountId: string
  ): PermissionMetadata

  // Get help for a service (or all services)
  getHelp(service?: string): ServiceHelp | ServiceHelp[]
}
```

## Approval Queue

### Queue Entry

```typescript
interface ApprovalEntry {
  id: string;
  agentId: string;
  agentName: string;
  service: string;
  method: string;
  accountId: string;
  operationType: "read" | "write" | "delete";
  description: string;       // Human-readable: "Send email to bob@example.com"
  requestHash: string;       // SHA-256 of temp file contents
  tempFilePath: string;      // Path to temp request file
  status: "pending" | "approved" | "denied" | "expired";
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: "user" | "timeout" | "policy";
}
```

### Approval Flow

1. Request needs approval → write full request JSON to temp file in `~/.keepai/server/temp/`
2. Compute SHA-256 hash of file contents
3. Insert into `approval_queue` table: { id, hash, agent, service, method, status: "pending" }
4. Emit SSE event: `approval_request` with entry details (minus the actual request payload)
5. Desktop notification via electron: "openclaw wants to send email — click to review"
6. RPC handler polls DB every 500ms: `SELECT status FROM approval_queue WHERE id = ?`
7. Meanwhile, user sees approval card in ui (reads details from API, which reads temp file)
8. User clicks [Approve]:
   a. HTTP handler reads temp file, computes hash
   b. Compares hash with DB entry → match means file wasn't tampered
   c. Updates DB: status = "approved"
9. RPC handler's next poll sees status = "approved" → executes request, sends response
10. Clean up: delete temp file, keep DB entry for audit

**Signaling**: The DB is the sole communication channel between the HTTP handler
(which processes the user's approve/deny click) and the RPC handler (which is
waiting for the decision). No in-process events or callbacks — just DB polling.
This decouples approval channels: UI, future Telegram/Slack, or CLI can all
approve by writing to the same `approval_queue` table.

### Timeout

Default: 5 minutes. If the RPC handler's poll loop exceeds the timeout:
- Update DB: status = "expired"
- Return error to agent: `{ error: { code: "approval_timeout" } }`
- Clean up temp file

## Audit Log

Every request gets logged — whether auto-approved, manually approved, denied by
policy, denied by user, or timed out:

```typescript
interface AuditEntry {
  id: string;
  agentId: string;
  agentName: string;
  service: string;
  method: string;
  accountId: string;
  operationType: string;
  policyAction: "allow" | "deny" | "ask";  // What the policy said
  approved: boolean;                // Whether it was ultimately approved
  approvedBy?: "policy" | "user" | "timeout";  // Who resolved it
  requestSummary?: string;          // Brief description
  responseStatus: "success" | "error";
  errorMessage?: string;
  durationMs: number;
  createdAt: number;
}
```

## Server Startup

```typescript
async function createServer(config: {
  port?: number;             // Default: 9090
  host?: string;             // Default: "127.0.0.1"
  dataDir?: string;          // Default: "~/.keepai/server"
  serveStaticFiles?: boolean; // Default: true
  staticFilesRoot?: string;   // Default: "../public"
}) {
  // 1. Ensure data directory exists
  // 2. Open SQLite database (better-sqlite3)
  // 3. Run migrations
  // 4. Initialize ConnectionManager (OAuth + credential store)
  // 5. Initialize AgentManager
  // 6. Initialize PolicyEngine
  // 7. Initialize ConnectorExecutor
  // 8. Initialize ApprovalQueue
  // 9. Initialize AuditLogger
  // 10. Start Nostr RPC handler (subscribe for all active agent + pending pairing pubkeys)
  // 11. Register HTTP routes
  // 12. Register SSE endpoint
  // 13. Serve static files (ui)
  // 14. Return { listen(), close() }
}
```

## Configuration

keepd config stored in `~/.keepai/server/settings.json`:

```json
{
  "port": 9090,
  "relays": ["wss://relay1.getkeep.ai", "wss://relay2.getkeep.ai"],
  "approvalTimeoutMs": 300000,
  "pairingExpiryMs": 600000
}
```

For Docker deployment:
```
KEEPAI_PORT=9090
KEEPAI_DATA_DIR=/data
KEEPAI_RELAYS=wss://relay1.getkeep.ai,wss://relay2.getkeep.ai
KEEPAI_GOOGLE_CLIENT_ID=...
KEEPAI_GOOGLE_CLIENT_SECRET=...
KEEPAI_NOTION_CLIENT_ID=...
KEEPAI_NOTION_CLIENT_SECRET=...
```

Runtime env vars override both build-time injected secrets and settings.json.
