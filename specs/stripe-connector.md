# Stripe Connector

## Overview

Add Stripe as a KeepAI connector using the official `stripe` npm package. Stripe uses **API key authentication** (not OAuth) with an optional **connected account ID** for platforms acting on behalf of connected accounts via Stripe Connect.

The Stripe API surface is massive (~350+ methods across 60+ resources), organized into logical groups. The connector's `help()` output uses a **two-level structure**: root `help` returns a summary of groups with method counts, and `help <group>` returns full method details for that group.

### Scope

- **Included**: All production v1 API resources
- **Excluded**: `testHelpers.*` (test-only), `v2.*` (beta), `climate.*` (niche/carbon removal)

## Authentication: API Key + Optional Account ID

### Why API key (not OAuth)

Stripe authenticates via secret API keys (`sk_live_...` / `sk_test_...`). There's no OAuth flow — users generate keys at https://dashboard.stripe.com/apikeys. This maps to the existing `manualTokenAuth` pattern (same as the X connector).

### Optional connected account ID

Stripe Connect platforms can act on behalf of connected accounts by passing the `Stripe-Account` header. In KeepAI, this is stored as part of the connection credentials. One connection = one Stripe account context. To manage both a platform account and connected accounts, users create separate connections.

### Credential fields

| Field | Label | Required | Secret | Description |
|-------|-------|----------|--------|-------------|
| `apiKey` | Secret Key | yes | yes | `sk_live_...` or `sk_test_...` |
| `accountId` | Connected Account ID | no | no | `acct_...` — only for Connect platforms |

### How credentials are stored

Reuses `OAuthCredentials` shape:
- `accessToken` — the API secret key
- `metadata.accountId` — optional connected account ID (for `Stripe-Account` header)

### Connection flow

1. User clicks "Connect Stripe" in UI
2. UI shows form: Secret Key (required, masked), Connected Account ID (optional)
3. Link to https://dashboard.stripe.com/apikeys with instructions
4. User pastes key and clicks Connect
5. `keepd` calls `POST /api/connections/manual-token` with `{ service: 'stripe', credentials: { apiKey, accountId? } }`
6. Validates via `stripe.accounts.retrieve()` (or `stripe.accounts.retrieveCurrent()`)
7. On success: stores credentials, creates connection with `accountId` = Stripe account ID
8. No refresh needed — API keys don't expire (until revoked by user)

## Service Definition

`packages/connectors/src/services/stripe.ts`:

```typescript
import Stripe from 'stripe';

export const stripeService: ServiceDefinition = {
  id: 'stripe',
  name: 'Stripe',
  icon: 'stripe',

  // No OAuth — manual API key entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions: 'Go to your Stripe Dashboard → Developers → API keys, then copy your Secret key below.',
    consoleUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'apiKey', label: 'Secret Key', placeholder: 'sk_live_... or sk_test_...', secret: true },
      { key: 'accountId', label: 'Connected Account ID', placeholder: 'acct_... (optional, for Connect platforms)' },
    ],
    validateCredentials: async (creds) => {
      const stripe = new Stripe(creds.apiKey);
      const account = creds.accountId
        ? await stripe.accounts.retrieve(creds.accountId)
        : await stripe.accounts.retrieve();
      const name = account.settings?.dashboard?.display_name
        || account.business_profile?.name
        || account.id;
      return {
        accountId: account.id,
        displayName: `${name} (${account.id})`,
      };
    },
  },

  async extractAccountId() { throw new Error('Use manualTokenAuth'); },
};
```

## Connector Implementation

`packages/connectors/src/connectors/stripe.ts`

### SDK Usage Pattern

```typescript
import Stripe from 'stripe';

function getClient(credentials: OAuthCredentials): Stripe {
  const meta = credentials.metadata as Record<string, string>;
  return new Stripe(credentials.accessToken, {
    // Act on behalf of connected account if configured
    ...(meta?.accountId ? { stripeAccount: meta.accountId } : {}),
  });
}
```

The `stripe` SDK handles all HTTP, authentication, and serialization. We call its methods directly — no raw HTTP needed.

### Method Groups

Methods are organized into **9 groups**. Each group is defined in a separate sub-spec file with full method tables.

