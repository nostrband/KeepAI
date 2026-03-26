# Resolvable IDs — Core Infrastructure

## Problem

Approval requests show raw IDs like `Update page 1a2b3c-...` which are meaningless to users. Users need human-readable context to make informed approval decisions.

## Solution

On-demand, clickable ID resolution in the UI. Description strings use a lightweight markup for resolvable references. The UI renders them as underlined clickable spans. Clicking triggers a resolve API call that returns a title + optional link. Same treatment applies to the expanded JSON params body.

## Stages

1. **This spec** — types, `Connector` interface additions, resolve API endpoint, description markup format, UI `<ResolvableId>` component, JSON body renderer
2. **Per-connector specs** — each connector declares its resolvable types and implements `resolveId()`

---

## 1. Description Markup Format

### Syntax

Resolvable references in description strings use `[type:id]` tokens:

```
Update page [page_id:1a2b3c4d-5e6f-7890-abcd-ef1234567890]
Create page in [page_id:abc123] database [database_id:def456]
Send email to user@example.com with attachment [attachment_id:ANGjd...]
```

The `type` is a resolvable type key declared by the connector (e.g. `page_id`, `database_id`, `zone_id`). The `id` is the raw value.

### Parsing

Regex: `/\[([a-z_]+):([^\]]+)\]/g` — captures `(type, id)` pairs.

Non-matching text is rendered as-is. If a connector doesn't declare a type, the token renders as plain text (the raw ID).

### Fallback

The markup is still human-readable as plain text — `[page_id:abc123]` is a decent fallback if rendering fails or the description appears in logs/notifications.

---

## 2. Type Definitions

### `ResolvableType` — declared per connector

```ts
// packages/proto/src/types.ts

interface ResolvableType {
  /** Human label shown before resolution, e.g. "Page", "Database" */
  label: string;
  /**
   * Optional map of method name/prefix → param key that holds this ID type.
   * Used when the param key doesn't match the resolvable type name directly.
   *
   * Example — Gmail's message_id is passed as bare "id" in messages.* methods:
   *   params: { 'messages.get': 'id', 'messages.trash': 'id' }
   *
   * If omitted, the type name itself is used as the param key (e.g. "page_id"
   * in Notion methods maps directly).
   */
  params?: Record<string, string>;
}
```

### `ResolveResult` — returned by resolveId

```ts
// packages/proto/src/types.ts

interface ResolveResult {
  /** Human-readable title, e.g. "Meeting Notes Q1" */
  title: string;
  /** Optional deep-link to the resource in the service's web UI */
  url?: string;
}
```

### Connector interface additions

```ts
// packages/proto/src/types.ts — additions to Connector interface

export interface Connector {
  // ... existing fields ...

  /**
   * Map of resolvable ID type keys to their metadata.
   * Optional — connectors without resolvable IDs omit this.
   */
  resolvableTypes?: Record<string, ResolvableType>;

  /**
   * Resolve a single ID to a human-readable title + optional URL.
   * Called on-demand from the UI via the daemon's resolve endpoint.
   * Must not throw — return null on failure.
   */
  resolveId?(
    type: string,
    id: string,
    credentials: OAuthCredentials
  ): Promise<ResolveResult | null>;
}
```

---

## 3. Daemon — Resolve Endpoint

### Route

```
GET /api/resolve/:service/:accountId/:type/:id
```

Returns: `{ result: ResolveResult | null }`

### Implementation

New file: `apps/keepd/src/routes/resolve.ts`

```ts
import type { FastifyInstance } from 'fastify';
import type { ConnectorExecutor } from '@keepai/connectors';
import type { CredentialManager } from '../managers/credential-manager.js';

export async function registerResolveRoutes(
  app: FastifyInstance,
  executor: ConnectorExecutor,
  credentialManager: CredentialManager
): Promise<void> {
  app.get<{
    Params: { service: string; accountId: string; type: string; id: string };
  }>('/api/resolve/:service/:accountId/:type/:id', async (request, reply) => {
    const { service, accountId, type, id } = request.params;

    const connector = executor.getConnector(service);
    if (!connector?.resolveId || !connector.resolvableTypes?.[type]) {
      reply.status(404);
      return { error: 'Unsupported service or type' };
    }

    const credentials = credentialManager.get(service, accountId);
    if (!credentials) {
      reply.status(404);
      return { error: 'No credentials for this account' };
    }

    const result = await connector.resolveId(type, id, credentials);
    return { result };
  });
}
```

