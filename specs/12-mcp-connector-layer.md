# 12 — MCP-Based Connector Layer

## Problem

The existing Notion connector (`packages/connectors/src/connectors/notion.ts`) hardcodes 8 methods with hand-written param schemas, descriptions, examples, and execution logic — all duplicating what the Notion API already provides. Meanwhile, Notion's OAuth requires a registered app with static HTTPS redirect URIs, which doesn't work for desktop clients.

Notion now offers a **public MCP server** at `https://mcp.notion.com/mcp` that:
- Supports **dynamic client registration** (RFC 7591) — no pre-registered OAuth app needed
- Accepts `http://localhost:*` redirect URIs — works for desktop apps
- Supports **public clients** (`token_endpoint_auth_method: none`) — no client secret
- Provides **13 tools** with rich schemas, descriptions, and annotations via `tools/list`
- Handles OAuth internally — tokens are scoped to the MCP server, no separate Notion API credentials

Other services (GitHub, Linear, Slack, etc.) are shipping public MCP servers too. We should build a **generic MCP→RPC bridge** so adding new MCP-backed services is minimal config, not a new connector.

## Goals

1. Replace the existing Notion connector + OAuth service with an MCP-backed connector
2. Create a reusable `McpConnector` base that any public MCP server can plug into
3. Preserve the existing `Connector` interface so the RPC router, policy engine, approval queue, and audit logger remain unchanged
4. Keep the service-specific layer minimal: just operation type classification + optional customizations

## Design

### Architecture Overview

```
Agent (keepai CLI/SDK)
  ↓ nostr RPC
keepd RPCRouter
  ↓ Connector interface (unchanged)
McpConnector (generic MCP client)
  ↓ MCP Streamable HTTP + OAuth
Public MCP server (mcp.notion.com, etc.)
```

The `McpConnector` is a new class that implements the existing `Connector` interface but delegates execution to a remote MCP server instead of calling service APIs directly. From the RPC router's perspective, nothing changes.

### New Package: `packages/mcp-client`

