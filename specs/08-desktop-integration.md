# Desktop App Integration Guide

This document contains everything needed to integrate the KeepAI desktop app (Electron/keepd) with the billing dashboard API at `https://dashboard.getkeep.ai`.

The desktop app has **zero Supabase dependency** — it only communicates with our API using a long-lived API token.

## Base URL

```
https://dashboard.getkeep.ai
```

All endpoints below are relative to this base URL.

## Authentication

### Sign-in Flow

The desktop app authenticates by opening the user's browser, where they sign in via the web dashboard. The desktop app receives an API token after the user approves.

```
1. Generate device_code          (random 32 bytes, hex = 64 chars)
2. POST /api/auth/device         → get user_code + expires_at
3. Open browser to /signin?code={user_code}
4. Poll POST /api/auth/device/exchange every 2s
5. On success → receive api_token + user profile
6. Save to ~/.keepai/auth.json
```

#### Step 1 — Initiate

Generate a cryptographically random `device_code` and send it to the backend:

```
POST /api/auth/device
Content-Type: application/json

{ "device_code": "a1b2c3d4...64-hex-chars" }
```

**Response (201):**
```json
{
  "user_code": "A3K9M2X7",
  "expires_at": "2026-03-12T10:10:00Z"
}
```

**Errors:**
- `400` — `device_code` must be a 64-char hex string

#### Step 2 — Open browser

Open the system default browser to:

```
https://dashboard.getkeep.ai/signin?code=A3K9M2X7
```

The user will sign in (or already be signed in) and click "Approve" in the browser. The desktop app does not need to do anything during this step — just show a "Waiting for browser sign-in..." UI.

#### Step 3 — Poll for completion

Poll every 2 seconds until the flow completes, times out, or is canceled by the user:

```
POST /api/auth/device/exchange
Content-Type: application/json

{ "device_code": "a1b2c3d4...64-hex-chars" }
```

**Response while waiting (200):**
```json
{ "status": "pending" }
```

**Response on success (200):**
```json
{
  "api_token": "e5f6a7b8...64-hex-chars",
  "expires_at": "2026-06-10T00:00:00Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe"
  }
}
```

**Response on expiry/already used (410):**
```json
{ "status": "expired" }
```

**Errors:**
- `404` — `device_code` not found
- `410` — expired or already exchanged (show "expired, try again" to user)
- `429` — polling too fast (back off)

The entire flow has a **10-minute window**. If `expires_at` passes without success, stop polling and show a timeout message.

#### Step 4 — Store credentials

Save the token and user info to `~/.keepai/auth.json`:

```json
{
  "api_token": "e5f6a7b8...64-hex-chars",
  "expires_at": "2026-06-10T00:00:00Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe"
  }
}
```

### Making API Calls

All API calls use the `api_token` as a Bearer token:

```
Authorization: Bearer {api_token}
Content-Type: application/json
```

### Token Refresh

API tokens expire after **90 days**. The desktop app should refresh proactively when the token has less than 7 days remaining. Refreshing does **not** require the browser flow — it's a single API call:

```
POST /api/auth/token/refresh
Authorization: Bearer {current_api_token}
```

**Response (200):**
```json
{
  "api_token": "new-64-hex-chars",
  "expires_at": "2026-06-10T00:00:00Z"
}
```

The old token is **immediately invalidated**. Update `~/.keepai/auth.json` with the new token right away.

**Errors:**
- `401` — token invalid, expired, or revoked. Trigger full re-auth via browser.

### Sign-out

To sign out, revoke the token and delete local credentials:

```
DELETE /api/auth/token/{token_id}
Authorization: Bearer {api_token}
```

Then delete `~/.keepai/auth.json`.

To get the token's `id`, call `GET /api/auth/tokens` (see below) and find the entry where `is_current: true`.

### Handling 401 Errors

If **any** API call returns `401`, the token has been revoked or expired. The desktop app should:

1. Delete `~/.keepai/auth.json`
2. Show a message: "Your session has expired. Please sign in again."
3. Offer to restart the browser sign-in flow

## Available API Endpoints

