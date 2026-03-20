# Cloudflare Connector

## Overview

Add Cloudflare as a KeepAI connector using the official `cloudflare` npm package (v5.x). Cloudflare uses **API token authentication** — users generate scoped tokens in the Cloudflare Dashboard.

The Cloudflare API surface is massive (~370+ methods across 50+ resources), organized into logical groups. Like Stripe, the connector uses a **two-level help** system: root `help` returns group summaries, `help <group>` returns full method details.

### Method Descriptions — Source from SDK JSDoc

The `cloudflare` npm package ships `.d.ts` files with comprehensive JSDoc on every method (descriptions, usage examples, technical notes). **Method `description` fields should be copied verbatim from the SDK type definitions** — do not paraphrase.

Source files are under `node_modules/cloudflare/resources/`. Each method spec below references the exact `.d.ts` file to copy from. Our additions (`example`, `seeAlso`, `notes`, key params) are specified in the sub-specs and do not come from the SDK.

### Scope

- **Included**: All production v4 API resources — zones, DNS, Workers, KV, R2, D1, Pages, Queues, Stream, Images, Load Balancers, Zero Trust, Rulesets, Firewall, SSL/TLS, AI, Vectorize, Accounts, etc.
- **Excluded**: Radar (analytics-only, massive surface), Intel (threat intel — niche), Cloudforce One (enterprise-only), Botnet Feed (enterprise-only), Content Scanning (enterprise-only), Magic Cloud Networking (beta/niche)

## Authentication: API Token

### Why API token (not OAuth)

Cloudflare authenticates via API tokens generated in the Dashboard. There's no OAuth flow. Tokens are scoped to specific permissions and resources (zones, accounts, etc.). This maps to the existing `manualTokenAuth` pattern (same as Stripe/Hetzner).

Cloudflare also supports legacy Global API Key + Email auth, but scoped API tokens are preferred and recommended.

### Credential fields

| Field | Label | Required | Secret | Description |
|-------|-------|----------|--------|-------------|
| `apiToken` | API Token | yes | yes | Scoped API token from Cloudflare Dashboard |

### How credentials are stored

Reuses `OAuthCredentials` shape:
- `accessToken` — the API token

### Connection flow

1. User clicks "Connect Cloudflare" in UI
2. UI shows form: API Token (required, masked)
3. Link to https://dash.cloudflare.com/profile/api-tokens with instructions: "Go to My Profile → API Tokens, then create a token with the permissions you need"
4. User pastes token and clicks Connect
5. `keepd` calls `POST /api/connections/manual-token` with `{ service: 'cloudflare', credentials: { apiToken } }`
6. Validates via `client.user.tokens.verify()` — confirms token is active and returns token metadata
7. On success: stores credentials, creates connection with user info from `client.user.get()`
8. No refresh needed — API tokens don't expire (unless set by user)

### Token permissions

Cloudflare tokens are scoped to specific permissions (e.g., `Zone:DNS:Edit`, `Account:Workers Scripts:Edit`). If a token lacks permission for an operation, the API returns HTTP 403. The connector passes these errors through — no special handling needed.

## Service Definition

`packages/connectors/src/services/cloudflare.ts`:

```typescript
import Cloudflare from 'cloudflare';
import type { ServiceDefinition, TokenResponse } from '../types.js';

export const cloudflareService: ServiceDefinition = {
  id: 'cloudflare',
  name: 'Cloudflare',
  icon: 'cloudflare',

  // No OAuth — manual API token entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Go to your Cloudflare Dashboard → My Profile → API Tokens, then create a token with the permissions you need.',
    consoleUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    fields: [
      {
        key: 'apiToken',
        label: 'API Token',
        placeholder: 'Paste your API token here',
        secret: true,
      },
    ],
    validateCredentials: async (creds) => {
      const client = new Cloudflare({ apiToken: creds.apiToken });
      // Verify token is valid
      const verify = await client.user.tokens.verify();
      if (verify.status !== 'active') {
        throw new Error(`Token is not active: ${verify.status}`);
      }
      // Get user info for display name
      const user = await client.user.get();
      const name = (user as any).first_name
        ? `${(user as any).first_name} ${(user as any).last_name}`
        : (user as any).email || 'Cloudflare User';
      return {
        accountId: (user as any).id || 'cloudflare-user',
        displayName: `${name} (${(user as any).email || 'no email'})`,
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('Cloudflare uses manualTokenAuth — extractAccountId should not be called');
  },
};
```