### ConnectorExecutor addition

Add `getConnector(service: string): Connector | undefined` method to `ConnectorExecutor` — a simple map lookup, it already has the map internally.

### Caching

Add an in-memory LRU cache keyed by `${service}:${accountId}:${type}:${id}`.

- Max entries: 1000
- TTL: 5 minutes (resolvable names rarely change mid-session)
- Cache lives in the route handler or a thin `ResolveCache` class
- Cache hit → skip connector call entirely

Implementation: use a simple `Map` with timestamp checking, or a lightweight LRU lib if one is already in deps. No new dependencies required — a Map + eviction on access is sufficient for this scale.

### Registration

Register in `apps/keepd/src/index.ts` alongside existing route registrations:

```ts
await registerResolveRoutes(app, executor, credentialManager);
```

---

## 4. UI — API Client Addition

```ts
// apps/ui/src/lib/api.ts — add method

async resolveId(
  service: string,
  accountId: string,
  type: string,
  id: string
): Promise<{ result: { title: string; url?: string } | null }> {
  return this.request(`/api/resolve/${service}/${accountId}/${type}/${id}`);
}
```

---

## 5. UI — `<ResolvableId>` Component

New file: `apps/ui/src/components/resolvable-id.tsx`

### Props

```ts
interface ResolvableIdProps {
  type: string;       // e.g. "page_id"
  id: string;         // raw ID value
  service: string;    // e.g. "notion"
  accountId: string;  // for credential lookup
}
```

### Behavior

1. **Default state**: renders the type label + truncated ID (e.g. `Page 1a2b...7890`) with underline + `cursor-pointer` styling
2. **On click**: opens a small Radix `Popover` anchored to the span
3. **Loading state**: popover shows a spinner
4. **Resolved state**: popover shows title (bold) + link icon to external URL if available. Example: **Meeting Notes Q1** [open in Notion ↗]
5. **Error state**: popover shows "Could not resolve" in muted text
6. **Cached**: once resolved, the component keeps the result — clicking again shows it instantly

### Styling

- Underline style: `decoration-dotted underline underline-offset-2 text-blue-600 dark:text-blue-400` — distinct from regular links, signals interactivity
- Popover: standard Radix popover with `bg-popover border rounded-lg shadow-md p-3`, max-width 300px
- Truncation: IDs longer than 12 chars show first 6 + `…` + last 4

### Resolvable types registry in UI

The UI needs to know which types are resolvable per service to render them correctly and to resolve bare `id` params in the JSON viewer.

Each connector already exposes `resolvableTypes` on its `Connector` object. The daemon exposes these to the UI via the existing `/api/services` endpoint (or a dedicated `/api/resolvable-types` endpoint). The UI fetches this once on load and caches it — the data is static for a given build.

This keeps connectors self-contained: adding a new resolvable type to a connector requires zero UI changes.

---

## 6. UI — Description Parser

New utility: `apps/ui/src/lib/parse-description.ts`

```ts
type DescriptionSegment =
  | { type: 'text'; value: string }
  | { type: 'ref'; refType: string; id: string };

function parseDescription(description: string): DescriptionSegment[]
```

Splits the description string on `[type:id]` tokens into alternating text and ref segments. Used by `ApprovalCard` to render the description line.

---

## 7. UI — Approval Card Changes

In `apps/ui/src/components/approval-card.tsx`:

### Description line (Row 2)

Replace:
```tsx
<p className="text-sm text-foreground mb-1">{item.description}</p>
```

With:
```tsx
<p className="text-sm text-foreground mb-1">
  <ParsedDescription
    description={item.description ?? ''}
    service={item.service}
    accountId={item.accountId ?? ''}
  />
</p>
```

`<ParsedDescription>` calls `parseDescription()`, renders text segments as-is and ref segments as `<ResolvableId>`.

### JSON params body (expanded section)

Replace the raw `<pre>` with a `<JsonViewer>` component that recursively renders JSON, detecting values that match resolvable ID patterns.

Detection logic for JSON values — no heuristics, fully declarative:

1. **Direct key match**: for each key/value pair where value is a string, check if `key` exists in the connector's `resolvableTypes`. If yes → resolvable. This handles Notion-style params where key names match type names (`page_id`, `database_id`, etc.).

2. **Method-context match for bare keys**: if the key didn't match directly, check if any resolvable type's `params` map has an entry for the current method (or method prefix) that maps to this key. This handles Gmail/Stripe/Hetzner where the param is bare `id` but the resolvable type is `message_id`, `customer_id`, etc.

