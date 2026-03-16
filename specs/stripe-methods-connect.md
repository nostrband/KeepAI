# Stripe Methods — Connect

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers Stripe Connect platform features: accounts, transfers, payouts, and balance management.

## Accounts (20 methods)

Connected accounts for Stripe Connect platforms. Includes sub-resources for external accounts (bank/card), persons, capabilities, and login links.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `accounts.create` | write | `stripe.accounts.create(params)` | Create a connected account. You can prefill information collected during onboarding. |
| `accounts.retrieve` | read | `stripe.accounts.retrieve(id)` | Retrieve a connected account. |
| `accounts.retrieveCurrent` | read | `stripe.accounts.retrieve()` | Retrieve the current (own) account. |
| `accounts.update` | write | `stripe.accounts.update(id, params)` | Update a connected account. |
| `accounts.list` | read | `stripe.accounts.list(params)` | List accounts connected to your platform. |
| `accounts.delete` | delete | `stripe.accounts.del(id)` | Delete a connected account. Test-mode: anytime. Live-mode: only when all balances are zero. |
| `accounts.reject` | write | `stripe.accounts.reject(id, params)` | Reject a suspicious account. Only for Custom/Express accounts. |
| `accounts.createExternalAccount` | write | `stripe.accounts.createExternalAccount(id, params)` | Add an external account (bank account or card) to a connected account. |
| `accounts.retrieveExternalAccount` | read | `stripe.accounts.retrieveExternalAccount(acctId, extId)` | Retrieve an external account. |
| `accounts.updateExternalAccount` | write | `stripe.accounts.updateExternalAccount(acctId, extId, params)` | Update an external account. |
| `accounts.deleteExternalAccount` | delete | `stripe.accounts.deleteExternalAccount(acctId, extId)` | Delete an external account. |
| `accounts.listExternalAccounts` | read | `stripe.accounts.listExternalAccounts(id, params)` | List external accounts for an account. |
| `accounts.createPerson` | write | `stripe.accounts.createPerson(id, params)` | Create a person (representative, owner, director) for a connected account. |
| `accounts.retrievePerson` | read | `stripe.accounts.retrievePerson(acctId, personId)` | Retrieve a person. |
| `accounts.updatePerson` | write | `stripe.accounts.updatePerson(acctId, personId, params)` | Update a person. |
| `accounts.deletePerson` | delete | `stripe.accounts.deletePerson(acctId, personId)` | Delete a person (cannot delete the account opener). |
| `accounts.listPersons` | read | `stripe.accounts.listPersons(id, params)` | List persons for an account. |
| `accounts.listCapabilities` | read | `stripe.accounts.listCapabilities(id)` | List capabilities for an account. |
| `accounts.retrieveCapability` | read | `stripe.accounts.retrieveCapability(acctId, capId)` | Retrieve a specific capability. |
| `accounts.createLoginLink` | write | `stripe.accounts.createLoginLink(id)` | Create a login link for Express Dashboard access. |

### Key Params — accounts.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | no | `standard`, `express`, or `custom` |
| `email` | string | no | Account holder's email |
| `country` | string | no | Two-letter country code |
| `business_type` | string | no | `individual`, `company`, `non_profit`, `government_entity` |
| `business_profile` | object | no | `{ name, url, mcc, support_email }` |
| `capabilities` | object | no | `{ card_payments: { requested: true }, transfers: { requested: true } }` |
| `tos_acceptance` | object | no | `{ date, ip }` — Terms of Service acceptance |
| `metadata` | object | no | Key-value metadata |

**seeAlso**: `accountLinks.create`, `transfers.create`, `payouts.create`

---

## AccountLinks (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `accountLinks.create` | write | `stripe.accountLinks.create(params)` | Create a single-use URL for Connect Onboarding flow. |

### Key Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | string | yes | Connected account ID |
| `refresh_url` | string | yes | URL to redirect if link expires |
| `return_url` | string | yes | URL to redirect after completion |
| `type` | string | yes | `account_onboarding` or `account_update` |

---

## AccountSessions (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `accountSessions.create` | write | `stripe.accountSessions.create(params)` | Create an AccountSession with a single-use token for client-side API access. |

---

## Transfers (8 methods)

Send funds from your Stripe account to connected accounts.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `transfers.create` | write | `stripe.transfers.create(params)` | Create a transfer to a connected account. Your balance must cover the amount. |
| `transfers.retrieve` | read | `stripe.transfers.retrieve(id)` | Retrieve a transfer. |
| `transfers.update` | write | `stripe.transfers.update(id, params)` | Update transfer metadata. |
| `transfers.list` | read | `stripe.transfers.list(params)` | List transfers to connected accounts. |
| `transfers.createReversal` | write | `stripe.transfers.createReversal(id, params)` | Reverse a transfer (full or partial). |
| `transfers.retrieveReversal` | read | `stripe.transfers.retrieveReversal(transferId, reversalId)` | Retrieve a transfer reversal. |
| `transfers.updateReversal` | write | `stripe.transfers.updateReversal(transferId, reversalId, params)` | Update reversal metadata. |
| `transfers.listReversals` | read | `stripe.transfers.listReversals(id, params)` | List reversals for a transfer. |

