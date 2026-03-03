# Electron App Integration

## Overview

The KeepAI Electron app integrates with the billing dashboard backend for:
1. **User authentication** (same Supabase Auth)
2. **Plan status checks** (is the user subscribed? what limits?)
3. **Agent/app registration** (count against plan limits)
4. **Agent/app removal** (free up slots)

The Electron app does NOT render the dashboard UI. For billing management (checkout, plan changes, payment methods), it directs the user to `dashboard.getkeep.ai` in their browser.

## Authentication in Electron

### Setup

Add `@supabase/supabase-js` as a dependency in the Electron app. Create a Supabase client with custom file-based storage:

```typescript
// In Electron app: lib/billing-auth.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const AUTH_FILE = path.join(os.homedir(), '.keepai', 'billing-auth.json')

const storage = {
  getItem(key: string): string | null {
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
      return data[key] ?? null
    } catch { return null }
  },
  setItem(key: string, value: string): void {
    let data = {}
    try { data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) } catch {}
    data[key] = value
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    fs.writeFileSync(AUTH_FILE, JSON.stringify(data), { mode: 0o600 })
  },
  removeItem(key: string): void {
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
      delete data[key]
      fs.writeFileSync(AUTH_FILE, JSON.stringify(data), { mode: 0o600 })
    } catch {}
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage, autoRefreshToken: true, persistSession: true },
})
```

### Login Flow (Electron UI)

The Electron app's login screen shows the same two options:

**Email OTP:**
```typescript
// 1. Send OTP
const { error } = await supabase.auth.signInWithOtp({ email })
if (error) { /* show error */ }

// 2. User enters 6-digit code
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: code,
  type: 'email',
})
if (data.session) { /* logged in! */ }
```

**Google OAuth:**

Uses a separate **"Desktop app"** type Google OAuth client (not the web one). See `03-auth.md` for why two clients are needed.

```typescript
// 1. Start local callback server (reuse keepd or temporary server)
const server = startLocalCallbackServer(port)

// 2. Generate nonce for replay protection
const nonce = crypto.randomBytes(32).toString('hex')
const nonceHash = crypto.createHash('sha256').update(nonce).digest('hex')

// 3. Open Google OAuth in system browser
const googleAuthUrl = buildGoogleAuthUrl({
  clientId: GOOGLE_DESKTOP_CLIENT_ID,  // "Desktop app" type client
  redirectUri: `http://127.0.0.1:${port}/auth/callback`,
  scope: 'openid email profile',
  state: generateRandomState(),
  nonce: nonceHash,
})
shell.openExternal(googleAuthUrl)

// 4. Local server receives callback with auth code
server.on('callback', async ({ code }) => {
  // 5. Exchange code for tokens with Google (using Desktop client ID + secret)
  const tokens = await exchangeGoogleCode(code, redirectUri, {
    clientId: GOOGLE_DESKTOP_CLIENT_ID,
    clientSecret: GOOGLE_DESKTOP_CLIENT_SECRET, // not truly secret for desktop apps
  })

  // 6. Sign in to Supabase with Google ID token
  // Supabase Auth server verifies token signature + checks aud matches one of configured client IDs
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token,
    nonce: nonce,  // original unhashed nonce
  })

  // 7. Done
  server.close()
})
```

This follows the exact same pattern as the existing Gmail connector's OAuth flow (system browser → localhost callback → token exchange).

### Session Check on App Launch

```typescript
// On Electron app startup
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  showLoginScreen()
} else {
  // Session exists (may be auto-refreshed)
  checkPlanStatus()
}
```

### Logout

```typescript
await supabase.auth.signOut()
// auth.json is cleared by storage.removeItem
showLoginScreen()
```

## API Calls from Electron

The Electron app calls the billing dashboard's API routes with the Supabase access token:

```typescript
const BILLING_API = 'https://dashboard.getkeep.ai/api'

