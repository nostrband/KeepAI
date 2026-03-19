# AgentMail Connector

## Overview

Add AgentMail as a KeepAI connector using direct HTTP calls to the AgentMail REST API (`https://api.agentmail.to/v0`). AgentMail uses **API key authentication** — users generate keys in the AgentMail dashboard. Keys can be scoped to an organization, a pod, or a single inbox.

AgentMail is a programmatic email platform designed for AI agents. It provides multi-tenant inboxes, email sending/receiving, threading, drafts, custom domains, webhooks, and allowlist/blocklist management.

The API has ~50 endpoints across ~10 resource types, organized into logical groups. The connector uses a **two-level help** system: root `help` returns group summaries, `help <group>` returns full method details.

### Scope

- **Included**: All AgentMail v0 API resources — inboxes, messages, threads, drafts, domains, pods, webhooks, lists, API keys, metrics, organization
- **Excluded**: WebSocket streaming (real-time events), pod-scoped duplicate endpoints (agents use the standard endpoints with pod_id params)

## Authentication: API Key

### Why API key (not OAuth)

AgentMail authenticates via Bearer tokens (API keys) created in the dashboard. There's no OAuth flow. Keys can be scoped to organization, pod, or inbox level. This maps to the existing `manualTokenAuth` pattern (same as Stripe/Hetzner).

### Credential fields

| Field | Label | Required | Secret | Description |
|-------|-------|----------|--------|-------------|
| `apiKey` | API Key | yes | yes | API key from AgentMail dashboard |

### How credentials are stored

Reuses `OAuthCredentials` shape:
- `accessToken` — the API key

### Connection flow

1. User clicks "Connect AgentMail" in UI
2. UI shows form: API Key (required, masked)
3. Link to https://app.agentmail.to with instructions: "Go to your AgentMail dashboard → API Keys, then create a new key"
4. User pastes key and clicks Connect
5. `keepd` calls `POST /api/connections/manual-token` with `{ service: 'agentmail', credentials: { apiKey } }`
6. Validates via `GET /v0/organizations` with the key — confirms it works and extracts organization ID
7. On success: stores credentials, creates connection
8. No refresh needed — API keys don't expire (until revoked by user)

## Service Definition

`packages/connectors/src/services/agentmail.ts`:

```typescript
import type { ServiceDefinition, TokenResponse } from '../types.js';

const AGENTMAIL_API = 'https://api.agentmail.to/v0';

export const agentmailService: ServiceDefinition = {
  id: 'agentmail',
  name: 'AgentMail',
  icon: 'agentmail',

  // No OAuth — manual API key entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Go to your AgentMail dashboard → API Keys, then create a new key.',
    consoleUrl: 'https://app.agentmail.to',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        placeholder: 'Paste your API key here',
        secret: true,
      },
    ],
    validateCredentials: async (creds) => {
      const res = await fetch(`${AGENTMAIL_API}/organizations`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (!res.ok) {
        throw new Error(`Invalid API key: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as {
        organization_id: string;
      };
      return {
        accountId: data.organization_id,
        displayName: `AgentMail Org ${data.organization_id}`,
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('AgentMail uses manualTokenAuth — extractAccountId should not be called');
  },
};
```

## Connector Implementation

`packages/connectors/src/connectors/agentmail.ts`

### HTTP Client Pattern

No official npm SDK — use direct `fetch` calls (same pattern as Gmail/Airtable):

```typescript
const AGENTMAIL_API = 'https://api.agentmail.to/v0';

