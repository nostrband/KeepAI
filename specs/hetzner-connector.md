# Hetzner Cloud Connector

## Overview

Add Hetzner Cloud as a KeepAI connector using direct HTTP calls to the Hetzner Cloud REST API (`https://api.hetzner.cloud/v1`). Hetzner uses **API token authentication** (not OAuth) — users generate read-only or read-write tokens in the Hetzner Cloud Console.

The Hetzner Cloud API has ~130 endpoints across ~18 resource types, organized into logical groups. Like Stripe, the connector uses a **two-level help** system: root `help` returns group summaries, `help <group>` returns full method details.

### Scope

- **Included**: All Cloud API resources (api.hetzner.cloud/v1) — servers, volumes, networks, load balancers, firewalls, floating IPs, primary IPs, images, SSH keys, certificates, placement groups, plus read-only reference resources (server types, LB types, datacenters, locations, ISOs, pricing, actions)
- **Excluded**: DNS Zones (api.hetzner.com — separate API/token), Storage Boxes (api.hetzner.com — separate API/token), Robot API (dedicated servers)

## Authentication: API Token

### Why API token (not OAuth)

Hetzner Cloud authenticates via bearer tokens generated in the Cloud Console. There's no OAuth flow. Tokens are scoped to a single **project** and can be either **read-only** or **read-write**. This maps to the existing `manualTokenAuth` pattern (same as Stripe/X).

### Credential fields

| Field | Label | Required | Secret | Description |
|-------|-------|----------|--------|-------------|
| `apiToken` | API Token | yes | yes | Token from Cloud Console (64-char hex string) |

### How credentials are stored

Reuses `OAuthCredentials` shape:
- `accessToken` — the API token

### Connection flow

1. User clicks "Connect Hetzner Cloud" in UI
2. UI shows form: API Token (required, masked)
3. Link to https://console.hetzner.cloud with instructions: "Go to your project → Security → API Tokens, then generate a Read & Write token"
4. User pastes token and clicks Connect
5. `keepd` calls `POST /api/connections/manual-token` with `{ service: 'hetzner', credentials: { apiToken } }`
6. Validates via `GET /v1/servers?per_page=1` with the token — confirms it works and extracts project info from response headers
7. On success: stores credentials, creates connection
8. No refresh needed — API tokens don't expire (until revoked by user)

### Token permissions

Hetzner tokens are either **read-only** or **read-write** at the project level. If a read-only token is used, all write/delete operations will return HTTP 403. The connector passes these errors through — no special handling needed.

## Service Definition

`packages/connectors/src/services/hetzner.ts`:

```typescript
import type { ServiceDefinition, TokenResponse } from '../types.js';

const HETZNER_API = 'https://api.hetzner.cloud/v1';

export const hetznerService: ServiceDefinition = {
  id: 'hetzner',
  name: 'Hetzner Cloud',
  icon: 'hetzner',

  // No OAuth — manual API token entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Go to your Hetzner Cloud Console → your project → Security → API Tokens, then generate a Read & Write token.',
    consoleUrl: 'https://console.hetzner.cloud',
    fields: [
      {
        key: 'apiToken',
        label: 'API Token',
        placeholder: 'Paste your API token here',
        secret: true,
      },
    ],
    validateCredentials: async (creds) => {
      const res = await fetch(`${HETZNER_API}/servers?per_page=1`, {
        headers: { Authorization: `Bearer ${creds.apiToken}` },
      });
      if (!res.ok) {
        throw new Error(`Invalid token: ${res.status} ${res.statusText}`);
      }
      // Hetzner doesn't expose project name in the API, use a generic display
      // We can list servers to confirm token works
      return {
        accountId: 'hetzner-project',
        displayName: 'Hetzner Cloud Project',
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('Hetzner uses manualTokenAuth — extractAccountId should not be called');
  },
};
```

## Connector Implementation

`packages/connectors/src/connectors/hetzner.ts`

### HTTP Client Pattern

No official Hetzner npm SDK — use direct `fetch` calls (same pattern as Airtable connector):

```typescript
const HETZNER_API = 'https://api.hetzner.cloud/v1';

async function hetznerFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${HETZNER_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = (body as any)?.error;
    throw Object.assign(
      new Error(error?.message || `Hetzner API error: ${res.status}`),
      { status: res.status, code: error?.code, retryAfter: res.headers.get('retry-after') },
    );
  }

  if (res.status === 204) return {};
  return res.json();
}

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return '';
  return '?' + new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)])
  ).toString();
}
```

### Method Groups

Methods are organized into **5 groups**. Each group is defined in a separate sub-spec file.

| Group | Resources | Methods | Sub-Spec |
|-------|-----------|---------|----------|
| **Compute** | Servers, Server Types, Images, ISOs, Placement Groups | ~40 | [hetzner-methods-compute.md](./hetzner-methods-compute.md) |
| **Networking** | Networks, Floating IPs, Primary IPs, Load Balancers, Load Balancer Types, Firewalls | ~55 | [hetzner-methods-networking.md](./hetzner-methods-networking.md) |
| **Storage** | Volumes | ~9 | [hetzner-methods-storage.md](./hetzner-methods-storage.md) |
| **Security** | SSH Keys, Certificates | ~11 | [hetzner-methods-security.md](./hetzner-methods-security.md) |
| **Infrastructure** | Datacenters, Locations, Pricing, Actions | ~7 | [hetzner-methods-infrastructure.md](./hetzner-methods-infrastructure.md) |

**Total: ~122 methods**

### Help System — Two-Level Structure

Same pattern as Stripe:

