# Stripe Methods — Issuing

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers Stripe Issuing — create and manage virtual and physical payment cards.

## issuing.authorizations (4 methods)

Real-time authorization requests when an issued card is used for a purchase.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.authorizations.retrieve` | read | `stripe.issuing.authorizations.retrieve(id)` | Retrieve an authorization. |
| `issuing.authorizations.update` | write | `stripe.issuing.authorizations.update(id, params)` | Update authorization metadata. |
| `issuing.authorizations.list` | read | `stripe.issuing.authorizations.list(params)` | List authorizations, most recent first. |
| `issuing.authorizations.approve` | write | `stripe.issuing.authorizations.approve(id, params)` | Approve a pending authorization (deprecated — use real-time auth webhook). |

**notes**: `approve` and `decline` are deprecated. Use real-time authorization webhooks instead.

---

## issuing.cardholders (4 methods)

Individuals or businesses that issued cards belong to.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.cardholders.create` | write | `stripe.issuing.cardholders.create(params)` | Create a cardholder that can be issued cards. |
| `issuing.cardholders.retrieve` | read | `stripe.issuing.cardholders.retrieve(id)` | Retrieve a cardholder. |
| `issuing.cardholders.update` | write | `stripe.issuing.cardholders.update(id, params)` | Update a cardholder. |
| `issuing.cardholders.list` | read | `stripe.issuing.cardholders.list(params)` | List cardholders, most recent first. |

### Key Params — issuing.cardholders.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Cardholder's full name |
| `type` | string | yes | `individual` or `company` |
| `email` | string | no | Cardholder's email |
| `phone_number` | string | no | Phone number |
| `billing` | object | yes | `{ address: { line1, city, state, postal_code, country } }` |
| `spending_controls` | object | no | Spending limits and allowed categories |
| `status` | string | no | `active` or `inactive` |

---

## issuing.cards (4 methods)

Virtual and physical payment cards.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.cards.create` | write | `stripe.issuing.cards.create(params)` | Create an Issuing Card (virtual or physical). |
| `issuing.cards.retrieve` | read | `stripe.issuing.cards.retrieve(id)` | Retrieve a card. |
| `issuing.cards.update` | write | `stripe.issuing.cards.update(id, params)` | Update card status, spending controls, or metadata. |
| `issuing.cards.list` | read | `stripe.issuing.cards.list(params)` | List cards, most recent first. |

### Key Params — issuing.cards.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `cardholder` | string | yes | Cardholder ID |
| `currency` | string | yes | Three-letter ISO currency code |
| `type` | string | yes | `virtual` or `physical` |
| `status` | string | no | `active` or `inactive` (default: active) |
| `spending_controls` | object | no | `{ spending_limits: [{ amount, interval, categories? }] }` |
| `shipping` | object | no | Required for physical cards: `{ name, address, type? }` |

**seeAlso**: `issuing.cardholders.create`, `issuing.transactions.list`

---

## issuing.disputes (5 methods)

Dispute transactions on issued cards.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.disputes.create` | write | `stripe.issuing.disputes.create(params)` | Create an issuing dispute. Evidence fields are optional until submission. |
| `issuing.disputes.retrieve` | read | `stripe.issuing.disputes.retrieve(id)` | Retrieve an issuing dispute. |
| `issuing.disputes.update` | write | `stripe.issuing.disputes.update(id, params)` | Update a dispute (add evidence). |
| `issuing.disputes.list` | read | `stripe.issuing.disputes.list(params)` | List issuing disputes, most recent first. |
| `issuing.disputes.submit` | write | `stripe.issuing.disputes.submit(id)` | Submit a dispute to the card network. Validates required evidence. |

---

## issuing.personalizationDesigns (4 methods)

Custom card designs for physical cards.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.personalizationDesigns.create` | write | `stripe.issuing.personalizationDesigns.create(params)` | Create a card personalization design. |
| `issuing.personalizationDesigns.retrieve` | read | `stripe.issuing.personalizationDesigns.retrieve(id)` | Retrieve a personalization design. |
| `issuing.personalizationDesigns.update` | write | `stripe.issuing.personalizationDesigns.update(id, params)` | Update a card personalization design. |
| `issuing.personalizationDesigns.list` | read | `stripe.issuing.personalizationDesigns.list(params)` | List personalization designs. |

---

## issuing.physicalBundles (2 methods)

Physical card bundle configurations.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.physicalBundles.retrieve` | read | `stripe.issuing.physicalBundles.retrieve(id)` | Retrieve a physical bundle. |
| `issuing.physicalBundles.list` | read | `stripe.issuing.physicalBundles.list(params)` | List physical bundles. |

---

## issuing.tokens (3 methods)

Digital wallet tokens (Apple Pay, Google Pay) for issued cards.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.tokens.retrieve` | read | `stripe.issuing.tokens.retrieve(id)` | Retrieve an issuing token. |
| `issuing.tokens.update` | write | `stripe.issuing.tokens.update(id, params)` | Update a token's status (activate, suspend, etc.). |
| `issuing.tokens.list` | read | `stripe.issuing.tokens.list(params)` | List tokens for a card. |

---

## issuing.transactions (3 methods)

Completed transactions on issued cards.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `issuing.transactions.retrieve` | read | `stripe.issuing.transactions.retrieve(id)` | Retrieve a transaction. |
| `issuing.transactions.update` | write | `stripe.issuing.transactions.update(id, params)` | Update transaction metadata. |
| `issuing.transactions.list` | read | `stripe.issuing.transactions.list(params)` | List issuing transactions, most recent first. |

---

**Total: 29 methods**
