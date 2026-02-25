# 06 - Connectors (Gmail + Notion)

## Overview

Connectors are thin wrappers over official service SDKs. Each connector:
1. Defines available methods and their parameter schemas
2. Extracts permission-relevant metadata from requests (for the policy engine)
3. Provides LLM-friendly help text per method
4. Executes API calls using stored OAuth credentials

V1: Gmail + Notion. Architecture designed for easy addition of more connectors.

## Source: What to Reuse from ../keep.ai

### Copy from `packages/connectors/`:
- `manager.ts` — ConnectionManager (adapt: sync → async ops stay, remove crsqlite deps)
- `oauth.ts` — OAuthHandler (copy as-is, well-designed)
- `store.ts` — CredentialStore (copy as-is, file-based 0o600)
- `types.ts` — Type definitions (extend with method registry types)
- `services/google.ts` — Google OAuth config (keep gmail, remove gdrive/gsheets/gdocs)
- `services/notion.ts` — Notion OAuth config (copy as-is)

### Copy from `packages/agent/src/tools/`:
- `gmail.ts` — Gmail API call patterns (adapt from "tool" to "connector method")
- `google-common.ts` — OAuth client creation, error classification
- `notion.ts` — Notion API call patterns (adapt similarly)

### NEW code:
- Method registry per connector (name, schema, help, opType)
- Permission metadata extraction
- Help text generation (LLM-friendly)
- ConnectorExecutor (dispatch + policy integration)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ConnectorExecutor                                           │
│                                                              │
│  extractPermMetadata(service, method, params, accountId)     │
│  execute(service, method, params, accountId)                 │
│  getHelp(service?)                                           │
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────┐        │
│  │  GmailConnector     │    │  NotionConnector     │        │
│  │                     │    │                      │        │
│  │  methods: {         │    │  methods: {          │        │
│  │    messages.list    │    │    databases.query   │        │
│  │    messages.get     │    │    pages.create      │        │
│  │    messages.send    │    │    pages.update      │        │
│  │    drafts.create    │    │    blocks.children   │        │
│  │    labels.list      │    │    search            │        │
│  │    threads.list     │    │    ...               │        │
│  │    threads.get      │    │  }                   │        │
│  │    ...              │    │                      │        │
│  │  }                  │    │  help()              │        │
│  │                     │    │  extractMeta()       │        │
│  │  help()             │    └──────────────────────┘        │
│  │  extractMeta()      │                                    │
│  └─────────────────────┘                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ConnectionManager (OAuth + credentials)              │   │
│  │  - Token storage, refresh, revocation                 │   │
│  │  - getCredentials(service, accountId) → tokens        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Connector Interface

```typescript
interface ConnectorMethod {
  name: string;              // "messages.list"
  description: string;       // "List messages matching a query"
  operationType: "read" | "write" | "delete";
  params: ParamSchema[];     // Parameter definitions
  returns: string;           // Return type description
  example?: {                // Example for help output
    params: Record<string, unknown>;
    description: string;
  };
}

interface ParamSchema {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];           // Allowed values
}

interface Connector {
  service: string;           // "gmail", "notion"
  name: string;              // "Gmail", "Notion"

  // All methods this connector supports
  methods: ConnectorMethod[];

  // Extract permission metadata from a request
  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata;

  // Execute a method
  execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown>;

  // Generate help output
  help(method?: string): ServiceHelp;
}

interface PermissionMetadata {
  service: string;
  accountId: string;
  method: string;
  operationType: "read" | "write" | "delete";
  resourceType?: string;      // "message", "draft", "label", "page", "database"
  description: string;        // Human-readable: "List unread emails"
}
```

## Gmail Connector

### Methods

| Method | Op Type | Description |
|--------|---------|-------------|
| `messages.list` | read | List messages matching a query |
| `messages.get` | read | Get a message by ID |
| `messages.send` | write | Send an email |
| `messages.trash` | delete | Move a message to trash |
| `messages.modify` | write | Modify message labels |
| `drafts.create` | write | Create a draft email |
| `drafts.list` | read | List drafts |
| `drafts.get` | read | Get a draft by ID |
| `drafts.send` | write | Send a draft |
| `labels.list` | read | List all labels |
| `labels.get` | read | Get a label by ID |
| `threads.list` | read | List email threads |
| `threads.get` | read | Get a thread with all messages |
| `threads.modify` | write | Modify thread labels |
| `profile.get` | read | Get user profile info |

### Implementation

Uses `googleapis` npm package (same as ../keep.ai).

```typescript
// services/gmail.ts

const gmailConnector: Connector = {
  service: "gmail",
  name: "Gmail",
  methods: [
    {
      name: "messages.list",
      description: "List messages matching a query",
      operationType: "read",
      params: [
        { name: "q", type: "string", required: false,
          description: "Gmail search query (e.g., 'from:bob is:unread')" },
        { name: "maxResults", type: "number", required: false,
          description: "Max messages to return (default: 10, max: 100)", default: 10 },
        { name: "labelIds", type: "array", required: false,
          description: "Label IDs to filter by" },
        { name: "pageToken", type: "string", required: false,
          description: "Token for next page" },
      ],
      returns: "{ messages: [{ id, threadId, snippet }], nextPageToken?, resultSizeEstimate }",
      example: {
        params: { q: "is:unread", maxResults: 5 },
        description: "List 5 most recent unread messages",
      },
    },
    // ... more methods
  ],

  extractPermMetadata(method, params, accountId) {
    const methodDef = this.methods.find(m => m.name === method);
    return {
      service: "gmail",
      accountId,
      method,
      operationType: methodDef?.operationType ?? "read",
      resourceType: method.split(".")[0],  // "messages", "drafts", "labels", "threads"
      description: describeGmailRequest(method, params),
    };
  },

  async execute(method, params, credentials) {
    const auth = createGoogleOAuth2Client(credentials);
    const gmail = google.gmail({ version: "v1", auth });

    switch (method) {
      case "messages.list":
        return gmail.users.messages.list({ userId: "me", ...params });
      case "messages.get":
        return gmail.users.messages.get({ userId: "me", id: params.id, ...params });
      case "messages.send":
        return gmail.users.messages.send({ userId: "me", requestBody: params });
      // ... etc
    }
  },
};
```

