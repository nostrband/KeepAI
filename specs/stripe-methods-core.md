# Stripe Methods — Core Payments

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers core payment processing resources.

## PaymentIntents (12 methods)

The primary API for accepting payments. Tracks the lifecycle of a payment from creation through confirmation and capture.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `paymentIntents.create` | write | `stripe.paymentIntents.create(params)` | Create a PaymentIntent. Attach a payment method and confirm to continue the payment. |
| `paymentIntents.retrieve` | read | `stripe.paymentIntents.retrieve(id)` | Retrieve details of a PaymentIntent. |
| `paymentIntents.update` | write | `stripe.paymentIntents.update(id, params)` | Update properties on a PaymentIntent without confirming. |
| `paymentIntents.list` | read | `stripe.paymentIntents.list(params)` | List PaymentIntents, most recent first. |
| `paymentIntents.confirm` | write | `stripe.paymentIntents.confirm(id, params)` | Confirm that the customer intends to pay with current or provided payment method. |
| `paymentIntents.capture` | write | `stripe.paymentIntents.capture(id, params)` | Capture funds of an uncaptured PaymentIntent (status must be `requires_capture`). |
| `paymentIntents.cancel` | write | `stripe.paymentIntents.cancel(id, params)` | Cancel a PaymentIntent (when status is `requires_payment_method`, `requires_capture`, `requires_confirmation`, or `requires_action`). |
| `paymentIntents.search` | read | `stripe.paymentIntents.search(params)` | Search PaymentIntents using Stripe's Search Query Language. |
| `paymentIntents.applyCustomerBalance` | write | `stripe.paymentIntents.applyCustomerBalance(id, params)` | Manually reconcile remaining amount for a `customer_balance` PaymentIntent. |
| `paymentIntents.incrementAuthorization` | write | `stripe.paymentIntents.incrementAuthorization(id, params)` | Perform incremental authorization on an eligible PaymentIntent. |
| `paymentIntents.verifyMicrodeposits` | write | `stripe.paymentIntents.verifyMicrodeposits(id, params)` | Verify microdeposits on a PaymentIntent. |
| `paymentIntents.listAmountDetailsLineItems` | read | `stripe.paymentIntents.listAmountDetailsLineItems(id, params)` | List all line items of a PaymentIntent. |

### Key Params — paymentIntents.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | yes | Amount in smallest currency unit (e.g., 100 = $1.00) |
| `currency` | string | yes | Three-letter ISO currency code (e.g., `usd`) |
| `customer` | string | no | Customer ID to charge |
| `payment_method` | string | no | Payment method ID to use |
| `description` | string | no | Arbitrary description |
| `metadata` | object | no | Key-value metadata |
| `automatic_payment_methods` | object | no | `{ enabled: true }` to auto-detect payment methods |
| `capture_method` | string | no | `automatic` (default) or `manual` for auth-then-capture |
| `confirm` | boolean | no | Set true to confirm immediately on creation |
| `receipt_email` | string | no | Email to send receipt to |
| `setup_future_usage` | string | no | `off_session` or `on_session` — save payment method for future |
| `statement_descriptor` | string | no | Statement descriptor (max 22 chars) |
| `transfer_data` | object | no | `{ destination: 'acct_...' }` for Connect transfers |

### Key Params — paymentIntents.search

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Search query using Stripe Search Query Language |
| `limit` | number | no | Max results (1-100) |
| `page` | string | no | Pagination cursor from previous response |

**Search query syntax**: `status:"succeeded" AND amount>1000 AND currency:"usd"` — fields: `status`, `amount`, `currency`, `customer`, `created`, `metadata[key]`

**seeAlso**: `charges.create`, `refunds.create`, `paymentMethods.attach`

---

## Charges (6 methods)