These are the endpoints accessible with an API token. All other endpoints (billing, profile, plan changes) require a browser session and will return `403` if called with an API token.

### `GET /api/account/status`

Primary endpoint for the desktop app. Returns subscription status, plan limits, and current usage in a single call.

**Response (active subscription):**
```json
{
  "subscription": {
    "plan_id": "pro",
    "plan_name": "Pro",
    "status": "active",
    "billing_interval": "month",
    "current_period_end": "2025-02-28T00:00:00Z",
    "cancel_at_period_end": false,
    "stripe_coupon_id": "beta-50-off"
  },
  "limits": {
    "max_agents": 3,
    "max_apps": 10
  },
  "usage": {
    "agents": 2,
    "apps": 5
  }
}
```

**Response (no subscription):**
```json
{
  "subscription": null,
  "limits": null,
  "usage": { "agents": 0, "apps": 0 }
}
```

**Response (past_due / grace period):**
```json
{
  "subscription": {
    "plan_id": "pro",
    "plan_name": "Pro",
    "status": "past_due",
    "billing_interval": "month",
    "current_period_end": "2025-02-28T00:00:00Z",
    "grace_period_end": "2025-03-07T00:00:00Z",
    "cancel_at_period_end": false
  },
  "limits": { "max_agents": 3, "max_apps": 10 },
  "usage": { "agents": 2, "apps": 5 }
}
```

Use `subscription.status` to determine behavior:
- `"active"` — normal operation
- `"past_due"` — existing agents/apps work, but new registrations are blocked (API returns `403 plan_past_due`)
- `null` — no subscription, user needs to subscribe via the web dashboard

### `GET /api/agents`

List the user's registered agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "pubkey": "abc123...",
      "type": "OpenClaw",
      "name": "My Agent",
      "created_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### `POST /api/agents`

Register a new agent. Checks subscription status and plan limits.

**Request:**
```json
{
  "pubkey": "abc123...",
  "type": "OpenClaw",
  "name": "My Agent"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "pubkey": "abc123...",
  "type": "OpenClaw",
  "name": "My Agent",
  "created_at": "2025-01-15T00:00:00Z"
}
```

**Errors:**
- `403 no_subscription` — no active subscription
- `403 plan_past_due` — payment past due, new registrations blocked
- `409 limit_reached` — agent limit for current plan reached
- `409 duplicate` — pubkey already registered

### `DELETE /api/agents/{id}`

Remove a registered agent.

**Response:**
```json
{ "success": true }
```

**Errors:**
- `404` — agent not found or doesn't belong to user

### `GET /api/apps`

List the user's registered apps.

**Response:**
```json
{
  "apps": [
    {
      "id": "uuid",
      "pubkey": "def456...",
      "service": "gmail",
      "name": "Work Gmail",
      "created_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### `POST /api/apps`

Register a new app. Checks subscription status and plan limits.

**Request:**
```json
{
  "pubkey": "def456...",
  "service": "gmail",
  "name": "Work Gmail"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "pubkey": "def456...",
  "service": "gmail",
  "name": "Work Gmail",
  "created_at": "2025-01-15T00:00:00Z"
}
```

**Errors:**
- `403 no_subscription` — no active subscription
- `403 plan_past_due` — payment past due, new registrations blocked
- `409 limit_reached` — app limit for current plan reached
- `409 duplicate` — pubkey already registered

### `DELETE /api/apps/{id}`

Remove a registered app.

**Response:**
```json
{ "success": true }
```

**Errors:**
- `404` — app not found or doesn't belong to user

### `GET /api/auth/tokens`

List the user's connected devices / API tokens. Does not return token values.

**Response:**
```json
{
  "tokens": [
    {
      "id": "uuid",
      "name": "MacBook Pro",
      "created_at": "2026-01-15T00:00:00Z",
      "expires_at": "2026-04-15T00:00:00Z",
      "last_used_at": "2026-03-11T14:30:00Z",
      "is_current": true
    }
  ]
}
```

`is_current` is `true` for the token being used in the current request. Useful for identifying "this device" in a device list, and for getting the token `id` needed for sign-out (`DELETE /api/auth/token/{id}`).

### `DELETE /api/auth/token/{id}`

Revoke an API token. Used for sign-out (revoking own token) or revoking other devices.

**Response:**
```json
{ "success": true }
```

### `POST /api/auth/token/refresh`

Renew the current API token. See "Token Refresh" section above.

## Error Format

All error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable description"
}
```