A lightweight MCP client library (no dependency on `@modelcontextprotocol/sdk` — it's too heavy and designed for stdio/SSE, not our use case). Handles:

1. **OAuth Discovery & Dynamic Registration** — `/.well-known/oauth-authorization-server` + `POST /register`
2. **MCP Session Management** — `initialize` → `notifications/initialized` → tool calls, with `Mcp-Session-Id` header tracking
3. **Tool Execution** — `tools/call` over Streamable HTTP (SSE responses)
4. **Token Lifecycle** — access token refresh via `refresh_token` grant

```
packages/mcp-client/
  src/
    index.ts              # Public exports
    types.ts              # MCP protocol types (jsonrpc, tool schemas, oauth metadata)
    oauth.ts              # McpOAuthClient: discovery, dynamic registration, PKCE auth, token exchange/refresh
    session.ts            # McpSession: init handshake, tool listing, tool calls, session tracking
    transport.ts          # mcpFetch(): Streamable HTTP with SSE parsing, Accept headers, session headers
```

#### `McpOAuthClient`

Handles the full MCP OAuth lifecycle for a single service:

```typescript
interface McpOAuthConfig {
  /** MCP server base URL, e.g. "https://mcp.notion.com" */
  serverUrl: string;
  /** Client name for dynamic registration */
  clientName: string;
  /** Localhost redirect URI, e.g. "http://localhost:9090/oauth/mcp-callback/notion" */
  redirectUri: string;
}

class McpOAuthClient {
  /** Discover OAuth metadata from /.well-known/oauth-authorization-server */
  async discover(): Promise<OAuthMetadata>;

  /** Dynamically register a public client (cached — one registration per serverUrl) */
  async register(): Promise<{ clientId: string }>;

  /** Build authorization URL with PKCE S256 challenge */
  buildAuthUrl(state: string): { url: string; codeVerifier: string };

  /** Exchange authorization code for tokens */
  async exchangeCode(code: string, codeVerifier: string): Promise<McpTokens>;

  /** Refresh an expired access token */
  async refreshToken(refreshToken: string): Promise<McpTokens>;
}
```

**Registration persistence**: The `clientId` from dynamic registration is stored in the credential file alongside tokens. Re-registration happens only if the stored `clientId` is missing or fails.

#### `McpSession`

Manages an MCP session with a 5-minute TTL:

```typescript
const SESSION_TTL_MS = 5 * 60 * 1000;

class McpSession {
  private sessionId: string | null = null;
  private tools: McpTool[] = [];
  private serverVersion: string | null = null;
  private initializedAt = 0;

  constructor(
    private serverUrl: string,
    private mcpEndpoint: string,
    private getAccessToken: () => string
  );

  /** Initialize or re-initialize MCP session. Fetches tool list. */
  async initialize(): Promise<void>;

  /** Ensure session is alive (re-init if TTL expired), return cached tools */
  async ensureSession(): Promise<McpTool[]>;

  /** Call a tool by name with arguments. Auto-reinits on session expiry. */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown>;

  /** Get cached tools (empty before first initialize) */
  get cachedTools(): McpTool[];

  /** Server version from last initialize response */
  get version(): string | null;
}
```

The session auto-reinitializes (and re-fetches `tools/list`) after TTL expiry. The `getAccessToken` callback lets the connector swap in a refreshed token without recreating the session object. If the server returns a session-not-found error, the session re-initializes immediately regardless of TTL.

### McpConnector (in `packages/connectors`)

A new generic connector class that bridges MCP tools to the KeepAI `Connector` interface:

```typescript
// packages/connectors/src/mcp-connector.ts

interface McpConnectorConfig {
  /** Service ID used in RPC, e.g. "notion" */
  service: string;
  /** Display name, e.g. "Notion" */
  name: string;
  /** MCP server base URL */
  serverUrl: string;
  /** MCP endpoint path (default: "/mcp") */
  mcpEndpoint?: string;

  /**
   * Classify each MCP tool into read/write/delete.
   * Falls back to annotation-based heuristic if not specified.
   */
  toolTypes?: Record<string, OperationType>;

  /**
   * Optional: rename MCP tool names to KeepAI method names.
   * e.g. { "notion-search": "search", "notion-fetch": "pages.retrieve" }
   * If not specified, MCP tool names are used as-is.
   */
  methodNames?: Record<string, string>;

  /**
   * Optional: human-readable description for approval queue.
   * Given (mcpToolName, args), return a short string.
   */
  describeRequest?: (method: string, params: Record<string, unknown>) => string;

  /**
   * Called after OAuth completes to determine the account ID.
   * Receives a live MCP session with the new token.
   */
  extractAccountId(session: McpSession): Promise<{
    accountId: string;
    displayName?: string;
  }>;

  /**
   * Optional: static response examples for specific methods.
   * Used in help output where MCP metadata doesn't provide response shapes.
   */
  responseExamples?: Record<string, unknown>;
}
```

#### Operation Type Classification

The MCP spec includes optional `annotations` on each tool. Classification logic (in order):

1. If `toolTypes` override exists for this tool → use it
2. If `readOnlyHint === true` → **read**
3. If `destructiveHint === true` → **delete**
4. **Everything else → write** (the safe default)

The fallback to **write** is intentional: if a tool lacks annotations or has ambiguous ones, it lands in the "ask" policy bucket by default. This means dynamically added or poorly-annotated tools trigger user confirmation — annoying but safe. Users can always loosen policy to "allow" for specific methods after reviewing them.

This heuristic works well for Notion's 13 tools:

| MCP Tool | annotations | Inferred | Override? |
|----------|-----------|----------|-----------|
| `notion-search` | readOnly=true, destructive=false | read | — |
| `notion-fetch` | readOnly=true, destructive=false | read | — |
| `notion-create-pages` | readOnly=false, destructive=false | write | — |
| `notion-update-page` | readOnly=false, destructive=true | delete | **write** |
| `notion-move-pages` | readOnly=false, destructive=false | write | — |
| `notion-duplicate-page` | readOnly=false, destructive=false | write | — |
| `notion-create-database` | readOnly=false, destructive=false | write | — |
| `notion-update-data-source` | readOnly=false, destructive=true | delete | **write** |
| `notion-create-comment` | readOnly=false, destructive=false | write | — |
| `notion-get-comments` | readOnly=true, destructive=false | read | — |
| `notion-get-teams` | readOnly=true, destructive=false | read | — |
| `notion-get-users` | readOnly=true, destructive=false | read | — |

Two tools (`update-page`, `update-data-source`) have `destructiveHint: true` because they *can* delete content, but they're primarily update operations. The `toolTypes` override map handles this:

```typescript
toolTypes: {
  'notion-update-page': 'write',
  'notion-update-data-source': 'write',
}
```

#### ConnectorMethod generation from MCP tools

MCP `tools/list` provides everything needed to build `ConnectorMethod[]`:

```
MCP Tool field          → ConnectorMethod field
─────────────────────────────────────────────────
tool.name               → name (or methodNames[name])
tool.title              → description (fall back to tool.description first line)
tool.description body   → notes (lines after first, with <example> blocks stripped)
tool.description        → example (parsed from first <example> tag)
tool.inputSchema        → params (flattened from JSON Schema)
annotations             → operationType (with toolTypes override)
config.responseExamples → responseExample (optional static override)
cross-references        → seeAlso (auto-derived from tool name mentions in description)
```

The `params` array is derived by flattening the top-level `inputSchema.properties`:
- Each property becomes a `ParamSchema` entry
- `required` array determines `param.required`
- `enum` values from JSON Schema map to `ParamSchema.enum`
- Nested objects stay as `type: 'object'` (the MCP description already explains structure)

**Example parsing**: MCP tool descriptions embed examples in `<example description="...">{ json }</example>` tags. The `McpConnector` parses these when building `ConnectorMethod[]`:
1. Extract all `<example>` blocks from the description text
2. First valid example → `ConnectorMethod.example` (used for CLI help rendering)
3. Strip `<example>` blocks from description before using remainder as `notes`
4. Scan description for mentions of other tool names in this service → `seeAlso`

This means `help` RPC responses are **auto-generated from MCP metadata** — no hand-written method docs, and they stay in sync when the MCP server updates.

#### Tool list caching

`tools/list` is called **once on startup** (or on first request) and cached. The cache is refreshed:
- On `tools/list_changed` notification (if server supports it)
- On session re-initialization after expiry
- On explicit refresh (e.g., daemon restart)

The cached tool list drives both `help()` responses and `methods[]` for the Connector interface.

### Notion-Specific Config

The entire Notion connector becomes a config file:

```typescript
// packages/connectors/src/connectors/notion-mcp.ts

import { McpConnectorConfig } from '../mcp-connector.js';

export const notionMcpConfig: McpConnectorConfig = {
  service: 'notion',
  name: 'Notion',
  serverUrl: 'https://mcp.notion.com',
  mcpEndpoint: '/mcp',

  // Override destructiveHint for update tools (they're writes, not deletes)
  toolTypes: {
    'notion-update-page': 'write',
    'notion-update-data-source': 'write',
  },

  // Optional: shorter names for CLI ergonomics
  methodNames: {
    'notion-search': 'search',
    'notion-fetch': 'fetch',
    'notion-create-pages': 'pages.create',
    'notion-update-page': 'pages.update',
    'notion-move-pages': 'pages.move',
    'notion-duplicate-page': 'pages.duplicate',
    'notion-create-database': 'databases.create',
    'notion-update-data-source': 'data-sources.update',
    'notion-create-comment': 'comments.create',
    'notion-get-comments': 'comments.list',
    'notion-get-teams': 'teams.list',
    'notion-get-users': 'users.list',
  },

  describeRequest(method, params) {
    switch (method) {
      case 'search':
        return params.query ? `Search: "${params.query}"` : 'Search workspace';
      case 'fetch':
        return `Fetch ${params.id || '(unknown)'}`;
      case 'pages.create':
        return `Create ${(params.pages as any[])?.length ?? 1} page(s)`;
      case 'pages.update':
        return `Update page ${params.page_id || '(unknown)'}`;
      default:
        return `${method}`;
    }
  },
};
```

That's it. ~50 lines of Notion-specific code replaces ~380 lines.

### OAuth Flow Changes

#### Current flow (Notion direct API)
1. User clicks "Connect Notion" in UI
2. keepd builds auth URL with pre-registered `clientId` + `clientSecret` from `secrets.build.json`
3. Redirect to `https://api.notion.com/v1/oauth/authorize`
4. **Problem**: redirect URI must be HTTPS and pre-declared — breaks desktop app

#### New flow (MCP OAuth)
1. User clicks "Connect Notion" in UI
2. keepd calls `McpOAuthClient.discover()` → fetches `/.well-known/oauth-authorization-server`
3. keepd calls `McpOAuthClient.register()` → dynamic registration with `http://localhost:9090/oauth/mcp-callback/notion` redirect URI
4. keepd builds auth URL with PKCE S256 (no client secret needed)
5. User completes Notion OAuth in browser → redirected to `http://localhost:9090/...`
6. keepd exchanges code for tokens (with PKCE verifier)
7. Tokens stored in credential store as before

**Key difference**: No `secrets.build.json` entry needed for Notion. No client ID/secret to manage. Dynamic registration handles everything.

#### ConnectionManager integration

The `ConnectionManager` currently assumes all services use the same `OAuthHandler` with static `clientId`/`clientSecret`. For MCP services, we need a different path:

```typescript
// ServiceDefinition gets a new optional field:
interface ServiceDefinition {
  // ... existing fields ...

  /** If set, this service uses MCP OAuth instead of direct OAuth */
  mcpOAuth?: {
    serverUrl: string;
    clientName: string;
  };
}
```

When `mcpOAuth` is set:
- `startOAuthFlow()` uses `McpOAuthClient` instead of `OAuthHandler`
- `completeOAuthFlow()` exchanges with PKCE verifier instead of client secret
- `getCredentials()` refreshes via `McpOAuthClient.refreshToken()` instead of `OAuthHandler.refreshToken()`
- No `getCredentialsForService()` call (no build-time secrets needed)

The `notionService` definition changes:

```typescript
export const notionService: ServiceDefinition = {
  id: 'notion',
  name: 'Notion',
  icon: 'book-open',
  mcpOAuth: {
    serverUrl: 'https://mcp.notion.com',
    clientName: 'KeepAI',
  },
  supportsRefresh: true,  // MCP OAuth supports refresh tokens
  async extractAccountId(tokenResponse) {
    // MCP tokens don't include workspace_id in token response.
    // We need to call the MCP server to get workspace info.
    // Use a lightweight session to call notion-get-users with user_id=self.
    return tokenResponse.workspace_id ?? 'default';
  },
};
```

#### Account ID extraction

With direct Notion OAuth, the token response includes `workspace_id`. With MCP OAuth, the token response is a standard OAuth token without Notion-specific fields. To get the account ID:

1. After token exchange, create a temporary `McpSession`
2. Call `notion-get-users` with `{ user_id: "self" }` to get the current user
3. Use the user's email or workspace info as the account ID
4. Store this in credential metadata

### Credential Storage

MCP credentials are stored in the same `~/.keepai/server/connectors/{service}/{accountId}.json` files, but include MCP-specific fields:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": 1772710320000,
  "tokenType": "bearer",
  "metadata": {
    "displayName": "My Workspace",
    "mcpClientId": "cUXHlpK6DUFaQ3aA",
    "mcpServerUrl": "https://mcp.notion.com"
  }
}
```

The `mcpClientId` is persisted so we don't re-register on every token refresh.

### Connector Registration

In `server.ts`, the old Notion connector registration:

```typescript
// Before
connectorExecutor.register(notionConnector);
connectionManager.registerService(notionService);

