# Resolvable IDs — Stripe Connector

Depends on: `resolvable-ids-infra.md`

## Resolvable Types

```ts
resolvableTypes: {
  customer_id: {
    label: 'Customer',
    params: {
      'customers.retrieve': 'id',
      'customers.update': 'id',
      'customers.delete': 'id',
    },
  },
  subscription_id: {
    label: 'Subscription',
    params: {
      'subscriptions.retrieve': 'id',
      'subscriptions.update': 'id',
      'subscriptions.cancel': 'id',
    },
  },
  payment_intent_id: {
    label: 'Payment',
    params: {
      'paymentIntents.retrieve': 'id',
      'paymentIntents.update': 'id',
      'paymentIntents.confirm': 'id',
      'paymentIntents.cancel': 'id',
      'paymentIntents.capture': 'id',
    },
  },
  invoice_id: {
    label: 'Invoice',
    params: {
      'invoices.retrieve': 'id',
      'invoices.update': 'id',
      'invoices.delete': 'id',
      'invoices.pay': 'id',
      'invoices.void': 'id',
      'invoices.finalize': 'id',
    },
  },
  product_id: {
    label: 'Product',
    params: {
      'products.retrieve': 'id',
      'products.update': 'id',
      'products.delete': 'id',
    },
  },
  price_id: {
    label: 'Price',
    params: {
      'prices.retrieve': 'id',
      'prices.update': 'id',
    },
  },
}
```

### Types not resolved

- `charge_id`, `refund_id`, `payout_id` — lower frequency, amounts are usually in params
- `tax_rate_id`, `coupon_id`, `promotion_code_id` — rarely in approval requests
- Sub-resource IDs (`source`, `tax_id`, `external_account`, `person`, `capability`) — require parent context

---

## resolveId Implementation

File: `packages/connectors/src/connectors/stripe/index.ts`

Stripe uses the official SDK.

```ts
async resolveId(
  type: string,
  id: string,
  credentials: OAuthCredentials
): Promise<ResolveResult | null> {
  const stripe = new Stripe(
    credentials.accessToken || (credentials as any).apiKey
  );

  try {
    switch (type) {
      case 'customer_id': {
        const customer = await stripe.customers.retrieve(id);
        if (customer.deleted) return { title: '(deleted customer)' };
        const label = customer.name || customer.email || id;
        return {
          title: label,
          url: `https://dashboard.stripe.com/customers/${id}`,
        };
      }
      case 'subscription_id': {
        const sub = await stripe.subscriptions.retrieve(id);
        const status = sub.status;
        // Try to show the plan/product name
        const item = sub.items?.data?.[0];
        const planName = item?.price?.product
          ? (typeof item.price.product === 'string' ? item.price.product : (item.price.product as any).name)
          : null;
        return {
          title: planName ? `${planName} (${status})` : `Subscription (${status})`,
          url: `https://dashboard.stripe.com/subscriptions/${id}`,
        };
      }
      case 'payment_intent_id': {
        const pi = await stripe.paymentIntents.retrieve(id);
        const amount = formatAmount(pi.amount, pi.currency);
        return {
          title: `${amount} (${pi.status})`,
          url: `https://dashboard.stripe.com/payments/${id}`,
        };
      }
      case 'invoice_id': {
        const inv = await stripe.invoices.retrieve(id);
        const amount = inv.amount_due ? formatAmount(inv.amount_due, inv.currency || 'usd') : '';
        const customer = typeof inv.customer === 'string' ? '' : (inv.customer as any)?.name || '';
        return {
          title: [amount, customer, inv.status].filter(Boolean).join(' — '),
          url: `https://dashboard.stripe.com/invoices/${id}`,
        };
      }
      case 'product_id': {
        const product = await stripe.products.retrieve(id);
        return {
          title: product.name || id,
          url: `https://dashboard.stripe.com/products/${id}`,
        };
      }
      case 'price_id': {
        const price = await stripe.prices.retrieve(id);
        const amount = formatAmount(price.unit_amount || 0, price.currency);
        const interval = price.recurring ? `/${price.recurring.interval}` : '';
        return {
          title: `${amount}${interval}`,
          url: `https://dashboard.stripe.com/prices/${id}`,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// Reuse existing formatAmount from stripe connector if available,
// or implement:
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
```

---

## describeStripeRequest — Updated Format

Stripe's `describeStripeRequest` uses `params.id` for most methods. The resolvable type depends on the method group.

### ID type mapping

| Method prefix | `params.id` resolves as |
|---|---|
| `customers.*` | `customer_id` |
| `subscriptions.*` | `subscription_id` |
| `paymentIntents.*` | `payment_intent_id` |
| `invoices.*` | `invoice_id` |
| `products.*` | `product_id` |
| `prices.*` | `price_id` |

### Key changes

Use a generic `ref()` helper that consults `resolvableTypes` to find the right type for a given method + param key:

```ts
// Generic helper — finds the resolvable type that maps to the given param key for a method
function ref(method: string, paramKey: string, value: unknown): string {
  if (!value) return '(unknown)';
  for (const [typeName, typeInfo] of Object.entries(resolvableTypes)) {
    if (typeInfo.params?.[method] === paramKey) {
      return `[${typeName}:${value}]`;
    }
  }
  return String(value);
}

// Before
case 'customers.retrieve': return `Retrieve customer ${params.id || '(unknown)'}`;
// After
case 'customers.retrieve': return `Retrieve ${ref(method, 'id', params.id)}`;

// Before
case 'customers.update': return `Update customer ${params.id || '(unknown)'}`;
// After
case 'customers.update': return `Update ${ref(method, 'id', params.id)}`;
```

Apply `ref(method, 'id', params.id)` across all methods that show an `id` parameter. The `ref()` helper is generic and reusable across connectors.

### Bare `id` Handling

Stripe uses bare `id` for most methods. The `params` field on each resolvable type declares the mapping explicitly — same pattern as Gmail. No heuristics needed.