Both checks use the connector's own `resolvableTypes` declaration — no hardcoded heuristics in the UI.

Resolvable values in JSON render inline as `<ResolvableId>` within the JSON structure (the value becomes clickable, the rest of the JSON stays as-is).

---

## 8. UI — `<JsonViewer>` Component

New file: `apps/ui/src/components/json-viewer.tsx`

A recursive JSON renderer that outputs styled `<span>` elements mimicking JSON syntax highlighting. For string values whose key matches a resolvable type (directly or via `params` method-context mapping), it renders a `<ResolvableId>` instead of a plain string.

Props:
```ts
interface JsonViewerProps {
  data: unknown;
  service: string;
  accountId: string;
  method: string;                                    // needed for params-based bare ID resolution
  resolvableTypes: Record<string, ResolvableType>;   // from connector, fetched once
  truncated?: number | null;                         // chars truncated indicator
}
```

This replaces the current `<pre>{paramsData.params}</pre>` block. The params endpoint would need to return parsed JSON instead of a string — or the UI parses it.

Note: `getRequestParams` currently returns `{ params: string; truncated: number | null }` where `params` is a JSON string. The UI can `JSON.parse()` it for the viewer, falling back to raw text display if parsing fails (e.g. when truncated).

---

## 9. Description Format Rules & Migration

### Rules for `describeXxxRequest()` output

Descriptions must contain **only plain text and `[type:id]` references**. Specifically:

1. **Never dump raw JSON** — no `JSON.stringify(obj)` or template-literal interpolation of objects/arrays. If a param is an object, extract the meaningful scalar value from it.
2. **Use `[type:id]` markup** for any ID that has a corresponding entry in `resolvableTypes`.
3. **Use human-readable scalars** for everything else — email addresses, search queries, filenames, counts, amounts. These stay as plain text.
4. **Use `(unknown)` as fallback** when a param is missing — nothing to resolve, just plain text.

### Migration

Each connector's `describeXxxRequest()` function needs updating to emit `[type:id]` markup instead of raw IDs.

Example for Notion — before:
```ts
case 'pages.update': return `Update page ${params.page_id || '(unknown)'}`;
```

After:
```ts
case 'pages.update':
  return params.page_id
    ? `Update page [page_id:${params.page_id}]`
    : 'Update page (unknown)';
```

This is mechanical and covered in each connector's spec. The current audit shows only one violation of the "no raw JSON" rule: Notion's `pages.create` which does `JSON.stringify(params.parent)` — fixed in the Notion spec by extracting `parent.page_id` or `parent.database_id`.

---

## 10. Files Changed / Created

### New files
| File | Description |
|------|-------------|
| `apps/keepd/src/routes/resolve.ts` | Resolve endpoint |
| `apps/ui/src/components/resolvable-id.tsx` | Clickable ID component with popover |
| `apps/ui/src/components/json-viewer.tsx` | Recursive JSON renderer with resolvable IDs |
| `apps/ui/src/lib/parse-description.ts` | Description markup parser |

### Modified files
| File | Change |
|------|--------|
| `packages/proto/src/types.ts` | Add `ResolvableType`, `ResolveResult`, extend `Connector` |
| `packages/connectors/src/executor.ts` | Add `getConnector()` method |
| `apps/keepd/src/index.ts` | Register resolve routes |
| `apps/keepd/src/routes/services.ts` (or equivalent) | Expose `resolvableTypes` from connectors to UI |
| `apps/ui/src/lib/api.ts` | Add `resolveId()` + `getResolvableTypes()` methods |
| `apps/ui/src/components/approval-card.tsx` | Use `ParsedDescription` + `JsonViewer` |
| Per-connector files | Add `resolvableTypes`, `resolveId()`, update `describeXxxRequest()` |

---

## 11. Implementation Order

1. Types (`packages/proto`) — add `ResolvableType` (with `params?`), `ResolveResult`, extend `Connector`
2. Executor — add `getConnector()`
3. Resolve endpoint + resolvable-types endpoint + registration
4. UI utilities — `parse-description.ts`
5. UI — API client additions (`resolveId`, `getResolvableTypes`)
6. UI components — `ResolvableId`, `JsonViewer`
7. Approval card — integrate new components
8. Per-connector: Notion (first, most impactful)
9. Per-connector: Gmail
10. Per-connector: Cloudflare
11. Per-connector: Stripe
12. Per-connector: Hetzner