```typescript
help(method?: string): ServiceHelp {
  if (!method) {
    return {
      service: 'hetzner',
      name: 'Hetzner Cloud',
      summary: 'Cloud infrastructure — servers, networks, load balancers, volumes, firewalls, IPs, and more',
      methods: [],
      groups: [
        { name: 'compute', description: 'Servers, server types, images, ISOs, placement groups', methodCount: 40 },
        { name: 'networking', description: 'Networks, floating IPs, primary IPs, load balancers, firewalls', methodCount: 55 },
        { name: 'storage', description: 'Volumes — block storage', methodCount: 9 },
        { name: 'security', description: 'SSH keys, TLS certificates', methodCount: 11 },
        { name: 'infrastructure', description: 'Datacenters, locations, pricing, actions', methodCount: 7 },
      ],
    };
  }
  // ... group or single method lookup
}
```

### Human-Readable Request Descriptions

```typescript
function describeHetznerRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'servers.create':
      return `Create server "${params.name}"${params.server_type ? ` (${params.server_type})` : ''}`;
    case 'servers.delete':
      return `Delete server ${params.id}`;
    case 'servers.poweron':
      return `Power on server ${params.id}`;
    case 'servers.poweroff':
      return `Power off server ${params.id}`;
    case 'servers.rebuild':
      return `Rebuild server ${params.id} with image ${params.image}`;
    case 'servers.changeType':
      return `Change server ${params.id} type to ${params.server_type}`;
    case 'volumes.create':
      return `Create ${params.size}GB volume "${params.name}"`;
    case 'volumes.delete':
      return `Delete volume ${params.id}`;
    case 'networks.create':
      return `Create network "${params.name}" (${params.ip_range})`;
    case 'loadBalancers.create':
      return `Create load balancer "${params.name}"`;
    case 'firewalls.create':
      return `Create firewall "${params.name}"`;
    case 'sshKeys.create':
      return `Add SSH key "${params.name}"`;
    // ... etc.
    default: {
      const [resource, action] = method.split('.');
      if (params.id) return `${capitalize(action)} ${resource} ${params.id}`;
      return `${capitalize(action)} ${resource}`;
    }
  }
}
```

### Resource Types

Derived from method prefix for `PermissionMetadata.resourceType`:

| Method Prefix | Resource Type |
|---------------|---------------|
| `servers.*` | `server` |
| `volumes.*` | `volume` |
| `networks.*` | `network` |
| `loadBalancers.*` | `load_balancer` |
| `firewalls.*` | `firewall` |
| `floatingIps.*` | `floating_ip` |
| `primaryIps.*` | `primary_ip` |
| `images.*` | `image` |
| `sshKeys.*` | `ssh_key` |
| `certificates.*` | `certificate` |
| `placementGroups.*` | `placement_group` |
| `serverTypes.*` | `server_type` |
| `loadBalancerTypes.*` | `load_balancer_type` |
| `datacenters.*` | `datacenter` |
| `locations.*` | `location` |
| `isos.*` | `iso` |
| `actions.*` | `action` |
| `pricing.*` | `pricing` |

### Pagination

Hetzner uses page-based pagination with `page` and `per_page` params. Standard on all `list` methods:

```typescript
const PAGE_PARAM = { name: 'page', type: 'number', required: false, description: 'Page number (default 1)' };
const PER_PAGE_PARAM = { name: 'per_page', type: 'number', required: false, description: 'Results per page (1-50, default 25)' };
const LIST_PARAMS = [PAGE_PARAM, PER_PAGE_PARAM];
```

Responses include pagination metadata:
```json
{ "meta": { "pagination": { "page": 1, "per_page": 25, "previous_page": null, "next_page": 2, "last_page": 5, "total_entries": 123 } } }
```

### Common Patterns

**Label filtering**: Most list endpoints support `label_selector` (e.g., `env=prod,app=web`):
```typescript
const LABEL_SELECTOR_PARAM = {
  name: 'label_selector', type: 'string', required: false,
  description: 'Filter by label selector (e.g., "env=prod,app!=test")',
};
```

**Name filtering**: Most list endpoints support `name` exact match filter.

**Sorting**: Most list endpoints support `sort` param (e.g., `id:asc`, `name:desc`, `created:desc`).

**Actions**: Many write operations return an `action` object that can be polled. The connector returns the full response including the action — agents can poll via `actions.get` if needed.

### Rate Limiting

Hetzner rate limits to 3600 requests/hour per token. On 429 responses, the connector returns an RPC error with `retryAfter` from the `Retry-After` header. No automatic retries.

## Implementation Plan

### Files to create

1. **`packages/connectors/src/services/hetzner.ts`** — Hetzner service definition with `manualTokenAuth`
2. **`packages/connectors/src/connectors/hetzner.ts`** — Hetzner connector (method groups, execute, help)

### Files to modify

3. **`packages/connectors/src/index.ts`** — Export `hetznerConnector` and `hetznerService`
4. **`apps/keepd/src/server.ts`** — Register Hetzner connector & service

### Execution order

1. Service definition (`services/hetzner.ts`)
2. Connector implementation (`connectors/hetzner.ts`) — ~1500-2000 lines
3. Registration in keepd + index exports
4. UI (add Hetzner to connection dialog — separate pass)

## Decisions

1. **Auth**: API token via `manualTokenAuth` — no OAuth
2. **SDK**: No official npm SDK — use direct `fetch` (like Airtable)
3. **Scope**: Cloud API only (api.hetzner.cloud) — excludes DNS, Storage Boxes, Robot (separate APIs/tokens)
4. **Help system**: Two-level — root returns group summaries, `help <group>` returns full method list
5. **Pagination**: Page-based — pass through `page`/`per_page` params
6. **Actions**: Returned as-is in responses — agents poll via `actions.get` if needed
7. **Project ID**: Not exposed — tokens are already scoped to a project, accountId is generic
