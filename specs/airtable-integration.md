# Airtable OAuth Integration

## Overview

Add Airtable as a direct API connector (same pattern as Gmail). Airtable uses OAuth 2.0 Authorization Code with mandatory PKCE. No client secret (public client / desktop app).

## Design Issues

### 1. OAuthHandler needs PKCE support

**Problem**: Airtable mandates PKCE (S256) for all OAuth flows. The current `OAuthHandler` in `packages/connectors/src/oauth.ts` does not support PKCE — it has no `code_challenge`/`code_verifier` handling. The `McpOAuthClient` does support PKCE, but it's coupled to MCP discovery/registration flows we don't need.

**Solution**: Add optional PKCE support to `OAuthHandler` and `OAuthConfig`:

```typescript
// types.ts — extend OAuthConfig
export interface OAuthConfig {
  // ... existing fields ...
  pkce?: boolean; // When true, generate code_verifier/code_challenge (S256)
}
```

- `getAuthUrl()` — when `pkce: true`, generate a code verifier, compute S256 challenge, add `code_challenge` + `code_challenge_method` params. Return the verifier alongside the URL.
- `exchangeCode()` — accept optional `codeVerifier` param, include it in the token request body.
- The verifier must be stored alongside the pending state in `ConnectionManager.pendingStates`.

This benefits any future service that requires PKCE without being an MCP server.

### 2. No client secret (public client)

**Problem**: Airtable says desktop apps must NOT generate a client secret. The current `OAuthHandler.exchangeCode()` always sends `client_secret` (either in body or via Basic Auth). `getCredentialsForService()` in `credentials.ts` expects both `clientId` and `clientSecret`.

**Solution**:
- Make `clientSecret` optional in `OAuthHandler` constructor (allow empty string or undefined).
- When `clientSecret` is falsy and `useBasicAuth` is false, only send `client_id` in the body — omit `client_secret` entirely.
- Same for `refreshToken()` and `revokeToken()`.
- In `credentials.ts`, Airtable entry returns empty string for `clientSecret` (or add a new `OAuthPublicAppCredentials` type — but empty string is simpler and consistent).

### 3. Refresh token rotation

**Problem**: Airtable refresh tokens are **single-use**. Each refresh returns a new refresh token; the old one is immediately invalidated. If the new refresh token isn't persisted, the connection is permanently broken (user must re-authorize).

**Existing mitigation**: `ConnectionManager.getCredentials()` already deduplicates concurrent refreshes via `refreshPromises` map, and saves the new credentials after refresh. This handles the main risk.

**Additional safeguard**: The `refreshTokenInternal` path must ensure that when a refresh response includes a new `refresh_token`, it overwrites the stored one atomically. Verify this works correctly — if the process crashes between receiving the new token and writing it, the old (now-invalid) token remains. This is an inherent risk with rotating refresh tokens and is acceptable for v1. Document it.

### 4. No revocation endpoint

Airtable has no public token revocation endpoint. On disconnect, we skip revocation (the existing `OAuthHandler.revokeToken()` already returns `{ success: true, reason: 'not_supported' }` when `revokeUrl` is undefined).

## OAuth Configuration

```typescript
// packages/connectors/src/services/airtable.ts

export const airtableService: ServiceDefinition = {
  id: 'airtable',
  name: 'Airtable',
  icon: 'table',
  oauthConfig: {
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    scopes: [
      'data.records:read',
      'data.records:write',
      'data.recordComments:read',
      'data.recordComments:write',
      'schema.bases:read',
      'schema.bases:write',
      'webhook:manage',
      'user.email:read',
    ],
    pkce: true,
    // No revokeUrl — Airtable doesn't support it
    // No useBasicAuth — public client, no secret
    // No extraAuthParams
  },
  supportsRefresh: true,
  fetchProfile: fetchAirtableProfile,
  async extractAccountId(_tokenResponse, profile) {
    const p = profile as AirtableProfile;
    return p.id; // Airtable user ID: "usrXXXXXXXXXXXXXX"
  },
  extractDisplayName(_tokenResponse, profile) {
    const p = profile as AirtableProfile | undefined;
    return p?.email || p?.id;
  },
};

interface AirtableProfile {
  id: string;       // "usrXXXXXXXXXXXXXX"
  email?: string;   // Present when user.email:read scope is granted
  scopes: string[];
}

async function fetchAirtableProfile(accessToken: string): Promise<AirtableProfile> {
  const res = await fetch('https://api.airtable.com/v0/meta/whoami', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Airtable profile: ${res.status}`);
  }
  return res.json() as Promise<AirtableProfile>;
}
```

## Connector: API Methods

Create `packages/connectors/src/connectors/airtable.ts` following the Gmail pattern. Airtable REST API base: `https://api.airtable.com/v0`.