### Key Params — transfers.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | yes | Amount in smallest currency unit |
| `currency` | string | yes | Three-letter ISO currency code |
| `destination` | string | yes | Connected account ID (`acct_...`) |
| `description` | string | no | Description |
| `source_transaction` | string | no | Charge ID to pull funds from |
| `metadata` | object | no | Key-value metadata |

**seeAlso**: `payouts.create`, `accounts.create`

---

## Payouts (6 methods)

Send funds to your own bank account.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `payouts.create` | write | `stripe.payouts.create(params)` | Create a payout to your bank account. Balance must cover the amount. |
| `payouts.retrieve` | read | `stripe.payouts.retrieve(id)` | Retrieve a payout. |
| `payouts.update` | write | `stripe.payouts.update(id, params)` | Update payout metadata. |
| `payouts.list` | read | `stripe.payouts.list(params)` | List payouts. |
| `payouts.cancel` | write | `stripe.payouts.cancel(id)` | Cancel a pending payout. Cannot cancel automatic payouts. |
| `payouts.reverse` | write | `stripe.payouts.reverse(id, params)` | Reverse a payout by debiting the destination bank account. US and Canadian accounts only. |

### Key Params — payouts.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | yes | Amount in smallest currency unit |
| `currency` | string | yes | Three-letter ISO currency code |
| `destination` | string | no | External account ID (bank/card) |
| `method` | string | no | `standard` (default) or `instant` |
| `description` | string | no | Description on bank statement |
| `metadata` | object | no | Key-value metadata |

**seeAlso**: `transfers.create`, `balance.retrieve`

---

## Topups (5 methods)

Top up your Stripe balance from a bank account.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `topups.create` | write | `stripe.topups.create(params)` | Top up the balance. |
| `topups.retrieve` | read | `stripe.topups.retrieve(id)` | Retrieve a top-up. |
| `topups.update` | write | `stripe.topups.update(id, params)` | Update top-up metadata. |
| `topups.list` | read | `stripe.topups.list(params)` | List top-ups. |
| `topups.cancel` | write | `stripe.topups.cancel(id)` | Cancel a pending top-up. |

---

## ApplicationFees (6 methods)

Fees collected by the platform on Connect charges.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `applicationFees.retrieve` | read | `stripe.applicationFees.retrieve(id)` | Retrieve an application fee. |
| `applicationFees.list` | read | `stripe.applicationFees.list(params)` | List application fees collected. |
| `applicationFees.createRefund` | write | `stripe.applicationFees.createRefund(id, params)` | Refund an application fee (full or partial). |
| `applicationFees.retrieveRefund` | read | `stripe.applicationFees.retrieveRefund(feeId, refundId)` | Retrieve a fee refund. |
| `applicationFees.updateRefund` | write | `stripe.applicationFees.updateRefund(feeId, refundId, params)` | Update fee refund metadata. |
| `applicationFees.listRefunds` | read | `stripe.applicationFees.listRefunds(id, params)` | List refunds for an application fee. |

**seeAlso**: `charges.create`, `paymentIntents.create`

---

## Balance (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `balance.retrieve` | read | `stripe.balance.retrieve()` | Retrieve the current account balance (available, pending, reserved). |

**seeAlso**: `balanceTransactions.list`, `payouts.create`

---

## BalanceSettings (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `balanceSettings.retrieve` | read | `stripe.balanceSettings.retrieve()` | Retrieve balance settings for a connected account. |
| `balanceSettings.update` | write | `stripe.balanceSettings.update(params)` | Update balance settings for a connected account. |

---

## BalanceTransactions (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `balanceTransactions.retrieve` | read | `stripe.balanceTransactions.retrieve(id)` | Retrieve a balance transaction. |
| `balanceTransactions.list` | read | `stripe.balanceTransactions.list(params)` | List all transactions that contributed to the account balance (charges, transfers, payouts, etc.). |

**seeAlso**: `balance.retrieve`

---

## CountrySpecs (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `countrySpecs.retrieve` | read | `stripe.countrySpecs.retrieve(id)` | Retrieve country spec for a given country code. |
| `countrySpecs.list` | read | `stripe.countrySpecs.list(params)` | List all country specs. |

---

## ExchangeRates (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `exchangeRates.retrieve` | read | `stripe.exchangeRates.retrieve(id)` | Retrieve exchange rates from a currency to all supported currencies. (Deprecated — use FX Quotes API.) |
| `exchangeRates.list` | read | `stripe.exchangeRates.list(params)` | List foreign currency exchange rate objects. (Deprecated — use FX Quotes API.) |

**notes**: ExchangeRates API is deprecated. Stripe recommends using the FX Quotes API instead.

---

**Total: 56 methods**