// After
const notionMcp = new McpConnector(notionMcpConfig, connectionManager);
await notionMcp.initialize(); // fetches tool list from MCP server
connectorExecutor.register(notionMcp);
connectionManager.registerService(notionMcpService);
```

Gmail stays as-is (direct API connector). No changes to Gmail.

### Error Handling

MCP tool calls can fail with:
- **401/403** — token expired or revoked → trigger token refresh, retry once
- **MCP error response** (`jsonrpc error`) — pass through as `service_error`
- **Network errors** — pass through as `service_error`

The `McpConnector.execute()` method handles retry logic:

```
1. Get credentials from ConnectionManager (auto-refreshes if near expiry)
2. Ensure MCP session is active (re-initialize if expired)
3. Call tool
4. If 401: refresh token, create new session, retry once
5. If MCP error: throw with error message
6. Return result
```

## Files Changed

### New files
- `packages/mcp-client/src/types.ts` — MCP protocol types
- `packages/mcp-client/src/oauth.ts` — `McpOAuthClient`
- `packages/mcp-client/src/session.ts` — `McpSession`
- `packages/mcp-client/src/transport.ts` — HTTP transport with SSE parsing
- `packages/mcp-client/src/index.ts` — exports
- `packages/mcp-client/package.json` — package config
- `packages/mcp-client/tsconfig.json` — TS config
- `packages/connectors/src/mcp-connector.ts` — `McpConnector` class
- `packages/connectors/src/connectors/notion-mcp.ts` — Notion MCP config

### Modified files
- `packages/connectors/src/services/notion.ts` — switch to MCP OAuth config
- `packages/connectors/src/manager.ts` — add MCP OAuth path in `startOAuthFlow()` / `completeOAuthFlow()` / token refresh
- `packages/connectors/src/index.ts` — export `McpConnector`, `notionMcpConfig`; keep `notionConnector` export temporarily
- `apps/keepd/src/server.ts` — register `McpConnector` instead of `notionConnector`
- `package.json` (root) — add `packages/mcp-client` workspace
- `turbo.json` — add `@keepai/mcp-client` to build graph

### Removed files (after migration)
- `packages/connectors/src/connectors/notion.ts` — replaced by MCP connector
- `packages/connectors/src/credentials.ts` — Notion entries removed (Gmail keeps its entries)

### Unchanged
- `packages/proto/src/types.ts` — `Connector` interface stays the same
- `packages/connectors/src/executor.ts` — `ConnectorExecutor` stays the same
- `packages/connectors/src/connectors/gmail.ts` — unchanged
- `apps/keepd/src/rpc-router.ts` — unchanged (talks to `Connector` interface)
- `apps/keepai/` — unchanged (talks RPC, doesn't know about connectors)
- `apps/ui/` — mostly unchanged; connection flow UI stays the same
- Policy engine, approval queue, audit logger — all unchanged

## Migration Path

1. Build `packages/mcp-client` (pure MCP protocol client, no KeepAI deps)
2. Build `McpConnector` in `packages/connectors` (implements `Connector` using `mcp-client`)
3. Add MCP OAuth path to `ConnectionManager`
4. Create `notion-mcp.ts` config
5. Update `server.ts` to register MCP-based Notion connector
6. Test end-to-end: connect Notion → search → create page → approval flow
7. Remove old `notion.ts` connector and direct Notion OAuth config
8. Remove Notion `clientId`/`clientSecret` from `secrets.build.json`

## Future: Adding More MCP Services

To add GitHub (or any service with a public MCP server):

```typescript
// packages/connectors/src/connectors/github-mcp.ts
export const githubMcpConfig: McpConnectorConfig = {
  service: 'github',
  name: 'GitHub',
  serverUrl: 'https://mcp.github.com',
  toolTypes: { /* overrides if needed */ },
  methodNames: { /* friendly names */ },
};
```

Plus a `ServiceDefinition` for OAuth config. That's it — the `McpConnector` base handles everything else.

## Design Decisions

### 1. Account ID Extraction

MCP OAuth tokens are standard OAuth tokens without service-specific fields (no `workspace_id` etc.). Each MCP connector config provides an `extractAccountId` callback that runs after successful token exchange:

```typescript
interface McpConnectorConfig {
  // ... existing fields ...