Legacy payment API. New integrations should use PaymentIntents instead.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `charges.create` | write | `stripe.charges.create(params)` | Create a charge (deprecated — use PaymentIntents). |
| `charges.retrieve` | read | `stripe.charges.retrieve(id)` | Retrieve charge details. |
| `charges.update` | write | `stripe.charges.update(id, params)` | Update a charge (e.g., description, metadata). |
| `charges.list` | read | `stripe.charges.list(params)` | List charges, most recent first. |
| `charges.capture` | write | `stripe.charges.capture(id, params)` | Capture an uncaptured charge. |
| `charges.search` | read | `stripe.charges.search(params)` | Search charges using Stripe Search Query Language. |

**notes**: `charges.create` is deprecated — use `paymentIntents.create` instead.

**seeAlso**: `paymentIntents.create`, `refunds.create`

---

## Refunds (5 methods)

Create and manage refunds for charges or payment intents.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `refunds.create` | write | `stripe.refunds.create(params)` | Create a refund on a charge or PaymentIntent. Supports partial refunds. |
| `refunds.retrieve` | read | `stripe.refunds.retrieve(id)` | Retrieve refund details. |
| `refunds.update` | write | `stripe.refunds.update(id, params)` | Update refund metadata. |
| `refunds.list` | read | `stripe.refunds.list(params)` | List refunds, most recent first. |
| `refunds.cancel` | write | `stripe.refunds.cancel(id)` | Cancel a refund with status `requires_action`. |

### Key Params — refunds.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_intent` | string | yes* | PaymentIntent ID to refund (*one of `payment_intent` or `charge` required) |
| `charge` | string | yes* | Charge ID to refund |
| `amount` | number | no | Amount to refund in smallest unit (default: full amount) |
| `reason` | string | no | `duplicate`, `fraudulent`, or `requested_by_customer` |
| `metadata` | object | no | Key-value metadata |

**seeAlso**: `paymentIntents.create`, `charges.create`

---

## Disputes (4 methods)

Manage payment disputes (chargebacks).

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `disputes.retrieve` | read | `stripe.disputes.retrieve(id)` | Retrieve dispute details. |
| `disputes.update` | write | `stripe.disputes.update(id, params)` | Submit evidence for a dispute. |
| `disputes.list` | read | `stripe.disputes.list(params)` | List disputes. |
| `disputes.close` | write | `stripe.disputes.close(id)` | Close a dispute, acknowledging it as lost. Irreversible. |

**notes**: `disputes.close` is irreversible — the dispute status changes from `needs_response` to `lost`.

**seeAlso**: `charges.retrieve`, `paymentIntents.retrieve`

---

## PaymentMethods (6 methods)

Represent a customer's payment instruments (cards, bank accounts, wallets, etc.).

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `paymentMethods.create` | write | `stripe.paymentMethods.create(params)` | Create a PaymentMethod. Prefer using PaymentIntents or SetupIntents to collect payment methods. |
| `paymentMethods.retrieve` | read | `stripe.paymentMethods.retrieve(id)` | Retrieve a PaymentMethod attached to the account. |
| `paymentMethods.update` | write | `stripe.paymentMethods.update(id, params)` | Update a PaymentMethod (must be attached to a customer). |
| `paymentMethods.list` | read | `stripe.paymentMethods.list(params)` | List all PaymentMethods. Filter by `customer` and `type`. |
| `paymentMethods.attach` | write | `stripe.paymentMethods.attach(id, params)` | Attach a PaymentMethod to a Customer. |
| `paymentMethods.detach` | write | `stripe.paymentMethods.detach(id)` | Detach a PaymentMethod from a Customer. Cannot be used for payment after detaching. |

### Key Params — paymentMethods.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | `card`, `us_bank_account`, `sepa_debit`, `ideal`, `link`, etc. |
| `card` | object | no | Card details: `{ number, exp_month, exp_year, cvc }` |
| `billing_details` | object | no | `{ name, email, phone, address }` |
| `metadata` | object | no | Key-value metadata |

**seeAlso**: `paymentIntents.create`, `setupIntents.create`, `customers.listPaymentMethods`

---

## SetupIntents (7 methods)

