# Notion Connector — MCP → OAuth2 + SDK Refactor

## Summary

Replace the current MCP-based Notion integration with a direct OAuth2 + `@notionhq/client` SDK connector, following the same pattern as the Cloudflare and Stripe connectors.

**Current state**: Notion uses MCP OAuth (dynamic client registration against `mcp.notion.com`) and the `McpConnector` class, exposing ~13 tools with schemas pulled from the MCP server at runtime.

**Target state**: Standard OAuth2 flow (pre-registered client ID/secret) using `https://api.notion.com/v1/oauth/authorize`, with `@notionhq/client` SDK for execution and hand-written method definitions (like Cloudflare/Stripe).

**No backward compat needed** — existing Notion access tokens will fail; users reconnect.

## Why

1. MCP server exposes only 13 tools with limited capabilities (no blocks API, no views, no file uploads, no dataSources.query, etc.)
2. The official SDK provides ~40+ methods across 9 resource groups with full API coverage
3. Direct OAuth2 with pre-registered client is simpler and more reliable than MCP OAuth's dynamic registration + session management
4. Method params are statically defined — no runtime MCP tool discovery, faster startup, works offline for schema browsing

## Authentication: OAuth2

### OAuth config

| Field | Value |
|-------|-------|
| Auth URL | `https://api.notion.com/v1/oauth/authorize` |
| Token URL | `https://api.notion.com/v1/oauth/token` |
| Scopes | (none — Notion doesn't use scopes, permissions are set during integration authorization) |
| Basic Auth | **yes** — Notion requires `Authorization: Basic base64(client_id:client_secret)` on token exchange |
| PKCE | no |
| Refresh | **yes** — SDK v5.14.0 supports `grant_type=refresh_token` via `oauth/token` endpoint |
| Revoke | `https://api.notion.com/v1/oauth/revoke` (POST with `{ token }`, basic auth) |
| Extra auth params | `owner=user` (recommended by Notion docs for user-level access) |

### Credential storage

Reuses `OAuthCredentials` shape:
- `accessToken` — the Notion bearer token
- `refreshToken` — for token refresh
- `expiresAt` — computed from `expires_in`
- `metadata.workspace_id` — from token response
- `metadata.workspace_name` — from token response
- `metadata.bot_id` — from token response

### Account ID extraction

The Notion token response includes `workspace_id`, `workspace_name`, and `owner` fields. Use `workspace_id` as accountId and `workspace_name` as displayName. Fallback: call `users.me()` via SDK to get the bot user info.

### Connection flow

1. User clicks "Connect Notion" in UI
2. `keepd` builds auth URL: `https://api.notion.com/v1/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&owner=user&state=...`
3. User authorizes in browser, selects pages to share
4. Notion redirects to `http://localhost:{port}/api/connections/notion/callback?code=...&state=...`
5. `keepd` exchanges code for tokens using basic auth (`client_id:client_secret`)
6. Extracts `workspace_id` + `workspace_name` from token response
7. Creates connection, stores credentials

## Service Definition

**File**: `packages/connectors/src/services/notion.ts` (replace existing)

```typescript
import { Client as NotionClient } from '@notionhq/client';
import type { ServiceDefinition, TokenResponse } from '../types.js';

export const notionService: ServiceDefinition = {
  id: 'notion',
  name: 'Notion',
  icon: 'book-open',
  oauthConfig: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    useBasicAuth: true,
    revokeUrl: 'https://api.notion.com/v1/oauth/revoke',
    extraAuthParams: { owner: 'user' },
  },
  supportsRefresh: true,

  async extractAccountId(tokenResponse: TokenResponse): Promise<string> {
    return (tokenResponse.workspace_id as string) ?? 'default';
  },

  extractDisplayName(tokenResponse: TokenResponse): string | undefined {
    return (tokenResponse.workspace_name as string)
      || (tokenResponse.workspace_id as string);
  },
};
```

**Changes from current**:
- Remove `mcpOAuth` config
- Remove `mcpExtractAccountId` method
- Add real `oauthConfig` with Notion endpoints
- `useBasicAuth: true` for token exchange
- No `fetchProfile` needed — token response has workspace info

## Connector Implementation

### File structure

```
packages/connectors/src/connectors/notion/
├── index.ts          — Connector export, SDK client, execute(), help()
├── params.ts         — Shared param definitions (PAGE_ID, BLOCK_ID, etc.)
├── methods-pages.ts  — Pages: create, retrieve, update, move, markdown, properties
├── methods-blocks.ts — Blocks: retrieve, update, delete, children.append, children.list
├── methods-databases.ts  — Databases: retrieve, create, update
├── methods-datasources.ts — DataSources: retrieve, query, create, update, listTemplates
├── methods-users.ts  — Users: retrieve, list, me
├── methods-comments.ts — Comments: create, list, retrieve
├── methods-search.ts — Search
├── methods-views.ts  — Views: CRUD, queries
└── methods-files.ts  — FileUploads: create, retrieve, list, send, complete
```

### SDK client helper

```typescript
import { Client as NotionClient } from '@notionhq/client';

function getClient(credentials: OAuthCredentials): NotionClient {
  return new NotionClient({ auth: credentials.accessToken });
}
```

### Method name mapping to SDK

The `@notionhq/client` SDK organizes methods as nested objects on the Client class. Our method names map directly:

| KeepAI method | SDK path | Operation |
|---------------|----------|-----------|
| **Pages** | | |
| `pages.create` | `client.pages.create(args)` | write |
| `pages.retrieve` | `client.pages.retrieve(args)` | read |
| `pages.update` | `client.pages.update(args)` | write |
| `pages.move` | `client.pages.move(args)` | write |
| `pages.retrieveMarkdown` | `client.pages.retrieveMarkdown(args)` | read |
| `pages.updateMarkdown` | `client.pages.updateMarkdown(args)` | write |
| `pages.properties.retrieve` | `client.pages.properties.retrieve(args)` | read |
| **Blocks** | | |
| `blocks.retrieve` | `client.blocks.retrieve(args)` | read |
| `blocks.update` | `client.blocks.update(args)` | write |
| `blocks.delete` | `client.blocks.delete(args)` | delete |
| `blocks.children.append` | `client.blocks.children.append(args)` | write |
| `blocks.children.list` | `client.blocks.children.list(args)` | read |
| **Databases** | | |
| `databases.retrieve` | `client.databases.retrieve(args)` | read |
| `databases.create` | `client.databases.create(args)` | write |
| `databases.update` | `client.databases.update(args)` | write |
| **Data Sources** | | |
| `dataSources.retrieve` | `client.dataSources.retrieve(args)` | read |
| `dataSources.query` | `client.dataSources.query(args)` | read |
| `dataSources.create` | `client.dataSources.create(args)` | write |
| `dataSources.update` | `client.dataSources.update(args)` | write |
| `dataSources.listTemplates` | `client.dataSources.listTemplates(args)` | read |
| **Users** | | |
| `users.retrieve` | `client.users.retrieve(args)` | read |
| `users.list` | `client.users.list(args)` | read |
| `users.me` | `client.users.me(args)` | read |
| **Comments** | | |
| `comments.create` | `client.comments.create(args)` | write |
| `comments.list` | `client.comments.list(args)` | read |
| `comments.retrieve` | `client.comments.retrieve(args)` | read |
| **Search** | | |
| `search` | `client.search(args)` | read |
| **Views** | | |
| `views.create` | `client.views.create(args)` | write |
| `views.retrieve` | `client.views.retrieve(args)` | read |
| `views.update` | `client.views.update(args)` | write |
| `views.delete` | `client.views.delete(args)` | delete |
| `views.list` | `client.views.list(args)` | read |
| `views.queries.create` | `client.views.queries.create(args)` | write |
| `views.queries.results` | `client.views.queries.results(args)` | read |
| `views.queries.delete` | `client.views.queries.delete(args)` | delete |
| **File Uploads** | | |
| `fileUploads.create` | `client.fileUploads.create(args)` | write |
| `fileUploads.retrieve` | `client.fileUploads.retrieve(args)` | read |
| `fileUploads.list` | `client.fileUploads.list(args)` | read |
| `fileUploads.send` | `client.fileUploads.send(args)` | write |
| `fileUploads.complete` | `client.fileUploads.complete(args)` | write |

**Total: ~38 methods** (vs 13 from MCP)

### Execute function

Same generic dispatcher pattern as Cloudflare — navigate the SDK object tree:

```typescript
async function execute(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials,
): Promise<unknown> {
  const client = getClient(credentials);
  const parts = method.split('.');
  const action = parts.pop()!;

  let target: any = client;
  for (const part of parts) {
    target = target[part];
    if (!target) throw new Error(`Unknown Notion resource: ${parts.join('.')}`);
  }

  const fn = target[action];
  if (typeof fn !== 'function') throw new Error(`Unknown Notion method: ${method}`);

  // Notion SDK takes a single params object
  return fn.call(target, params);
}
```

**Note**: The Notion SDK, like Cloudflare, takes a single params object. Path params (e.g., `page_id`) are included in the same object — the SDK extracts them internally. This is simpler than Stripe's `fn(id, body)` pattern.

### Method descriptions — JSDoc reuse

The `@notionhq/client` SDK has JSDoc comments on every method in `Client.d.ts` and `Client.js`. These are short one-liners:

```
blocks.retrieve    → "Retrieve block"
blocks.update      → "Update block"
pages.create       → "Create a page"
pages.move         → "Move a page"
search             → "Search"
fileUploads.send   → "Send a file upload" (+ multi-line description)
```

**Strategy**: Reference the SDK JSDoc as the source of truth for method descriptions. In each methods file, add a comment pointing to the SDK source:

```typescript
// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.
// See: node_modules/@notionhq/client/build/src/Client.d.ts
```

For most methods, the SDK descriptions are sufficient. For a few (like `fileUploads.send`), the SDK has richer multi-line JSDoc that we can include. The parameter schemas (pathParams, queryParams, bodyParams) come from `api-endpoints.js` — these define the exact params each endpoint accepts.

### Parameter definitions

The SDK's `api-endpoints.js` is a generated file that lists every endpoint with its `pathParams`, `queryParams`, `bodyParams`, and `formDataParams`. Use this as the authoritative source for parameter names.

**Shared params** (`params.ts`):

```typescript
export const PAGE_ID_PARAM = { name: 'page_id', type: 'string', required: true, description: 'Page ID or URL' };
export const BLOCK_ID_PARAM = { name: 'block_id', type: 'string', required: true, description: 'Block ID' };
export const DATABASE_ID_PARAM = { name: 'database_id', type: 'string', required: true, description: 'Database ID' };
export const DATA_SOURCE_ID_PARAM = { name: 'data_source_id', type: 'string', required: true, description: 'Data source ID' };
export const USER_ID_PARAM = { name: 'user_id', type: 'string', required: true, description: 'User ID' };
export const VIEW_ID_PARAM = { name: 'view_id', type: 'string', required: true, description: 'View ID' };
export const FILE_UPLOAD_ID_PARAM = { name: 'file_upload_id', type: 'string', required: true, description: 'File upload ID' };
export const START_CURSOR_PARAM = { name: 'start_cursor', type: 'string', required: false, description: 'Pagination cursor from previous response' };
export const PAGE_SIZE_PARAM = { name: 'page_size', type: 'number', required: false, description: 'Number of results (max 100)', default: 100 };
export const PAGINATION_PARAMS = [START_CURSOR_PARAM, PAGE_SIZE_PARAM];
```

### Group descriptions

```typescript
groupDescriptions: {
  pages: 'Page management — create, retrieve, update, move, markdown read/write, properties',
  blocks: 'Block management — retrieve, update, delete, append/list children',
  databases: 'Database management — retrieve, create, update',
  dataSources: 'Data sources — retrieve, query, create, update, templates',
  users: 'User info — retrieve, list, bot details',
  comments: 'Comment management — create, list, retrieve',
  search: 'Search across workspace content',
  views: 'Database views — CRUD, queries',
  fileUploads: 'File uploads — create, send, complete, list',
}
```

### Human-readable request descriptions

```typescript
function describeNotionRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'pages.create': return `Create page${params.parent ? ` in ${JSON.stringify(params.parent)}` : ''}`;
    case 'pages.retrieve': return `Retrieve page ${params.page_id || '(unknown)'}`;
    case 'pages.update': return `Update page ${params.page_id || '(unknown)'}`;
    case 'pages.move': return `Move page ${params.page_id || '(unknown)'}`;
    case 'blocks.delete': return `Delete block ${params.block_id || '(unknown)'}`;
    case 'blocks.children.append': return `Append children to block ${params.block_id || '(unknown)'}`;
    case 'databases.create': return `Create database`;
    case 'dataSources.query': return `Query data source ${params.data_source_id || '(unknown)'}`;
    case 'comments.create': return `Create comment`;
    case 'search': return params.query ? `Search: "${params.query}"` : 'Search workspace';
    // ... etc
    default: {
      const parts = method.split('.');
      const action = parts[parts.length - 1];
      const resource = parts.slice(0, -1).join('.');
      return `${action} ${resource}`;
    }
  }
}
```

### Health check method

```typescript
// In connections.ts HEALTH_CHECK_METHODS
notion: { method: 'users.me', params: {} }
```

## Files to Change

### Delete
- `packages/connectors/src/connectors/notion-mcp.ts` — MCP connector config (replaced by SDK connector)

### Replace
- `packages/connectors/src/services/notion.ts` — Service definition (OAuth2 instead of MCP OAuth)

### Create
- `packages/connectors/src/connectors/notion/index.ts` — Main connector
- `packages/connectors/src/connectors/notion/params.ts` — Shared params
- `packages/connectors/src/connectors/notion/methods-pages.ts`
- `packages/connectors/src/connectors/notion/methods-blocks.ts`
- `packages/connectors/src/connectors/notion/methods-databases.ts`
- `packages/connectors/src/connectors/notion/methods-datasources.ts`
- `packages/connectors/src/connectors/notion/methods-users.ts`
- `packages/connectors/src/connectors/notion/methods-comments.ts`
- `packages/connectors/src/connectors/notion/methods-search.ts`
- `packages/connectors/src/connectors/notion/methods-views.ts`
- `packages/connectors/src/connectors/notion/methods-files.ts`

### Modify
- `apps/keepd/src/server.ts` — Replace `McpConnector(notionMcpConfig)` with `notionConnector` SDK connector registration; remove MCP seeding logic for Notion
- `apps/keepd/src/routes/connections.ts` — Update `HEALTH_CHECK_METHODS.notion` to `{ method: 'users.me', params: {} }`
- `packages/connectors/src/index.ts` — Update exports: remove `notion-mcp`, add `notion/index`

### Possibly modify
- `apps/keepd/src/managers/connection-manager.ts` — Verify that Notion OAuth flow works with `useBasicAuth: true` (check if `OAuthHandler` supports it correctly)
- `packages/connectors/src/oauth.ts` — Verify basic auth support for token exchange and revocation

## Not in scope
- `packages/mcp-client/` — Keep as-is (still used by other MCP connectors like GitHub)
- `McpConnector` class — Keep as-is (still used by other services)
- Backward compat — Old Notion tokens will fail, users reconnect

## Secrets required

The OAuth `client_id` and `client_secret` must be available to keepd at runtime. These are loaded from the secrets store (same mechanism as Gmail). The service ID `notion` is used as the key.

## Migration notes

- Existing Notion connections will show as "error" since old MCP OAuth tokens won't work with direct API
- Users click "Reconnect" which starts the new OAuth2 flow
- No data migration needed — connection records can be deleted and recreated