### Methods (v1 — essential CRUD)

| Method | HTTP | Description |
|---|---|---|
| `bases.list` | GET /meta/bases | List accessible bases |
| `base.tables` | GET /meta/bases/{baseId}/tables | List tables in a base |
| `records.list` | GET /{baseId}/{tableIdOrName} | List records (supports filterByFormula, sort, fields, pagination) |
| `records.get` | GET /{baseId}/{tableIdOrName}/{recordId} | Get a single record |
| `records.create` | POST /{baseId}/{tableIdOrName} | Create records (up to 10) |
| `records.update` | PATCH /{baseId}/{tableIdOrName} | Update records (up to 10) |
| `records.upsert` | PATCH /{baseId}/{tableIdOrName} | Upsert records (fieldsToMergeOn) |
| `records.delete` | DELETE /{baseId}/{tableIdOrName} | Delete records (up to 10) |
| `comments.list` | GET /{baseId}/{tableIdOrName}/{recordId}/comments | List comments |
| `comments.create` | POST /{baseId}/{tableIdOrName}/{recordId}/comments | Add comment |
| `whoami` | GET /meta/whoami | Get current user info |

### Operation Types for Policies

| Operation Type | Methods |
|---|---|
| read | bases.list, base.tables, records.list, records.get, comments.list, whoami |
| write | records.create, records.update, records.upsert, comments.create |
| delete | records.delete |

### Helper

```typescript
async function airtableFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {}
): Promise<unknown> {
  const url = `https://api.airtable.com/v0${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable API error ${response.status}: ${text}`);
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true };
  }
  return response.json();
}
```

## File Changes

### New files

1. **`packages/connectors/src/services/airtable.ts`** — Service definition, profile fetch, account ID extraction.
2. **`packages/connectors/src/connectors/airtable.ts`** — Connector with ~11 methods, permission metadata extraction, help.

### Modified files

3. **`packages/connectors/src/types.ts`** — Add `pkce?: boolean` to `OAuthConfig`.

4. **`packages/connectors/src/oauth.ts`** — Add PKCE support to `OAuthHandler`:
   - `getAuthUrl()` return type changed from `string` to `{ url: string; codeVerifier?: string }`. When `config.pkce` is true, generates verifier/challenge and includes `codeVerifier` in the result.
   - `exchangeCode()` accepts optional `codeVerifier` param, sends it as `code_verifier` in the token request body.
   - Skip sending `client_secret` when it's empty/undefined.
   - Same for `refreshToken()`.

5. **`packages/connectors/src/manager.ts`**:
   - `pendingStates` map: store `codeVerifier` alongside state when PKCE is used.
   - `startOAuthFlow()`: detect `pkce: true`, generate verifier, include challenge in auth URL.
   - `completeOAuthFlow()`: pass stored `codeVerifier` to `exchangeCode()`.

6. **`packages/connectors/src/credentials.ts`** — Add `airtable` case to `getCredentialsForService()` returning `{ clientId: process.env.AIRTABLE_CLIENT_ID, clientSecret: '' }`.

7. **`packages/connectors/src/index.ts`** — Export `airtableService` and `airtableConnector`, register them.

8. **`apps/keepd/src/routes/connections.ts`** — Add `airtable` to `HEALTH_CHECK_METHODS` using `whoami`.

9. **`apps/ui/src/components/connect-app-dialog.tsx`** — Add Airtable button to service picker.

## Build-Time Credentials

Add to `secrets.build.json` (or env):
```
AIRTABLE_CLIENT_ID=<your client id>
```

No `AIRTABLE_CLIENT_SECRET` needed.

## Callback URL

Register in Airtable integration settings:
```
http://localhost:7422/api/connections/airtable/callback
```

(Same pattern as Gmail/GitHub/Notion — constructed dynamically by keepd.)

## Token Lifetimes

- Access token: 60 minutes
- Refresh token: 60 days of inactivity (single-use, rotated on each refresh)

## Implementation Order

1. Add PKCE support to `OAuthHandler` + `OAuthConfig` + `ConnectionManager`
2. Add Airtable service definition + credentials
3. Add Airtable connector (API methods)
4. Register in index, add health check, add UI button
5. Test OAuth flow end-to-end