HTTP status codes:
- `400` — bad request (invalid input)
- `401` — not authenticated (token invalid/expired/revoked)
- `403` — forbidden (no subscription, past due, or endpoint not available with API tokens)
- `404` — resource not found
- `409` — conflict (limit reached, duplicate)
- `410` — gone (device auth expired or already used)
- `429` — rate limited
- `500` — server error

## Reference Implementation

### Sign-in

```typescript
import crypto from 'crypto'
import { shell } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

const API_URL = 'https://dashboard.getkeep.ai'
const AUTH_FILE = path.join(os.homedir(), '.keepai', 'auth.json')

interface AuthData {
  api_token: string
  expires_at: string
  user: { id: string; email: string; display_name: string | null }
}

async function signIn(): Promise<AuthData> {
  const deviceCode = crypto.randomBytes(32).toString('hex')

  const initRes = await fetch(`${API_URL}/api/auth/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code: deviceCode }),
  })
  if (!initRes.ok) throw new Error('Failed to initiate sign-in')
  const { user_code, expires_at } = await initRes.json()

  shell.openExternal(`${API_URL}/signin?code=${user_code}`)

  const deadline = new Date(expires_at).getTime()
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))

    const res = await fetch(`${API_URL}/api/auth/device/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code: deviceCode }),
    })

    if (res.status === 410) throw new Error('Sign-in expired or already used')
    if (res.status === 429) continue

    const data = await res.json()
    if (data.status === 'pending') continue

    const authData: AuthData = {
      api_token: data.api_token,
      expires_at: data.expires_at,
      user: data.user,
    }
    saveAuth(authData)
    return authData
  }

  throw new Error('Sign-in timed out')
}
```

### Credential Storage

```typescript
function saveAuth(auth: AuthData): void {
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), { mode: 0o600 })
}

function loadAuth(): AuthData | null {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function clearAuth(): void {
  try { fs.unlinkSync(AUTH_FILE) } catch {}
}
```

### API Helper

```typescript
async function apiCall(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const auth = loadAuth()
  if (!auth) throw new Error('Not signed in')

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${auth.api_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    clearAuth()
    throw new Error('Session expired. Please sign in again.')
  }

  return res
}
```

### Token Refresh

```typescript
async function refreshTokenIfNeeded(): Promise<void> {
  const auth = loadAuth()
  if (!auth) return

  const expiresAt = new Date(auth.expires_at).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (expiresAt - Date.now() > sevenDays) return

  const res = await fetch(`${API_URL}/api/auth/token/refresh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.api_token}` },
  })

  if (res.status === 401) {
    clearAuth()
    return // will prompt re-auth on next API call
  }

  if (res.ok) {
    const data = await res.json()
    saveAuth({ ...auth, api_token: data.api_token, expires_at: data.expires_at })
  }
}
```

### Sign-out

```typescript
async function signOut(): Promise<void> {
  const auth = loadAuth()
  if (auth) {
    // Find current token ID and revoke it
    try {
      const res = await apiCall('GET', '/api/auth/tokens')
      if (res.ok) {
        const { tokens } = await res.json()
        const current = tokens.find((t: { is_current: boolean }) => t.is_current)
        if (current) {
          await apiCall('DELETE', `/api/auth/token/${current.id}`)
        }
      }
    } catch {
      // Best-effort revocation
    }
  }
  clearAuth()
}
```

### Startup Sequence

```typescript
async function startup(): Promise<AuthData> {
  const auth = loadAuth()
  if (!auth) {
    return signIn()
  }

  // Refresh token if expiring soon
  await refreshTokenIfNeeded()

  // Verify the token still works
  const res = await apiCall('GET', '/api/account/status')
  if (res.status === 401) {
    return signIn()
  }

  return loadAuth()!
}
```