## Connector Implementation

`packages/connectors/src/connectors/cloudflare.ts`

### SDK Usage Pattern

```typescript
import Cloudflare from 'cloudflare';

function getClient(credentials: OAuthCredentials): Cloudflare {
  const meta = (credentials.metadata ?? {}) as Record<string, string>;
  return new Cloudflare({
    apiToken: credentials.accessToken || meta.apiToken,
  });
}
```

The `cloudflare` SDK handles all HTTP, authentication, pagination, and serialization. We call its methods directly — no raw HTTP needed.

### Method Groups

Methods are organized into **9 groups**. Each group is defined in a separate sub-spec file with full method tables.

| Group | Resources | Methods | Sub-Spec |
|-------|-----------|---------|----------|
| **DNS & Zones** | Zones, DNS Records, DNSSEC, DNS Settings, DNS Firewall, Zone Settings | ~45 | [cloudflare-methods-dns.md](./cloudflare-methods-dns.md) |
| **Workers & Serverless** | Workers Scripts, Routes, KV Namespaces, D1 Databases, Queues, Durable Objects, Workflows, Hyperdrive, Pipelines | ~70 | [cloudflare-methods-workers.md](./cloudflare-methods-workers.md) |
| **Storage & Media** | R2 Buckets, Stream Videos, Images | ~45 | [cloudflare-methods-storage.md](./cloudflare-methods-storage.md) |
| **Pages & Sites** | Pages Projects, Custom Hostnames, Waiting Rooms, Snippets, Web3 | ~35 | [cloudflare-methods-pages.md](./cloudflare-methods-pages.md) |
| **Security** | Rulesets, Firewall Rules, SSL/TLS, Certificates, Turnstile, Bot Management, Page Shield, WAF | ~55 | [cloudflare-methods-security.md](./cloudflare-methods-security.md) |
| **Zero Trust** | Access Apps, Access Groups, Tunnels, Gateway, Devices, DLP, Identity Providers, Service Tokens | ~55 | [cloudflare-methods-zerotrust.md](./cloudflare-methods-zerotrust.md) |
| **Networking** | Load Balancers, Spectrum, Magic Transit, Argo, Addressing | ~45 | [cloudflare-methods-networking.md](./cloudflare-methods-networking.md) |
| **AI & ML** | Workers AI, AI Gateway, Vectorize, Browser Rendering | ~30 | [cloudflare-methods-ai.md](./cloudflare-methods-ai.md) |
| **Platform** | Accounts, User, Registrar, Email Routing, Logpush, Alerting, Cache, Audit Logs, Healthchecks | ~45 | [cloudflare-methods-platform.md](./cloudflare-methods-platform.md) |

**Total: ~425 methods**

### Help System — Two-Level Structure

Same pattern as Stripe/Hetzner:

```typescript
help(method?: string): ServiceHelp {
  if (!method) {
    return {
      service: 'cloudflare',
      name: 'Cloudflare',
      summary: 'Cloud platform — DNS, Workers, R2, Pages, Zero Trust, load balancers, AI, and more',
      methods: [],
      groups: [
        { name: 'dns', description: 'Zones, DNS records, DNSSEC, zone settings', methodCount: 45 },
        { name: 'workers', description: 'Workers scripts, KV, D1, Queues, Durable Objects, Workflows', methodCount: 70 },
        { name: 'storage', description: 'R2 object storage, Stream video, Images', methodCount: 45 },
        { name: 'pages', description: 'Pages projects, custom hostnames, waiting rooms', methodCount: 35 },
        { name: 'security', description: 'Rulesets, firewall, SSL/TLS, certificates, WAF, Turnstile', methodCount: 55 },
        { name: 'zerotrust', description: 'Access apps, tunnels, gateway, devices, DLP', methodCount: 55 },
        { name: 'networking', description: 'Load balancers, Spectrum, Magic Transit, Argo', methodCount: 45 },
        { name: 'ai', description: 'Workers AI, AI Gateway, Vectorize, Browser Rendering', methodCount: 30 },
        { name: 'platform', description: 'Accounts, user, registrar, email routing, logpush, alerting', methodCount: 45 },
      ],
    };
  }

  const group = groups.get(method);
  if (group) {
    return { service: 'cloudflare', name: 'Cloudflare', methods: group.methods };
  }

  const m = allMethods.find(m => m.name === method);
  return { service: 'cloudflare', name: 'Cloudflare', methods: m ? [m] : [] };
}
```