async function agentmailFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${AGENTMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as any)?.message || `AgentMail API error: ${res.status}`;
    throw Object.assign(
      new Error(msg),
      { status: res.status, name: (body as any)?.name },
    );
  }

  if (res.status === 204) return {};
  return res.json();
}

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return '';
  return '?' + new URLSearchParams(
    entries.map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])
  ).toString();
}
```

### Method Groups

Methods are organized into **3 groups**. Each group is defined in a separate sub-spec file.

| Group | Resources | Methods | Sub-Spec |
|-------|-----------|---------|----------|
| **Messaging** | Messages, Threads | ~14 | [agentmail-methods-messaging.md](./agentmail-methods-messaging.md) |
| **Inboxes** | Inboxes, Drafts | ~12 | [agentmail-methods-inboxes.md](./agentmail-methods-inboxes.md) |
| **Admin** | Domains, Pods, Webhooks, Lists, API Keys, Metrics, Organization | ~23 | [agentmail-methods-admin.md](./agentmail-methods-admin.md) |

**Total: ~49 methods**

### Help System — Two-Level Structure

Same pattern as Stripe/Hetzner:

```typescript
help(method?: string): ServiceHelp {
  if (!method) {
    return {
      service: 'agentmail',
      name: 'AgentMail',
      summary: 'Programmatic email for AI agents — inboxes, messages, threads, drafts, domains, and more',
      methods: [],
      groups: [
        { name: 'messaging', description: 'Send, receive, reply, forward messages; manage threads', methodCount: 14 },
        { name: 'inboxes', description: 'Create and manage inboxes; create, edit, and send drafts', methodCount: 12 },
        { name: 'admin', description: 'Domains, pods, webhooks, allowlists/blocklists, API keys, metrics, organization', methodCount: 23 },
      ],
    };
  }
  // ... group or single method lookup
}
```

### Human-Readable Request Descriptions

```typescript
function describeAgentmailRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'inboxes.create':
      return `Create inbox${params.display_name ? ` "${params.display_name}"` : ''}`;
    case 'inboxes.delete':
      return `Delete inbox ${params.inbox_id}`;
    case 'messages.send':
      return `Send message to ${(params.to as string[])?.join(', ') || 'recipients'}${params.subject ? `: "${params.subject}"` : ''}`;
    case 'messages.reply':
      return `Reply to message ${params.message_id}`;
    case 'messages.replyAll':
      return `Reply all to message ${params.message_id}`;
    case 'messages.forward':
      return `Forward message ${params.message_id} to ${(params.to as string[])?.join(', ')}`;
    case 'drafts.create':
      return `Create draft${params.subject ? `: "${params.subject}"` : ''}`;
    case 'drafts.send':
      return `Send draft ${params.draft_id}`;
    case 'drafts.delete':
      return `Delete draft ${params.draft_id}`;
    case 'domains.create':
      return `Add domain "${params.name}"`;
    case 'domains.delete':
      return `Delete domain ${params.domain_id}`;
    case 'domains.verify':
      return `Verify domain ${params.domain_id}`;
    case 'webhooks.create':
      return `Create webhook for ${params.url}`;
    case 'webhooks.delete':
      return `Delete webhook ${params.webhook_id}`;
    // ... etc.
    default: {
      const [resource, action] = method.split('.');
      if (params.inbox_id) return `${capitalize(action)} ${resource} in inbox ${params.inbox_id}`;
      return `${capitalize(action)} ${resource}`;
    }
  }
}
```

### Resource Types

Derived from method prefix for `PermissionMetadata.resourceType`:

| Method Prefix | Resource Type |
|---------------|---------------|
| `inboxes.*` | `inbox` |
| `messages.*` | `message` |
| `threads.*` | `thread` |
| `drafts.*` | `draft` |
| `domains.*` | `domain` |
| `pods.*` | `pod` |
| `webhooks.*` | `webhook` |
| `lists.*` | `list` |
| `apiKeys.*` | `api_key` |
| `metrics.*` | `metrics` |
| `organization.*` | `organization` |

### Pagination

AgentMail uses cursor-based pagination with `limit` and `page_token` params. Standard on all `list` methods:

```typescript
const LIMIT_PARAM = { name: 'limit', type: 'number', required: false, description: 'Max items to return' };
const PAGE_TOKEN_PARAM = { name: 'page_token', type: 'string', required: false, description: 'Token for next page (from previous response)' };
const LIST_PARAMS = [LIMIT_PARAM, PAGE_TOKEN_PARAM];
```

Responses include pagination metadata:
```json
{ "count": 10, "limit": 10, "next_page_token": "abc123", "items": [...] }
```

### Rate Limiting

On 429 responses, the connector returns an RPC error. No automatic retries.

## Implementation Plan

### Files to create

1. **`packages/connectors/src/services/agentmail.ts`** — AgentMail service definition with `manualTokenAuth`
2. **`packages/connectors/src/connectors/agentmail.ts`** — AgentMail connector (method groups, execute, help)

### Files to modify

3. **`packages/connectors/src/index.ts`** — Export `agentmailConnector` and `agentmailService`
4. **`apps/keepd/src/server.ts`** — Register AgentMail connector & service

### Execution order

1. Service definition (`services/agentmail.ts`)
2. Connector implementation (`connectors/agentmail.ts`) — ~800-1000 lines
3. Registration in keepd + index exports
4. UI (add AgentMail to connection dialog — separate pass)

## Decisions

1. **Auth**: API key via `manualTokenAuth` — no OAuth
2. **SDK**: No official npm SDK — use direct `fetch` (like Gmail/Airtable)
3. **Scope**: v0 REST API only — excludes WebSocket streaming and pod-scoped duplicate endpoints
4. **Help system**: Two-level — root returns group summaries, `help <group>` returns full method list
5. **Pagination**: Cursor-based — pass through `limit`/`page_token` params
6. **Base URL**: `https://api.agentmail.to/v0` (production) — other environments not exposed
7. **Validation**: `GET /v0/organizations` to validate key and extract org ID
