# Billing Integration — Implementation Spec

This spec covers: plan enforcement, plan badge UI, upgrade flow, device auth sign-in, and billing server sync. Based on the API spec in `specs/08-desktop-integration.md`.

## 1. Data Model Changes

### 1.1 Billing credentials in DB (not file)

Store billing auth in the `settings` table (encrypted-at-rest later with sqlcipher). Keys:

| Key | Value |
|-----|-------|
| `billing_api_token` | 64-char hex string |
| `billing_token_expires_at` | ISO 8601 timestamp |
| `billing_user_id` | UUID |
| `billing_user_email` | string |
| `billing_user_display_name` | string or empty |

No `~/.keepai/auth.json` file — everything lives in the DB.

The `BILLING_API_URL` constant (`https://dashboard.getkeep.ai`) is defined in `packages/proto/src/constants.ts`.

### 1.2 Cached plan info in DB

Also in `settings`:

| Key | Value |
|-----|-------|
| `billing_plan_id` | e.g. `"pro"`, or `null`/absent = Free |
| `billing_plan_name` | e.g. `"Pro"` |
| `billing_plan_status` | `"active"`, `"past_due"`, or `null` |
| `billing_max_agents` | number |
| `billing_max_apps` | number |
| `billing_usage_agents` | number (server-side count, may differ from local) |
| `billing_usage_apps` | number |
| `billing_interval` | `"month"`, `"year"`, or `null` |
| `billing_period_end` | ISO 8601 |
| `billing_grace_period_end` | ISO 8601 or absent |
| `billing_last_sync` | ISO 8601 — last successful sync timestamp |

### 1.3 Soft-delete connections

Currently connections are hard-deleted (`DELETE FROM connections`). Change to soft-delete: set `status = 'disconnected'` instead. This preserves the `id` and `service` fields needed for billing sync.

All connection listing queries must be updated to filter out `status = 'disconnected'` (same pattern agents already use with `status = 'revoked'`).

After a successful billing sync removes the item from the server, the row can be hard-deleted (cleanup).

### 1.4 Free plan defaults (local, hardcoded)

When there is no billing token, or token exists but `subscription` is `null`:

```typescript
const FREE_PLAN = {
  plan_id: null,
  plan_name: 'Free',
  status: null,
  max_agents: 1,
  max_apps: 1,
};
```

These defaults are used when no cached plan data exists. Cached data is preferred when available (handles offline).

## 2. Daemon (keepd) Changes

### 2.1 BillingManager

New file: `apps/keepd/src/managers/billing-manager.ts`

Responsibilities:
- Billing API communication (sign-in, token refresh, sync, plan fetch)
- Credential storage/retrieval via `settings` table
- Plan cache management
- Sync orchestration

```typescript
class BillingManager {
  constructor(private db: KeepDBApi, private sse: SSEBroadcaster) {}

  // --- Auth ---
  hasToken(): boolean
  getToken(): string | null
  getUser(): { id: string; email: string; display_name: string } | null

  /** Device auth flow: returns { user_code, device_code } for UI to show */
  async initiateSignIn(): Promise<{ user_code: string; device_code: string; expires_at: string }>
  /** Poll for completion. Returns auth data on success, null if still pending */
  async pollSignIn(device_code: string): Promise<AuthResult | null>
  /** Save received token + user to DB */
  saveAuth(token: string, expires_at: string, user: UserInfo): void
  /** Clear all billing credentials and cached plan */
  clearAuth(): void
  /** Sign out: revoke token on server, then clearAuth */
  async signOut(): Promise<void>

  // --- Token lifecycle ---
  /** Refresh token if <7 days until expiry. Called on startup. */
  async refreshTokenIfNeeded(): Promise<void>

  // --- Plan ---
  /** Get current plan (cached). Returns FREE_PLAN if no cache/no token. */
  getPlan(): PlanInfo
  /** Fetch plan from billing server, update cache. Broadcast SSE on change. */
  async fetchPlan(): Promise<PlanInfo>

  // --- Sync ---
  /** Full reconciliation: push all local active items, delete all local tombstones */
  async fullSync(agents: Agent[], connections: Connection[]): Promise<void>
  /** Incremental: register single agent/app */
  async registerAgent(agent: Agent): Promise<void>
  async registerApp(connection: Connection): Promise<void>
  /** Incremental: unregister single agent/app */
  async unregisterAgent(agent: Agent): Promise<void>
  async unregisterApp(connection: Connection): Promise<void>
}
```