  /**
   * Called after OAuth completes to determine the account ID.
   * Receives a live MCP session with the new token.
   * Must return { accountId, displayName? }.
   */
  extractAccountId(session: McpSession): Promise<{
    accountId: string;
    displayName?: string;
  }>;
}
```

For Notion:

```typescript
async extractAccountId(session: McpSession) {
  const result = await session.callTool('notion-get-users', { user_id: 'self' });
  // Parse user info from result text
  // result.content[0].text contains user name, email, workspace info
  return {
    accountId: parseWorkspaceId(result), // or email
    displayName: parseWorkspaceName(result),
  };
}
```

This runs once at connection time. The account ID + display name are persisted in credential metadata.

### 2. MCP Session Lifecycle

**Key insight**: MCP Streamable HTTP is request/response — there's no persistent TCP connection. The `Mcp-Session-Id` header lets the server correlate requests, but each HTTP request is independent. However, the MCP `initialize` handshake + `tools/list` call adds overhead (~2 round trips) that we want to amortize.

**Design**: Session-with-TTL pattern.

```
McpSession lifecycle:
  ┌─ initialize() ─── tools/list ─── callTool ─── callTool ─── ... ─── expire ─┐
  │                                                                              │
  │◄────────────── SESSION_TTL (5 minutes) ─────────────────────────────────────►│
  │                                                                              │
  └─ next request: re-initialize() ─── tools/list (refresh!) ─── callTool ──────┘