Collect payment method details for future use without charging immediately.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `setupIntents.create` | write | `stripe.setupIntents.create(params)` | Create a SetupIntent to collect payment method permissions for later charges. |
| `setupIntents.retrieve` | read | `stripe.setupIntents.retrieve(id)` | Retrieve a SetupIntent. |
| `setupIntents.update` | write | `stripe.setupIntents.update(id, params)` | Update a SetupIntent. |
| `setupIntents.list` | read | `stripe.setupIntents.list(params)` | List SetupIntents. |
| `setupIntents.confirm` | write | `stripe.setupIntents.confirm(id, params)` | Confirm that the customer intends to set up the payment method. |
| `setupIntents.cancel` | write | `stripe.setupIntents.cancel(id)` | Cancel a SetupIntent (when status is `requires_payment_method`, `requires_confirmation`, or `requires_action`). |
| `setupIntents.verifyMicrodeposits` | write | `stripe.setupIntents.verifyMicrodeposits(id, params)` | Verify microdeposits on a SetupIntent. |

**seeAlso**: `paymentMethods.create`, `paymentIntents.create`

---

## Tokens (2 methods)

Single-use tokens representing payment details. Used with legacy integrations.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `tokens.create` | write | `stripe.tokens.create(params)` | Create a single-use token representing a bank account or card. |
| `tokens.retrieve` | read | `stripe.tokens.retrieve(id)` | Retrieve a token by ID. |

---

## Sources (5 methods)

Legacy payment source objects. Deprecated in favor of PaymentMethods.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `sources.create` | write | `stripe.sources.create(params)` | Create a new source object. |
| `sources.retrieve` | read | `stripe.sources.retrieve(id)` | Retrieve an existing source. |
| `sources.update` | write | `stripe.sources.update(id, params)` | Update source metadata and owner. |
| `sources.listSourceTransactions` | read | `stripe.sources.listSourceTransactions(id, params)` | List transactions for a source. |
| `sources.verify` | write | `stripe.sources.verify(id, params)` | Verify a source (e.g., bank account microdeposits). |

**notes**: Sources are deprecated — use PaymentMethods instead.

---

## Mandates (1 method)

Represent a customer's authorization to debit their payment method.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `mandates.retrieve` | read | `stripe.mandates.retrieve(id)` | Retrieve a Mandate object. |

---

## SetupAttempts (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `setupAttempts.list` | read | `stripe.setupAttempts.list(params)` | List SetupAttempts for a given SetupIntent. |

### Key Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `setup_intent` | string | yes | SetupIntent ID to list attempts for |

---

## ConfirmationTokens (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `confirmationTokens.retrieve` | read | `stripe.confirmationTokens.retrieve(id)` | Retrieve a ConfirmationToken. |

---

## PaymentMethodConfigurations (4 methods)

Configure which payment methods are available.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `paymentMethodConfigurations.create` | write | `stripe.paymentMethodConfigurations.create(params)` | Create a payment method configuration. |
| `paymentMethodConfigurations.retrieve` | read | `stripe.paymentMethodConfigurations.retrieve(id)` | Retrieve a configuration. |
| `paymentMethodConfigurations.update` | write | `stripe.paymentMethodConfigurations.update(id, params)` | Update a configuration. |
| `paymentMethodConfigurations.list` | read | `stripe.paymentMethodConfigurations.list(params)` | List all configurations. |

---

## PaymentMethodDomains (5 methods)

Register domains for use with payment methods that require domain verification.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `paymentMethodDomains.create` | write | `stripe.paymentMethodDomains.create(params)` | Create a payment method domain. |
| `paymentMethodDomains.retrieve` | read | `stripe.paymentMethodDomains.retrieve(id)` | Retrieve a payment method domain. |
| `paymentMethodDomains.update` | write | `stripe.paymentMethodDomains.update(id, params)` | Update a payment method domain. |
| `paymentMethodDomains.list` | read | `stripe.paymentMethodDomains.list(params)` | List all payment method domains. |
| `paymentMethodDomains.validate` | write | `stripe.paymentMethodDomains.validate(id)` | Validate a payment method domain to activate inactive payment methods. |

---

**Total: 54 methods**