### 2.2 Sync logic

**What we send to billing server:**
- Agents: `agent_pubkey` as identifier (for relay whitelisting). Billing API `POST /api/agents` body: `{ pubkey: agent.agent_pubkey, name: agent.name }`
- Apps: connection `id` + `service`. Billing API `POST /api/apps` body: `{ pubkey: connection.id, service: connection.service, name: connection.label }`
- Billing API `DELETE` endpoints use query param: `DELETE /api/agents?pubkey={agent_pubkey}`, `DELETE /api/apps?pubkey={connection_id}` — avoids storing server-side UUIDs locally.

**Full sync (on startup, on first token received):**

```
1. If no token → skip, use FREE_PLAN defaults
2. Refresh token if needed
3. GET /api/account/status → cache plan info
4. GET /api/agents from billing → server_agents
5. GET /api/apps from billing → server_apps
6. For each local agent (status = paired | paused):
     If agent.agent_pubkey NOT in server_agents → POST /api/agents (ignore 409 duplicate)
7. For each local agent (status = revoked):
     If agent.agent_pubkey IN server_agents → DELETE /api/agents by pubkey
     On success → hard-delete the agent row from local DB (cleanup tombstone)
8. Same logic for connections (active vs disconnected)
9. On success → update billing_last_sync
```

**Important:** We only add/remove OUR items. Items on the server that we don't recognize locally belong to other desktop instances — leave them alone.

**Incremental sync (on add/remove agent or app):**
- On agent paired: `POST /api/agents` (fire-and-forget, best-effort)
- On agent revoked: `DELETE /api/agents` by pubkey (best-effort; full sync catches failures)
- On app connected: `POST /api/apps`
- On app disconnected: `DELETE /api/apps` by pubkey
- After any sync: re-fetch plan to update usage counts

**Error handling:**
- Network errors: log and continue, full sync on next restart will reconcile
- 401: clear auth, broadcast SSE `billing_auth_expired`
- Other errors: log, don't block the local operation

### 2.3 New keepd API routes

New file: `apps/keepd/src/routes/billing.ts`

```
GET  /api/billing/status    → plan info + auth state + limits
POST /api/billing/signin    → initiate device auth, returns { user_code, device_code, expires_at }
POST /api/billing/signin/poll → poll for completion, body: { device_code }
POST /api/billing/signout   → revoke token, clear auth
```

**`GET /api/billing/status` response:**

```json
{
  "authenticated": true,
  "user": { "email": "user@example.com", "display_name": "John" },
  "plan": {
    "plan_id": "pro",
    "plan_name": "Pro",
    "status": "active",
    "max_agents": 3,
    "max_apps": 10,
    "billing_interval": "month",
    "period_end": "2025-02-28T00:00:00Z"
  },
  "usage": {
    "agents": 2,
    "apps": 5
  }
}
```

When not authenticated:

```json
{
  "authenticated": false,
  "user": null,
  "plan": {
    "plan_id": null,
    "plan_name": "Free",
    "status": null,
    "max_agents": 1,
    "max_apps": 1
  },
  "usage": {
    "agents": 0,
    "apps": 0
  }
}
```

Usage counts come from LOCAL agent/connection counts (not billing server counts), since that's what matters for limit enforcement.

### 2.4 Startup sequence changes

In `server.ts`, after existing initialization (step 12ish):

```
13a. Initialize BillingManager
13b. Run billingManager.refreshTokenIfNeeded()
13c. Run billingManager.fullSync(agents, connections) — non-blocking (background)
```

### 2.5 Hook into agent/connection lifecycle

In `routes/agents.ts`:
- After successful agent pairing (status → paired): `billingManager.registerAgent(agent)`
- After agent revoke: `billingManager.unregisterAgent(agent)`