| Group | Resources | Methods | Sub-Spec |
|-------|-----------|---------|----------|
| **Core Payments** | PaymentIntents, Charges, Refunds, Disputes, PaymentMethods, SetupIntents, Tokens, Sources, Mandates, SetupAttempts, ConfirmationTokens, PaymentMethodConfigurations, PaymentMethodDomains | ~50 | [stripe-methods-core.md](./stripe-methods-core.md) |
| **Customers & Products** | Customers, Products, Prices, Plans, Coupons, PromotionCodes, ShippingRates, TaxCodes, TaxRates, TaxIds | ~65 | [stripe-methods-customers.md](./stripe-methods-customers.md) |
| **Billing** | Invoices, InvoiceItems, InvoicePayments, InvoiceRenderingTemplates, CreditNotes, Subscriptions, SubscriptionItems, SubscriptionSchedules, Quotes, billing.*, billingPortal.* | ~75 | [stripe-methods-billing.md](./stripe-methods-billing.md) |
| **Connect** | Accounts, AccountLinks, AccountSessions, Transfers, Payouts, Topups, ApplicationFees, Balance, BalanceSettings, BalanceTransactions, CountrySpecs, ExchangeRates | ~50 | [stripe-methods-connect.md](./stripe-methods-connect.md) |
| **Checkout** | checkout.sessions, PaymentLinks | ~12 | [stripe-methods-checkout.md](./stripe-methods-checkout.md) |
| **Issuing** | issuing.authorizations, issuing.cardholders, issuing.cards, issuing.disputes, issuing.personalizationDesigns, issuing.physicalBundles, issuing.tokens, issuing.transactions | ~30 | [stripe-methods-issuing.md](./stripe-methods-issuing.md) |
| **Treasury** | treasury.financialAccounts, treasury.inboundTransfers, treasury.outboundPayments, treasury.outboundTransfers, treasury.creditReversals, treasury.debitReversals, treasury.receivedCredits, treasury.receivedDebits, treasury.transactionEntries, treasury.transactions | ~30 | [stripe-methods-treasury.md](./stripe-methods-treasury.md) |
| **Other** | Terminal, Identity, FinancialConnections, Tax, Radar, Reporting, Sigma, Events, Files, FileLinks, WebhookEndpoints, Reviews, ApplePayDomains, EphemeralKeys, Apps, Entitlements, Forwarding, CustomerSessions, PaymentAttemptRecords, PaymentRecords | ~80 | [stripe-methods-other.md](./stripe-methods-other.md) |

**Total: ~390 methods**

### Help System — Two-Level Structure

Unlike Gmail/X which print all methods on root `help`, Stripe uses a two-level approach:

```typescript
help(method?: string): ServiceHelp {
  if (!method) {
    // Root help: return group summaries only
    return {
      service: 'stripe',
      name: 'Stripe',
      summary: 'Payment processing — charges, subscriptions, invoices, connect, issuing, treasury, and more',
      methods: [], // Empty — agent should call help with a group name
      groups: [
        { name: 'core', description: 'Payment intents, charges, refunds, disputes, payment methods', methodCount: 50 },
        { name: 'customers', description: 'Customers, products, prices, coupons, tax codes/rates', methodCount: 65 },
        { name: 'billing', description: 'Invoices, subscriptions, quotes, credit notes, billing meters', methodCount: 75 },
        { name: 'connect', description: 'Accounts, transfers, payouts, balance, application fees', methodCount: 50 },
        { name: 'checkout', description: 'Checkout sessions, payment links', methodCount: 12 },
        { name: 'issuing', description: 'Card issuing — cards, cardholders, authorizations, disputes', methodCount: 30 },
        { name: 'treasury', description: 'Treasury — financial accounts, transfers, reversals', methodCount: 30 },
        { name: 'other', description: 'Terminal, identity, tax, radar, reporting, files, events, webhooks', methodCount: 80 },
      ],
    };
  }

  // If method matches a group name, return all methods in that group
  const group = groups.get(method);
  if (group) {
    return { service: 'stripe', name: 'Stripe', methods: group.methods };
  }

  // Otherwise, return single method help (existing behavior)
  const m = allMethods.find(m => m.name === method);
  return { service: 'stripe', name: 'Stripe', methods: m ? [m] : [] };
}
```

This requires a small extension to the `ServiceHelp` type:

```typescript
interface ServiceHelpGroup {
  name: string;
  description: string;
  methodCount: number;
}

// Add to ServiceHelp:
groups?: ServiceHelpGroup[];
```

### Human-Readable Request Descriptions

`describeStripeRequest(method, params)` generates approval-card descriptions:

```typescript
function describeStripeRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'paymentIntents.create':
      return `Create payment intent for ${formatAmount(params.amount as number, params.currency as string)}`;
    case 'paymentIntents.capture':
      return `Capture payment ${params.id}`;
    case 'charges.create':
      return `Create charge for ${formatAmount(params.amount as number, params.currency as string)}`;
    case 'customers.create':
      return `Create customer${params.email ? ` (${params.email})` : ''}`;
    case 'customers.delete':
      return `Delete customer ${params.id}`;
    case 'invoices.create':
      return `Create invoice${params.customer ? ` for customer ${params.customer}` : ''}`;
    case 'invoices.sendInvoice':
      return `Send invoice ${params.id}`;
    case 'invoices.pay':
      return `Pay invoice ${params.id}`;
    case 'subscriptions.create':
      return `Create subscription for customer ${params.customer || '(unknown)'}`;
    case 'subscriptions.cancel':
      return `Cancel subscription ${params.id}`;
    case 'refunds.create':
      return `Create refund${params.payment_intent ? ` for payment ${params.payment_intent}` : ''}`;
    case 'transfers.create':
      return `Transfer ${formatAmount(params.amount as number, params.currency as string)} to ${params.destination}`;
    case 'payouts.create':
      return `Create payout for ${formatAmount(params.amount as number, params.currency as string)}`;
    // ... pattern continues for all write/delete methods
    default: {
      const [resource, action] = method.split('.');
      if (params.id) return `${capitalize(action)} ${resource} ${params.id}`;
      return `${capitalize(action)} ${resource}`;
    }
  }
}

function formatAmount(amount: number | undefined, currency: string | undefined): string {
  if (!amount) return '(unknown amount)';
  const curr = (currency || 'usd').toUpperCase();
  // Stripe amounts are in smallest unit (cents)
  return `${(amount / 100).toFixed(2)} ${curr}`;
}
```

### Resource Types

Derived from the first segment of the method name for `PermissionMetadata.resourceType`:

| Method Prefix | Resource Type |
|---------------|---------------|
| `paymentIntents.*` | `payment_intent` |
| `charges.*` | `charge` |
| `customers.*` | `customer` |
| `invoices.*` | `invoice` |
| `subscriptions.*` | `subscription` |
| `products.*` | `product` |
| `prices.*` | `price` |
| `accounts.*` | `account` |
| `transfers.*` | `transfer` |
| `payouts.*` | `payout` |
| `refunds.*` | `refund` |
| etc. | first segment of method name |

### Pagination

Stripe uses cursor-based pagination with `starting_after` / `ending_before` (not page tokens). We pass these through as-is on all `list` methods:

```typescript
{
  name: 'starting_after', type: 'string', required: false,
  description: 'Cursor for pagination — pass the ID of the last object from the previous page',
},
{
  name: 'ending_before', type: 'string', required: false,
  description: 'Cursor for reverse pagination — pass the ID of the first object from the previous page',
},
{
  name: 'limit', type: 'number', required: false,
  description: 'Number of objects to return (1–100, default 10)',
  default: 10,
},
```

For `search` methods, Stripe uses `page` param with a cursor token:

```typescript
{
  name: 'page', type: 'string', required: false,
  description: 'Cursor for search pagination — from next_page in the previous response',
},
```

### Common Params

These params appear on nearly every method and are handled automatically:

- `expand: string[]` — Expand related objects inline. Not exposed as a param; agents can pass it and it's forwarded.
- `metadata: Record<string, string>` — Key-value metadata, available on most create/update methods.

### Rate Limiting

Stripe has rate limits (100 reads/sec, 100 writes/sec in live mode). The connector:
- On 429 responses, returns an RPC error with `retryAfter` field
- No automatic retries — agents handle backoff

## Implementation Plan

### Files to create

1. **`packages/connectors/src/services/stripe.ts`** — Stripe service definition with `manualTokenAuth`
2. **`packages/connectors/src/connectors/stripe.ts`** — Stripe connector (method groups, execute, help)

### Files to modify

3. **`packages/proto/src/types.ts`** — Add `groups?: ServiceHelpGroup[]` to `ServiceHelp` type
4. **`packages/connectors/src/index.ts`** — Export `stripeConnector` and `stripeService`
5. **`apps/keepd/src/server.ts`** — Register Stripe connector & service

### Execution order

1. Types (`ServiceHelpGroup` in proto)
2. Service definition (`services/stripe.ts`)
3. Connector implementation (`connectors/stripe.ts`) — largest file, ~2000-3000 lines
4. keepd registration
5. UI (add Stripe to connection dialog — separate pass)

## Decisions (Resolved)

1. **Auth**: API key via `manualTokenAuth` — no OAuth needed
2. **Connected accounts**: Part of connection credentials (`metadata.accountId`), applied as `stripeAccount` option on the Stripe client
3. **Scope**: All production v1 resources; exclude testHelpers, v2 (beta), climate
4. **Help system**: Two-level — root returns group summaries, `help <group>` returns full method list
5. **Pagination**: Pass through Stripe's `starting_after`/`ending_before` cursor pagination
6. **Idempotency**: Deferred — will add later, handled internally (not exposed to agents)
7. **SDK**: Use official `stripe` npm package — handles HTTP, auth, serialization, error handling