async function billingFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(`${BILLING_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new BillingError(error.error, error.message, response.status)
  }

  return response.json()
}
```

### Plan Status Check

Called on app startup and periodically (every 5 minutes):

```typescript
async function checkPlanStatus(): Promise<AccountStatus> {
  const status = await billingFetch('/account/status')

  if (!status.subscription) {
    // No subscription -- prompt user to subscribe
    showMessage('Please subscribe at dashboard.getkeep.ai/plans')
    disableAllOperations()
    return status
  }

  if (status.subscription.status === 'canceled' || status.subscription.status === 'unpaid') {
    showMessage('Your subscription has expired. Please resubscribe.')
    disableAllOperations()
    return status
  }

  if (status.subscription.status === 'past_due') {
    showWarning('Payment issue. Please update your payment method at dashboard.getkeep.ai')
    // Existing operations continue but new registrations blocked
  }

  return status
}
```

### Agent Registration

Called when a new agent is paired in the Electron app:

```typescript
async function registerAgent(pubkey: string, type: string, name?: string) {
  try {
    const agent = await billingFetch('/agents', {
      method: 'POST',
      body: JSON.stringify({ pubkey, type, name }),
    })
    return agent
  } catch (error) {
    if (error.code === 'limit_reached') {
      showError(`Agent limit reached. Upgrade your plan at dashboard.getkeep.ai/plans`)
      throw error
    }
    if (error.code === 'no_subscription' || error.code === 'plan_past_due') {
      showError('Cannot add agents: subscription issue')
      throw error
    }
    throw error
  }
}
```

### Agent Removal

Called when an agent is unpaired in the Electron app:

```typescript
async function unregisterAgent(agentPubkey: string) {
  // First, find the agent ID by pubkey
  const { agents } = await billingFetch('/agents')
  const agent = agents.find(a => a.pubkey === agentPubkey)
  if (!agent) return // Not registered (might not have been registered due to offline, etc.)

  await billingFetch(`/agents/${agent.id}`, { method: 'DELETE' })
}
```

### App Registration / Removal

Same pattern as agents:

```typescript
async function registerApp(pubkey: string, service: string, name?: string) {
  return billingFetch('/apps', {
    method: 'POST',
    body: JSON.stringify({ pubkey, service, name }),
  })
}

async function unregisterApp(appPubkey: string) {
  const { apps } = await billingFetch('/apps')
  const app = apps.find(a => a.pubkey === appPubkey)
  if (!app) return
  await billingFetch(`/apps/${app.id}`, { method: 'DELETE' })
}
```

## Integration Points in Electron App

### Where to Hook In

| Electron Event | Billing Action |
|----------------|---------------|
| App launch | `supabase.auth.getSession()` → `checkPlanStatus()` |
| User clicks "Login" | Email OTP or Google OAuth flow |
| User clicks "Logout" | `supabase.auth.signOut()` |
| Agent paired | `registerAgent(pubkey, type, name)` |
| Agent unpaired | `unregisterAgent(pubkey)` |
| App connected | `registerApp(pubkey, service, name)` |
| App disconnected | `unregisterApp(pubkey)` |
| Every 5 minutes | `checkPlanStatus()` (background poll) |
| User clicks "Manage Subscription" | `shell.openExternal('https://dashboard.getkeep.ai/dashboard')` |

### Offline Handling

The Electron app may be offline when agent/app registration is attempted:
- Queue failed registration calls and retry when connectivity is restored
- Don't block agent pairing on billing registration failure (allow optimistic local operation)
- On next status check, sync actual registered counts

### Configuration

The Electron app needs these values (can be compiled in or loaded from config):

```typescript
const BILLING_CONFIG = {
  supabaseUrl: 'https://csywypoyojssyauvvfzz.supabase.co',
  supabaseAnonKey: '<anon key>',
  billingApiUrl: 'https://dashboard.getkeep.ai/api',
  googleDesktopClientId: '<Desktop app type Google client ID>',
  googleDesktopClientSecret: '<Desktop app client secret - not truly secret>',
}
```

## Auth Token Flow (Web ↔ Electron)

Both platforms use the same Supabase project and the same JWT tokens:

```
Web Dashboard:
  Browser → Supabase Auth → JWT in cookies → Server validates via getUser()

Electron App:
  Supabase JS → Supabase Auth → JWT in file storage → Sent as Bearer token to API routes
  API routes → Extract token from Authorization header → Validate via getUser()
```

The API routes need to support both cookie-based auth (web) and Bearer token auth (Electron). In Next.js:

```typescript
// In API route: get user from either cookie session or Bearer token
async function getAuthUser(request: Request) {
  // Try cookie-based auth first (web dashboard)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user

  // Try Bearer token (Electron app)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    return user
  }

  return null
}
```
