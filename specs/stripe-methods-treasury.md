# Stripe Methods — Treasury

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers Stripe Treasury — banking-as-a-service for platforms.

## treasury.financialAccounts (7 methods)

Treasury financial accounts hold funds and can send/receive money.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.financialAccounts.create` | write | `stripe.treasury.financialAccounts.create(params)` | Create a FinancialAccount. Up to 3 per connected account by default. |
| `treasury.financialAccounts.retrieve` | read | `stripe.treasury.financialAccounts.retrieve(id)` | Retrieve a FinancialAccount. |
| `treasury.financialAccounts.update` | write | `stripe.treasury.financialAccounts.update(id, params)` | Update a FinancialAccount. |
| `treasury.financialAccounts.list` | read | `stripe.treasury.financialAccounts.list(params)` | List FinancialAccounts. |
| `treasury.financialAccounts.close` | write | `stripe.treasury.financialAccounts.close(id)` | Close a FinancialAccount (must have zero balance, no pending transfers, and all Issuing cards canceled). |
| `treasury.financialAccounts.retrieveFeatures` | read | `stripe.treasury.financialAccounts.retrieveFeatures(id)` | Retrieve features for a FinancialAccount. |
| `treasury.financialAccounts.updateFeatures` | write | `stripe.treasury.financialAccounts.updateFeatures(id, params)` | Update features for a FinancialAccount. |

### Key Params — treasury.financialAccounts.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `supported_currencies` | array | yes | `['usd']` |
| `features` | object | no | Enable capabilities: `{ card_issuing, deposit_insurance, financial_addresses, inbound_transfers, intra_stripe_flows, outbound_payments, outbound_transfers }` |
| `metadata` | object | no | Key-value metadata |

---

## treasury.inboundTransfers (4 methods)

Pull funds into a FinancialAccount from an external bank account.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.inboundTransfers.create` | write | `stripe.treasury.inboundTransfers.create(params)` | Create an InboundTransfer. |
| `treasury.inboundTransfers.retrieve` | read | `stripe.treasury.inboundTransfers.retrieve(id)` | Retrieve an InboundTransfer. |
| `treasury.inboundTransfers.list` | read | `stripe.treasury.inboundTransfers.list(params)` | List InboundTransfers for a FinancialAccount. |
| `treasury.inboundTransfers.cancel` | write | `stripe.treasury.inboundTransfers.cancel(id)` | Cancel an InboundTransfer. |

### Key Params — treasury.inboundTransfers.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `financial_account` | string | yes | FinancialAccount ID to receive funds |
| `amount` | number | yes | Amount in smallest currency unit |
| `currency` | string | yes | Three-letter ISO currency code |
| `origin_payment_method` | string | yes | PaymentMethod ID (bank account) to pull from |
| `description` | string | no | Description |

---

## treasury.outboundPayments (4 methods)

Send funds from a FinancialAccount to an external party.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.outboundPayments.create` | write | `stripe.treasury.outboundPayments.create(params)` | Create an OutboundPayment. |
| `treasury.outboundPayments.retrieve` | read | `stripe.treasury.outboundPayments.retrieve(id)` | Retrieve an OutboundPayment. |
| `treasury.outboundPayments.list` | read | `stripe.treasury.outboundPayments.list(params)` | List OutboundPayments for a FinancialAccount. |
| `treasury.outboundPayments.cancel` | write | `stripe.treasury.outboundPayments.cancel(id)` | Cancel an OutboundPayment (before funds leave). |

### Key Params — treasury.outboundPayments.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `financial_account` | string | yes | FinancialAccount ID to send from |
| `amount` | number | yes | Amount in smallest currency unit |
| `currency` | string | yes | Three-letter ISO currency code |
| `customer` | string | no | Customer ID (for customer-linked payment methods) |
| `destination_payment_method` | string | no | PaymentMethod ID to send to |
| `description` | string | no | Description |

---

## treasury.outboundTransfers (4 methods)

Move funds from a FinancialAccount to the connected account's own external bank.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.outboundTransfers.create` | write | `stripe.treasury.outboundTransfers.create(params)` | Create an OutboundTransfer. |
| `treasury.outboundTransfers.retrieve` | read | `stripe.treasury.outboundTransfers.retrieve(id)` | Retrieve an OutboundTransfer. |
| `treasury.outboundTransfers.list` | read | `stripe.treasury.outboundTransfers.list(params)` | List OutboundTransfers for a FinancialAccount. |
| `treasury.outboundTransfers.cancel` | write | `stripe.treasury.outboundTransfers.cancel(id)` | Cancel an OutboundTransfer (before funds are paid out). |

---

## treasury.creditReversals (3 methods)

Reverse received credits back to the originator.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.creditReversals.create` | write | `stripe.treasury.creditReversals.create(params)` | Reverse a ReceivedCredit. |
| `treasury.creditReversals.retrieve` | read | `stripe.treasury.creditReversals.retrieve(id)` | Retrieve a CreditReversal. |
| `treasury.creditReversals.list` | read | `stripe.treasury.creditReversals.list(params)` | List CreditReversals. |

---

## treasury.debitReversals (3 methods)

Reverse received debits.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.debitReversals.create` | write | `stripe.treasury.debitReversals.create(params)` | Reverse a ReceivedDebit. |
| `treasury.debitReversals.retrieve` | read | `stripe.treasury.debitReversals.retrieve(id)` | Retrieve a DebitReversal. |
| `treasury.debitReversals.list` | read | `stripe.treasury.debitReversals.list(params)` | List DebitReversals. |

---

## treasury.receivedCredits (2 methods)

Credits received into a FinancialAccount (e.g., ACH, wire).

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.receivedCredits.retrieve` | read | `stripe.treasury.receivedCredits.retrieve(id)` | Retrieve a ReceivedCredit. |
| `treasury.receivedCredits.list` | read | `stripe.treasury.receivedCredits.list(params)` | List ReceivedCredits. |

---

## treasury.receivedDebits (2 methods)

Debits against a FinancialAccount.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.receivedDebits.retrieve` | read | `stripe.treasury.receivedDebits.retrieve(id)` | Retrieve a ReceivedDebit. |
| `treasury.receivedDebits.list` | read | `stripe.treasury.receivedDebits.list(params)` | List ReceivedDebits. |

---

## treasury.transactionEntries (2 methods)

Individual entries within treasury transactions.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.transactionEntries.retrieve` | read | `stripe.treasury.transactionEntries.retrieve(id)` | Retrieve a TransactionEntry. |
| `treasury.transactionEntries.list` | read | `stripe.treasury.transactionEntries.list(params)` | List TransactionEntries. |

---

## treasury.transactions (2 methods)

Top-level treasury transactions on a FinancialAccount.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `treasury.transactions.retrieve` | read | `stripe.treasury.transactions.retrieve(id)` | Retrieve a Transaction. |
| `treasury.transactions.list` | read | `stripe.treasury.transactions.list(params)` | List Transactions. |

---

**Total: 33 methods**