### Help Output Format

```typescript
function describeGmailRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case "messages.list":
      return params.q ? `Search emails: "${params.q}"` : "List recent emails";
    case "messages.send":
      return `Send email to ${params.to || "recipient"}`;
    case "messages.get":
      return `Read email ${params.id}`;
    // ...
  }
}
```

## Notion Connector

### Account ID

Notion's OAuth token response includes both `workspace_id` (UUID) and
`workspace_name` (human-readable). Account ID is `workspace_id`. The
`workspace_name` is stored in connection metadata and used as display label.
Agents can pass either as `--account` — keepd resolves display names to IDs.

Notion tokens don't expire (no refresh needed). Each workspace requires a
separate OAuth flow.

### Methods

| Method | Op Type | Description |
|--------|---------|-------------|
| `databases.query` | read | Query a database with filters/sorts |
| `databases.retrieve` | read | Get database schema/properties |
| `pages.create` | write | Create a new page |
| `pages.retrieve` | read | Get a page by ID |
| `pages.update` | write | Update page properties |
| `blocks.children.list` | read | List child blocks of a block/page |
| `blocks.children.append` | write | Append blocks to a page |
| `search` | read | Search across the workspace |

### Implementation

Uses `@notionhq/client` npm package (same as ../keep.ai).

```typescript
// services/notion.ts

const notionConnector: Connector = {
  service: "notion",
  name: "Notion",
  methods: [
    {
      name: "databases.query",
      description: "Query a database with optional filters and sorts",
      operationType: "read",
      params: [
        { name: "database_id", type: "string", required: true,
          description: "The database ID to query" },
        { name: "filter", type: "object", required: false,
          description: "Filter object (see Notion API docs)" },
        { name: "sorts", type: "array", required: false,
          description: "Sort criteria" },
        { name: "page_size", type: "number", required: false,
          description: "Number of results (default: 100, max: 100)", default: 100 },
        { name: "start_cursor", type: "string", required: false,
          description: "Pagination cursor" },
      ],
      returns: "{ results: [Page], has_more, next_cursor }",
    },
    // ... more methods
  ],

  async execute(method, params, credentials) {
    const client = new Client({ auth: credentials.accessToken });

    switch (method) {
      case "databases.query":
        return client.databases.query(params);
      case "pages.create":
        return client.pages.create(params);
      // ... etc
    }
  },
};
```

## ConnectorExecutor

Central dispatcher used by keepd:

```typescript
class ConnectorExecutor {
  private connectors: Map<string, Connector>;
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectors = new Map();
    this.connectionManager = connectionManager;
  }

  register(connector: Connector) {
    this.connectors.set(connector.service, connector);
  }

  // Extract permission metadata (called before policy check)
  extractPermMetadata(
    service: string, method: string,
    params: Record<string, unknown>, accountId: string
  ): PermissionMetadata {
    const connector = this.connectors.get(service);
    if (!connector) throw new Error(`Unknown service: ${service}`);
    return connector.extractPermMetadata(method, params, accountId);
  }

  // Execute (called after policy check + approval)
  async execute(
    service: string, method: string,
    params: Record<string, unknown>, accountId: string
  ): Promise<unknown> {
    const connector = this.connectors.get(service);
    if (!connector) throw new Error(`Unknown service: ${service}`);

    const methodDef = connector.methods.find(m => m.name === method);
    if (!methodDef) throw new Error(`Unknown method: ${service}.${method}`);

    // Get fresh credentials (auto-refreshes if needed)
    const credentials = await this.connectionManager.getCredentials({
      service, accountId
    });

    return connector.execute(method, params, credentials);
  }

  // Get help info
  getHelp(service?: string): ServiceHelp | ServiceHelp[] {
    if (service) {
      const connector = this.connectors.get(service);
      if (!connector) throw new Error(`Unknown service: ${service}`);
      const accounts = this.connectionManager.listConnections(service);
      return { ...connector.help(), accounts };
    }
    return [...this.connectors.values()].map(c => {
      const accounts = this.connectionManager.listConnections(c.service);
      return { ...c.help(), accounts };
    });
  }
}
```

## Adding New Connectors (Future)

To add a new connector (e.g., Google Calendar):

1. Add OAuth service definition in `services/google.ts` (scopes, etc.)
2. Create `services/gcalendar.ts` implementing `Connector` interface
3. Define methods with schemas, opTypes, help text
4. Register in ConnectorExecutor
5. Add to connection UI in ui

The interface is deliberately simple — a new connector is ~100-200 lines of code,
mostly method definitions and a switch statement for execution.

## Error Handling

Reuse error classification from ../keep.ai (`packages/proto/src/errors.ts`):

| Error Type | When | Agent sees |
|-----------|------|-----------|
| AuthError | Token expired, revoked | `service_error` + message |
| PermissionError | Insufficient OAuth scope | `service_error` + message |
| NetworkError | API timeout, 5xx, rate limit | `service_error` + retry hint |
| LogicError | Bad params, 4xx from API | `invalid_request` + message |

keepd catches all service errors, classifies them, logs to audit, and returns
appropriate RPC error to the agent. The agent never sees raw service errors.

If AuthError: keepd marks the connection as "error" in DB, notifies ui.
User needs to reconnect the service.