### Human-Readable Request Descriptions

```typescript
function describeCloudflareRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'zones.create':
      return `Create zone "${params.name}"`;
    case 'zones.delete':
      return `Delete zone ${params.zone_id}`;
    case 'dns.records.create':
      return `Create ${params.type} record "${params.name}" → ${params.content}`;
    case 'dns.records.delete':
      return `Delete DNS record ${params.dns_record_id} in zone ${params.zone_id}`;
    case 'workers.scripts.update':
      return `Deploy worker "${params.script_name}"`;
    case 'workers.scripts.delete':
      return `Delete worker "${params.script_name}"`;
    case 'kv.namespaces.create':
      return `Create KV namespace "${params.title}"`;
    case 'kv.namespaces.delete':
      return `Delete KV namespace ${params.namespace_id}`;
    case 'kv.namespaces.values.update':
      return `Write KV key "${params.key_name}" in namespace ${params.namespace_id}`;
    case 'kv.namespaces.values.delete':
      return `Delete KV key "${params.key_name}" in namespace ${params.namespace_id}`;
    case 'r2.buckets.create':
      return `Create R2 bucket "${params.name}"`;
    case 'r2.buckets.delete':
      return `Delete R2 bucket "${params.bucket_name}"`;
    case 'd1.database.create':
      return `Create D1 database "${params.name}"`;
    case 'd1.database.delete':
      return `Delete D1 database ${params.database_id}`;
    case 'd1.database.query':
      return `Query D1 database ${params.database_id}`;
    case 'pages.projects.create':
      return `Create Pages project "${params.name}"`;
    case 'pages.projects.delete':
      return `Delete Pages project "${params.project_name}"`;
    case 'zeroTrust.access.applications.create':
      return `Create Access application "${params.name}"`;
    case 'zeroTrust.access.applications.delete':
      return `Delete Access application ${params.app_id}`;
    case 'loadBalancers.create':
      return `Create load balancer "${params.name}"`;
    case 'loadBalancers.delete':
      return `Delete load balancer ${params.load_balancer_id}`;
    // ... pattern continues for all write/delete methods
    default: {
      const parts = method.split('.');
      const action = parts[parts.length - 1];
      const resource = parts.slice(0, -1).join('.');
      if (params.id || params.zone_id) return `${capitalize(action)} ${resource}`;
      return `${capitalize(action)} ${resource}`;
    }
  }
}
```

### Resource Types

Derived from method prefix for `PermissionMetadata.resourceType`:

| Method Prefix | Resource Type |
|---------------|---------------|
| `zones.*` | `zone` |
| `dns.records.*` | `dns_record` |
| `dns.dnssec.*` | `dnssec` |
| `dnsFirewall.*` | `dns_firewall` |
| `workers.scripts.*` | `worker_script` |
| `workers.routes.*` | `worker_route` |
| `kv.namespaces.*` | `kv_namespace` |
| `d1.database.*` | `d1_database` |
| `queues.*` | `queue` |
| `r2.buckets.*` | `r2_bucket` |
| `stream.*` | `stream_video` |
| `images.*` | `image` |
| `pages.projects.*` | `pages_project` |
| `loadBalancers.*` | `load_balancer` |
| `rulesets.*` | `ruleset` |
| `firewall.*` | `firewall_rule` |
| `zeroTrust.access.*` | `access` |
| `zeroTrust.tunnels.*` | `tunnel` |
| `accounts.*` | `account` |
| `ssl.*` | `ssl_certificate` |
| `ai.*` | `ai` |
| `vectorize.*` | `vectorize_index` |
| `healthchecks.*` | `healthcheck` |