In `routes/connections.ts`:
- After successful OAuth callback (connection created): `billingManager.registerApp(connection)`
- After disconnect: change hard-delete to soft-delete (status='disconnected'), then `billingManager.unregisterApp(connection)`

## 3. UI Changes

### 3.1 New API client methods

In `apps/ui/src/lib/api.ts`:

```typescript
// Billing
getBillingStatus: () => request<BillingStatus>('/billing/status'),
startSignIn: () => request<{ user_code: string; device_code: string; expires_at: string }>('/billing/signin', { method: 'POST' }),
pollSignIn: (device_code: string) => request<{ status: string; api_token?: string }>('/billing/signin/poll', { method: 'POST', body: JSON.stringify({ device_code }) }),
signOut: () => request<void>('/billing/signout', { method: 'POST' }),
```

### 3.2 New hook: `use-billing.ts`

```typescript
function useBilling() → { data: BillingStatus, isLoading, refetch }
```

Uses TanStack Query, key: `['billing']`. Refetch on window focus + after sign-in + after agent/app mutations.

### 3.3 Plan badge (header)

Location: in `header.tsx`, between the "KeepAI Beta" logo and the approvals icon.

```
[KeepAI] [Beta] [Free ▾]  [🔔 3]  [☰]
```

Appearance:
- Default (Free): muted/gray badge, text "Free"
- Paid plan (active): subtle green/primary badge, text = plan name (e.g. "Pro")
- `past_due`: yellow/warning badge with ⚠️ icon, text = plan name

Clicking the badge opens the **plan info popover**.

### 3.4 Plan info popover

A Radix `Popover` anchored to the plan badge. Contents:

```
┌─────────────────────────┐
│  Pro Plan                │
│                          │
│  Agents    2 / 3         │
│  Apps      5 / 10        │
│                          │
│  [Upgrade]               │
│                          │
│  Signed in as            │
│  user@example.com        │
│  [Sign out]              │
└──────────────────────────┘
```

For Free plan (no auth):

```
┌─────────────────────────┐
│  Free Plan               │
│                          │
│  Agents    1 / 1         │
│  Apps      1 / 1         │
│                          │
│  [Upgrade]               │
│                          │
│  Not signed in           │
└──────────────────────────┘
```

For `past_due`:

```
┌─────────────────────────┐
│  ⚠️ Pro Plan             │
│  Payment issue           │
│                          │
│  Agents    2 / 3         │
│  Apps      5 / 10        │
│                          │
│  [Update payment]        │
└──────────────────────────┘
```

### 3.5 Upgrade modal

Triggered when user tries to add an agent or app and is at/over the limit.

Shown in `AddAgentDialog` (before showing the name input) and `ConnectAppDialog` (before showing service selection).

```
┌────────────────────────────────────────┐
│  Upgrade to add more agents            │
│                                        │
│  Your Free plan includes 1 agent.      │
│  Upgrade to Pro for up to 3 agents.    │
│                                        │
│  [Upgrade]          [Cancel]           │
└────────────────────────────────────────┘
```

(Same pattern for apps.)

### 3.6 Upgrade button behavior

1. Check if user has billing token (from `useBilling().data.authenticated`)
2. If **no token**: open sign-in modal (device auth flow)
3. If **has token**: open external browser to `https://dashboard.getkeep.ai/plans`

After the user upgrades in the browser, the next `GET /api/billing/status` (via refetch on window focus) will reflect the new plan.

### 3.7 Sign-in modal

New component: `SignInDialog`. Device auth flow UI.

States:
1. **Initiating** — "Connecting to KeepAI..." (brief, while POST /api/billing/signin)
2. **Waiting** — "Sign in with your browser. Your code: **A3K9M2X7**" + "Waiting for sign-in..." spinner. Browser auto-opens. Cancel button.
3. **Success** — "Signed in as user@example.com" + Done button
4. **Error/Timeout** — "Sign-in expired. Please try again." + Retry / Cancel buttons

On success:
- Refetch billing status
- If opened from upgrade flow → now open browser to `https://dashboard.getkeep.ai/plans`