```

- On first request (or after TTL), `initialize` + `tools/list` → cache session ID + tool list
- Subsequent requests within TTL reuse session ID, skip init
- `tools/list` is re-fetched on every session re-initialization → tool list stays fresh (at most 5 min stale)
- If server returns session-not-found error mid-session → re-initialize immediately
- If server returns 401 → refresh OAuth token, create new session, retry once

**TTL of 5 minutes** balances:
- Reconnection overhead (amortized across requests within window)
- Tool list freshness (refreshed at least every 5 min during active use)
- Server resource usage (sessions don't linger indefinitely)

The `serverInfo.version` from `initialize` response (e.g., `"1.2.0"`) is stored alongside the cached tool list. If the version changes on re-init, we know the tool list may have changed — log it for debugging. But we re-fetch tools on every init regardless, so this is just informational.

**On daemon startup**: The first `McpConnector.initialize()` call establishes a session and populates the tool list. If the MCP server is unreachable at startup, the connector registers with an empty tool list and retries on first request.

### 3. Help UX for MCP-Based Connectors

This is the most important design question. Our help system renders:
- **Level 2** (method list): method name, description, param preview
- **Level 3** (method detail): params table, CLI examples, response examples, notes, seeAlso, query syntax

MCP tool metadata provides rich content but in a different shape. Here's the mapping:

#### What MCP gives us directly

| Help field | MCP source | Quality |
|-----------|-----------|---------|
| `description` | `tool.title` or first line of `tool.description` | Good |
| `params` | `tool.inputSchema.properties` + `required` | Good — full JSON Schema |
| `notes` | `tool.description` body (after first line, excluding `<example>` blocks) | Good — often very detailed |

#### Examples: parse from MCP descriptions

MCP tool descriptions embed structured examples in `<example>` tags:

```
<example description="Search with date range filter">
{
  "query": "quarterly revenue report",
  "query_type": "internal",
  "filters": { ... }
}
</example>
```

We parse these into `ConnectorMethod.example` entries. The parser:
1. Extracts all `<example description="...">{ json }</example>` blocks from the description
2. Uses the **first example** as the primary `example` (shown in Level 3 help)
3. Stores additional examples in a new `examples` array field (optional, for richer help)
4. Strips `<example>` blocks from the description text before using it for `notes`

This generates working CLI examples automatically:
```
npx keepai run notion search --query="quarterly revenue report" --query_type=internal
```

#### Response examples: not available from MCP

MCP tools don't provide response examples in their metadata. Options:
1. **Skip** — no `responseExample` for MCP connectors. Agents see param examples but not response shape.
2. **Static overrides** — the connector config can optionally provide response examples per method.
3. **Capture and cache** — on first successful call, cache the response shape as an example.

**Decision**: Option 1 for v1 (skip), with Option 2 available for services where it matters. The MCP tool descriptions are detailed enough that agents can infer response format. If this becomes a pain point, we add static overrides.

```typescript
interface McpConnectorConfig {
  // ... existing fields ...

  /** Optional static response examples for specific methods */
  responseExamples?: Record<string, unknown>;
}
```

#### seeAlso: derive from description mentions

MCP descriptions often reference other tools by name ("Use the fetch tool for full page contents"). We can scan the description for mentions of other tool names in this service and auto-populate `seeAlso`. Simple regex/substring match against known tool names.

#### Summary: help quality comparison

| Feature | Hand-written (current) | MCP-derived |
|---------|----------------------|-------------|
| Method descriptions | Concise, custom | From `tool.title` — good |
| Param schemas | Hand-written, minimal | From JSON Schema — more complete |
| CLI examples | Hand-written, curated | Parsed from `<example>` tags — good |
| Response examples | Hand-written | Missing (v1) or static override |
| Notes/tips | Hand-written, curated | From description body — often more detailed |
| seeAlso | Hand-written | Auto-derived from cross-references |

**Net assessment**: MCP-derived help is comparable or better for most fields. The main gap is response examples — acceptable for v1 since MCP descriptions are verbose enough. The big win is that help stays **automatically in sync** with the MCP server — no maintenance burden, no staleness.

### 4. Rate Limits

Deferred — pass through MCP error messages as-is for now. Common problem across MCP and direct API, nothing MCP-specific to design here.