### Pagination

The Cloudflare SDK handles pagination automatically via async iterators. Most `list` methods support:

```typescript
const PAGE_PARAM = { name: 'page', type: 'number', required: false, description: 'Page number (default 1)' };
const PER_PAGE_PARAM = { name: 'per_page', type: 'number', required: false, description: 'Results per page (5-50, default 20)' };
const LIST_PARAMS = [PAGE_PARAM, PER_PAGE_PARAM];
```

Some resources use cursor-based pagination:
```typescript
const CURSOR_PARAM = { name: 'cursor', type: 'string', required: false, description: 'Pagination cursor from previous response' };
const LIMIT_PARAM = { name: 'limit', type: 'number', required: false, description: 'Number of results to return' };
```

### Execution Pattern

The SDK mirrors the API resource hierarchy. Method names map directly to SDK calls:

```typescript
async function execute(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials
): Promise<unknown> {
  const client = getClient(credentials);
  // Navigate SDK object tree: 'dns.records.create' → client.dns.records.create(params)
  const parts = method.split('.');
  const action = parts.pop()!;
  let target: any = client;
  for (const part of parts) {
    target = target[part];
    if (!target) throw new Error(`Unknown resource: ${parts.join('.')}`);
  }
  const fn = target[action];
  if (typeof fn !== 'function') throw new Error(`Unknown method: ${method}`);

  // Most CF SDK methods take a single params object
  const result = await fn.call(target, params);

  // Handle paginated results — collect all pages
  if (result && typeof result[Symbol.asyncIterator] === 'function') {
    const items: unknown[] = [];
    for await (const item of result) {
      items.push(item);
    }
    return items;
  }

  return result;
}
```

### Common Params

These params appear across many methods:

- `account_id: string` — Required for account-scoped resources (Workers, KV, R2, D1, etc.)
- `zone_id: string` — Required for zone-scoped resources (DNS, zone settings, firewall rules, etc.)
- Most list methods accept `page`, `per_page`, `order`, `direction` (`asc`/`desc`)

### Rate Limiting

Cloudflare rate limits to 1200 requests per 5 minutes per user. On 429 responses, the connector returns an RPC error with `retryAfter` from the `Retry-After` header. No automatic retries beyond what the SDK provides (default 2 retries).

## Implementation Plan

### Files to create

1. **`packages/connectors/src/services/cloudflare.ts`** — Cloudflare service definition with `manualTokenAuth`
2. **`packages/connectors/src/connectors/cloudflare.ts`** — Cloudflare connector (method groups, execute, help)

### Files to modify

3. **`packages/connectors/src/index.ts`** — Export `cloudflareConnector` and `cloudflareService`
4. **`apps/keepd/src/server.ts`** — Register Cloudflare connector & service

### Execution order

1. Service definition (`services/cloudflare.ts`)
2. Connector implementation (`connectors/cloudflare.ts`) — largest file, ~3000-4000 lines
3. Registration in keepd + index exports
4. UI (add Cloudflare to connection dialog — separate pass)

## Decisions

1. **Auth**: API token via `manualTokenAuth` — no OAuth
2. **SDK**: Official `cloudflare` npm package (v5.x) — handles HTTP, auth, pagination, serialization
3. **Scope**: All production v4 resources; exclude Radar (analytics-only), Intel, Cloudforce One (enterprise)
4. **Help system**: Two-level — root returns group summaries, `help <group>` returns full method list
5. **Pagination**: SDK auto-pagination via async iterators; expose `page`/`per_page` for agents who want manual control
6. **Account/Zone IDs**: Required per-method as params — agents must know their account/zone IDs (discoverable via `accounts.list` and `zones.list`)
7. **Rate limiting**: SDK handles 2 automatic retries; beyond that, return error with retryAfter