### 3.8 Limit enforcement in UI

Before opening the add agent/app dialog, check limits:

```typescript
const { data: billing } = useBilling();
const agents = useAgents();

function handleAddAgent() {
  const activeAgents = agents.filter(a => a.status !== 'revoked').length;
  if (billing && activeAgents >= billing.plan.max_agents) {
    openUpgradeModal('agents');
    return;
  }
  openAddAgentDialog();
}
```

Same pattern for connections. Count only active (non-revoked/non-disconnected) items.

**Grandfathering:** If user already has more items than limit (e.g. downgraded), existing items work fine. Only new additions are blocked. The check is `current_count >= max`, not `>`.

## 4. SSE Events

New events broadcast by keepd:

| Event | When | Data |
|-------|------|------|
| `billing_updated` | Plan info changes after sync/fetch | `{ plan: PlanInfo, usage: Usage }` |
| `billing_auth_expired` | Token revoked/expired (401 from billing API) | `{}` |

UI listens for `billing_updated` to invalidate the `['billing']` query cache.

## 5. File Inventory

### New files:
- `apps/keepd/src/managers/billing-manager.ts` — BillingManager class
- `apps/keepd/src/routes/billing.ts` — billing HTTP routes
- `apps/ui/src/hooks/use-billing.ts` — TanStack Query hook
- `apps/ui/src/components/plan-badge.tsx` — header badge + popover
- `apps/ui/src/components/upgrade-dialog.tsx` — upgrade limit modal
- `apps/ui/src/components/signin-dialog.tsx` — device auth flow modal

### Modified files:
- `apps/keepd/src/server.ts` — init BillingManager, register billing routes, run sync on startup
- `apps/keepd/src/routes/agents.ts` — call billingManager on pair/revoke
- `apps/keepd/src/routes/connections.ts` — soft-delete, call billingManager on connect/disconnect
- `packages/db/src/stores/connection-store.ts` — change `delete()` to soft-delete, update list queries to filter disconnected
- `apps/ui/src/components/header.tsx` — add PlanBadge
- `apps/ui/src/components/add-agent-dialog.tsx` — limit check before opening
- `apps/ui/src/components/connect-app-dialog.tsx` — limit check before opening
- `apps/ui/src/lib/api.ts` — add billing endpoints
- `apps/ui/src/pages/agents.tsx` — limit check on "Add agent" button
- `apps/ui/src/pages/connections.tsx` — limit check on "Add app" button

## 6. Implementation Order

1. **DB changes** — soft-delete connections, verify all queries filter correctly
2. **BillingManager** — auth storage, token refresh, plan fetch, sync logic
3. **Billing routes** — expose billing state to UI
4. **Lifecycle hooks** — wire agent/connection add/remove to billing sync
5. **UI: `use-billing` hook + API client** — data layer
6. **UI: PlanBadge + popover** — always-visible plan indicator
7. **UI: UpgradeDialog** — limit enforcement UX
8. **UI: SignInDialog** — device auth flow
9. **Wire upgrade button** — sign-in-if-needed → open browser
10. **Wire limit checks** — in agent/app pages before opening add dialogs

## 7. Edge Cases

- **Offline:** Use cached plan from DB. If no cache exists and no token → Free defaults.
- **Token expiry during use:** Any 401 from billing API → clear auth, broadcast `billing_auth_expired`, UI shows "session expired" toast, plan falls back to cached data (not immediately to Free — avoids jarring UX).
- **Multiple desktop instances:** Each syncs its own items. Full sync only touches items it recognizes locally. Server may show higher usage counts than any single instance sees.
- **Downgrade:** User had Pro (3 agents), connects 3, then downgrades to Free (1 agent). All 3 agents continue to work. User just can't add a 4th (or even a 2nd, since limit is now 1 and count is 3, so `3 >= 1` blocks new additions).
- **Race conditions in sync:** Sync operations are best-effort. 409 (duplicate) on register and 404 on unregister are silently ignored.
- **`past_due`:** Treat like active for existing items but block new additions (same as limit reached). Show warning in badge.
