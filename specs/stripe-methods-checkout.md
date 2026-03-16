# Stripe Methods — Checkout

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers hosted checkout sessions and payment links.

## checkout.sessions (6 methods)

Hosted payment pages that collect payment details from customers.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `checkout.sessions.create` | write | `stripe.checkout.sessions.create(params)` | Create a Checkout Session. Returns a URL to redirect the customer. |
| `checkout.sessions.retrieve` | read | `stripe.checkout.sessions.retrieve(id)` | Retrieve a Checkout Session. |
| `checkout.sessions.update` | write | `stripe.checkout.sessions.update(id, params)` | Update a Checkout Session (for dynamic updates). |
| `checkout.sessions.list` | read | `stripe.checkout.sessions.list(params)` | List Checkout Sessions. |
| `checkout.sessions.expire` | write | `stripe.checkout.sessions.expire(id)` | Expire an open Checkout Session. Customer sees an expiration message. |
| `checkout.sessions.listLineItems` | read | `stripe.checkout.sessions.listLineItems(id, params)` | List line items for a Checkout Session. |

### Key Params — checkout.sessions.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | string | yes | `payment`, `subscription`, or `setup` |
| `success_url` | string | yes | URL to redirect on successful payment |
| `cancel_url` | string | no | URL to redirect if customer cancels |
| `line_items` | array | no | `[{ price: 'price_...', quantity: 1 }]` |
| `customer` | string | no | Existing customer ID |
| `customer_email` | string | no | Pre-fill customer email |
| `payment_method_types` | array | no | `['card', 'ideal', 'sepa_debit', ...]` — auto-detected if omitted |
| `currency` | string | no | Three-letter ISO currency code |
| `metadata` | object | no | Key-value metadata |
| `allow_promotion_codes` | boolean | no | Allow customer to enter promotion codes |
| `shipping_address_collection` | object | no | `{ allowed_countries: ['US', 'CA'] }` |
| `subscription_data` | object | no | Subscription-specific data (trial, metadata) |
| `invoice_creation` | object | no | Configure invoice creation for one-time payments |
| `expires_at` | number | no | Unix timestamp when session expires (min 30 min, max 24 hr) |

**seeAlso**: `paymentLinks.create`, `paymentIntents.create`, `subscriptions.create`

---

## PaymentLinks (5 methods)

Shareable URLs that accept payments. No-code alternative to Checkout Sessions.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `paymentLinks.create` | write | `stripe.paymentLinks.create(params)` | Create a payment link. |
| `paymentLinks.retrieve` | read | `stripe.paymentLinks.retrieve(id)` | Retrieve a payment link. |
| `paymentLinks.update` | write | `stripe.paymentLinks.update(id, params)` | Update a payment link. |
| `paymentLinks.list` | read | `stripe.paymentLinks.list(params)` | List payment links. |
| `paymentLinks.listLineItems` | read | `stripe.paymentLinks.listLineItems(id, params)` | List line items for a payment link. |

### Key Params — paymentLinks.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `line_items` | array | yes | `[{ price: 'price_...', quantity: 1 }]` |
| `after_completion` | object | no | `{ type: 'redirect', redirect: { url } }` or `{ type: 'hosted_confirmation' }` |
| `allow_promotion_codes` | boolean | no | Allow promotion codes |
| `metadata` | object | no | Key-value metadata |
| `payment_method_types` | array | no | Accepted payment methods |
| `shipping_address_collection` | object | no | Collect shipping address |

**seeAlso**: `checkout.sessions.create`, `products.create`, `prices.create`

---

**Total: 11 methods**
