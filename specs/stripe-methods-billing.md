# Stripe Methods — Billing

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers invoicing, subscriptions, quotes, credit notes, and billing metering.

## Invoices (17 methods)

Create, manage, and collect payment on invoices.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `invoices.create` | write | `stripe.invoices.create(params)` | Create a draft invoice for a customer. Remains draft until finalized. |
| `invoices.retrieve` | read | `stripe.invoices.retrieve(id)` | Retrieve an invoice. |
| `invoices.update` | write | `stripe.invoices.update(id, params)` | Update a draft invoice (limited edits on finalized invoices). |
| `invoices.list` | read | `stripe.invoices.list(params)` | List invoices, most recent first. |
| `invoices.delete` | delete | `stripe.invoices.del(id)` | Permanently delete a draft invoice. Finalized invoices must be voided instead. |
| `invoices.search` | read | `stripe.invoices.search(params)` | Search invoices using Stripe Search Query Language. |
| `invoices.finalizeInvoice` | write | `stripe.invoices.finalizeInvoice(id)` | Finalize a draft invoice for payment. |
| `invoices.pay` | write | `stripe.invoices.pay(id, params)` | Attempt payment on an invoice outside the normal collection schedule. |
| `invoices.sendInvoice` | write | `stripe.invoices.sendInvoice(id)` | Manually send an invoice email to the customer. |
| `invoices.voidInvoice` | write | `stripe.invoices.voidInvoice(id)` | Void a finalized invoice. Similar to deletion but maintains a paper trail. |
| `invoices.markUncollectible` | write | `stripe.invoices.markUncollectible(id)` | Mark an invoice as uncollectible (bad debt write-off). |
| `invoices.listLineItems` | read | `stripe.invoices.listLineItems(id, params)` | List line items on an invoice. |
| `invoices.updateLineItem` | write | `stripe.invoices.updateLineItem(invoiceId, lineItemId, params)` | Update a line item on a draft invoice. |
| `invoices.addLines` | write | `stripe.invoices.addLines(id, params)` | Add multiple line items to a draft invoice. |
| `invoices.removeLines` | write | `stripe.invoices.removeLines(id, params)` | Remove multiple line items from a draft invoice. |
| `invoices.updateLines` | write | `stripe.invoices.updateLines(id, params)` | Update multiple line items on a draft invoice. |
| `invoices.createPreview` | read | `stripe.invoices.createPreview(params)` | Preview an invoice without creating it. |

### Key Params — invoices.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `customer` | string | yes | Customer ID |
| `auto_advance` | boolean | no | Auto-finalize and attempt payment (default: true) |
| `collection_method` | string | no | `charge_automatically` (default) or `send_invoice` |
| `days_until_due` | number | no | Days until invoice is due (for `send_invoice`) |
| `description` | string | no | Invoice description |
| `due_date` | number | no | Unix timestamp for due date |
| `metadata` | object | no | Key-value metadata |
| `subscription` | string | no | Subscription ID to invoice |

**seeAlso**: `invoiceItems.create`, `subscriptions.create`, `creditNotes.create`

---

## InvoiceItems (5 methods)

Line items that can be added to draft invoices.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `invoiceItems.create` | write | `stripe.invoiceItems.create(params)` | Create an invoice item (added to draft or next invoice). Up to 250 per invoice. |
| `invoiceItems.retrieve` | read | `stripe.invoiceItems.retrieve(id)` | Retrieve an invoice item. |
| `invoiceItems.update` | write | `stripe.invoiceItems.update(id, params)` | Update amount or description (only before invoice is closed). |
| `invoiceItems.list` | read | `stripe.invoiceItems.list(params)` | List invoice items. |
| `invoiceItems.delete` | delete | `stripe.invoiceItems.del(id)` | Delete an invoice item (only when not attached to a finalized invoice). |

**seeAlso**: `invoices.create`, `invoices.listLineItems`

---

## InvoicePayments (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `invoicePayments.retrieve` | read | `stripe.invoicePayments.retrieve(id)` | Retrieve an invoice payment. |
| `invoicePayments.list` | read | `stripe.invoicePayments.list(params)` | List payments for an invoice. |

---

## InvoiceRenderingTemplates (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `invoiceRenderingTemplates.retrieve` | read | `stripe.invoiceRenderingTemplates.retrieve(id)` | Retrieve an invoice rendering template. |
| `invoiceRenderingTemplates.list` | read | `stripe.invoiceRenderingTemplates.list(params)` | List all templates, most recent first. |
| `invoiceRenderingTemplates.archive` | write | `stripe.invoiceRenderingTemplates.archive(id)` | Archive a template (no new objects can reference it). |
| `invoiceRenderingTemplates.unarchive` | write | `stripe.invoiceRenderingTemplates.unarchive(id)` | Unarchive a template for reuse. |

---

## CreditNotes (7 methods)

Adjust the amount of finalized invoices via credit notes.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `creditNotes.create` | write | `stripe.creditNotes.create(params)` | Issue a credit note to adjust a finalized invoice. Can trigger refunds, balance credits, or out-of-band credits. |
| `creditNotes.retrieve` | read | `stripe.creditNotes.retrieve(id)` | Retrieve a credit note. |
| `creditNotes.update` | write | `stripe.creditNotes.update(id, params)` | Update a credit note. |
| `creditNotes.list` | read | `stripe.creditNotes.list(params)` | List credit notes. |
| `creditNotes.voidCreditNote` | write | `stripe.creditNotes.voidCreditNote(id)` | Void a credit note. |
| `creditNotes.listLineItems` | read | `stripe.creditNotes.listLineItems(id, params)` | List line items on a credit note. |
| `creditNotes.preview` | read | `stripe.creditNotes.preview(params)` | Preview a credit note without creating it. |
| `creditNotes.listPreviewLineItems` | read | `stripe.creditNotes.listPreviewLineItems(params)` | List line items for a credit note preview. |

### Key Params — creditNotes.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `invoice` | string | yes | Invoice ID to credit |
| `amount` | number | no | Credit amount (or use lines) |
| `lines` | array | no | Line item credits |
| `reason` | string | no | `duplicate`, `fraudulent`, `order_change`, or `product_unsatisfactory` |
| `refund_amount` | number | no | Amount to refund |
| `credit_amount` | number | no | Amount to credit to customer balance |
| `out_of_band_amount` | number | no | Amount credited outside Stripe |
| `memo` | string | no | Memo visible on the credit note |

**seeAlso**: `invoices.voidInvoice`, `refunds.create`

---

## Subscriptions (9 methods)

Recurring billing on a schedule.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `subscriptions.create` | write | `stripe.subscriptions.create(params)` | Create a subscription for a customer. Up to 500 active/scheduled per customer. |
| `subscriptions.retrieve` | read | `stripe.subscriptions.retrieve(id)` | Retrieve a subscription. |
| `subscriptions.update` | write | `stripe.subscriptions.update(id, params)` | Update a subscription (price, quantity, billing cycle, etc.). |
| `subscriptions.list` | read | `stripe.subscriptions.list(params)` | List subscriptions (non-canceled by default; use `status=canceled` for canceled). |
| `subscriptions.cancel` | delete | `stripe.subscriptions.cancel(id, params)` | Cancel a subscription immediately. Customer will not be charged again. |
| `subscriptions.search` | read | `stripe.subscriptions.search(params)` | Search subscriptions using Stripe Search Query Language. |
| `subscriptions.resume` | write | `stripe.subscriptions.resume(id, params)` | Resume a paused subscription. |
| `subscriptions.deleteDiscount` | delete | `stripe.subscriptions.deleteDiscount(id)` | Remove the discount from a subscription. |
| `subscriptions.migrate` | write | `stripe.subscriptions.migrate(id, params)` | Upgrade the billing mode of a subscription. |

### Key Params — subscriptions.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `customer` | string | yes | Customer ID |
| `items` | array | yes | `[{ price: 'price_...', quantity? }]` |
| `default_payment_method` | string | no | Default payment method for the subscription |
| `cancel_at_period_end` | boolean | no | Cancel at end of current period |
| `trial_period_days` | number | no | Days of free trial |
| `trial_end` | number | no | Unix timestamp for trial end |
| `billing_cycle_anchor` | number | no | Unix timestamp to anchor billing cycle |
| `proration_behavior` | string | no | `create_prorations` (default), `none`, `always_invoice` |
| `coupon` | string | no | Coupon ID to apply |
| `metadata` | object | no | Key-value metadata |

**seeAlso**: `subscriptionItems.create`, `invoices.create`, `prices.create`

---

## SubscriptionItems (5 methods)

Individual items within a subscription (each maps to a price).

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `subscriptionItems.create` | write | `stripe.subscriptionItems.create(params)` | Add a new item to an existing subscription. |
| `subscriptionItems.retrieve` | read | `stripe.subscriptionItems.retrieve(id)` | Retrieve a subscription item. |
| `subscriptionItems.update` | write | `stripe.subscriptionItems.update(id, params)` | Update plan or quantity of a subscription item. |
| `subscriptionItems.list` | read | `stripe.subscriptionItems.list(params)` | List items for a subscription. |
| `subscriptionItems.delete` | delete | `stripe.subscriptionItems.del(id)` | Remove an item from a subscription (does not cancel the subscription). |

**seeAlso**: `subscriptions.create`, `prices.create`

---

## SubscriptionSchedules (6 methods)

Schedule subscription changes over time (e.g., price changes, trial-to-paid transitions).

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `subscriptionSchedules.create` | write | `stripe.subscriptionSchedules.create(params)` | Create a subscription schedule. Up to 500 per customer. |
| `subscriptionSchedules.retrieve` | read | `stripe.subscriptionSchedules.retrieve(id)` | Retrieve a schedule. |
| `subscriptionSchedules.update` | write | `stripe.subscriptionSchedules.update(id, params)` | Update a schedule. |
| `subscriptionSchedules.list` | read | `stripe.subscriptionSchedules.list(params)` | List schedules. |
| `subscriptionSchedules.cancel` | delete | `stripe.subscriptionSchedules.cancel(id)` | Cancel a schedule and its subscription immediately. Only when status is `not_started` or `active`. |
| `subscriptionSchedules.release` | write | `stripe.subscriptionSchedules.release(id)` | Release a schedule — stops phase scheduling but leaves existing subscription in place. |

**seeAlso**: `subscriptions.create`

---

## Quotes (9 methods)

Model prices and services for a customer. Can be converted to invoices or subscriptions.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `quotes.create` | write | `stripe.quotes.create(params)` | Create a quote for a customer. |
| `quotes.retrieve` | read | `stripe.quotes.retrieve(id)` | Retrieve a quote. |
| `quotes.update` | write | `stripe.quotes.update(id, params)` | Update a quote. |
| `quotes.list` | read | `stripe.quotes.list(params)` | List quotes. |
| `quotes.accept` | write | `stripe.quotes.accept(id)` | Accept a quote (creates invoice/subscription). |
| `quotes.cancel` | write | `stripe.quotes.cancel(id)` | Cancel a quote. |
| `quotes.finalizeQuote` | write | `stripe.quotes.finalizeQuote(id)` | Finalize a quote. |
| `quotes.listLineItems` | read | `stripe.quotes.listLineItems(id, params)` | List line items on a quote. |
| `quotes.listComputedUpfrontLineItems` | read | `stripe.quotes.listComputedUpfrontLineItems(id, params)` | List computed upfront line items. |

**seeAlso**: `invoices.create`, `subscriptions.create`

---

## billing.alerts (6 methods)

Billing alerts triggered by usage or spend thresholds.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billing.alerts.create` | write | `stripe.billing.alerts.create(params)` | Create a billing alert. |
| `billing.alerts.retrieve` | read | `stripe.billing.alerts.retrieve(id)` | Retrieve a billing alert. |
| `billing.alerts.list` | read | `stripe.billing.alerts.list(params)` | List billing alerts (active and inactive). |
| `billing.alerts.activate` | write | `stripe.billing.alerts.activate(id)` | Reactivate an alert. |
| `billing.alerts.deactivate` | write | `stripe.billing.alerts.deactivate(id)` | Deactivate an alert (stops triggering). |
| `billing.alerts.archive` | delete | `stripe.billing.alerts.archive(id)` | Archive an alert. Non-reversible. |

---

## billing.creditBalanceSummary (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billing.creditBalanceSummary.retrieve` | read | `stripe.billing.creditBalanceSummary.retrieve(params)` | Retrieve credit balance summary for a customer. |

---

## billing.creditBalanceTransactions (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billing.creditBalanceTransactions.retrieve` | read | `stripe.billing.creditBalanceTransactions.retrieve(id)` | Retrieve a credit balance transaction. |
| `billing.creditBalanceTransactions.list` | read | `stripe.billing.creditBalanceTransactions.list(params)` | List credit balance transactions. |

---

## billing.creditGrants (6 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billing.creditGrants.create` | write | `stripe.billing.creditGrants.create(params)` | Create a credit grant. |
| `billing.creditGrants.retrieve` | read | `stripe.billing.creditGrants.retrieve(id)` | Retrieve a credit grant. |
| `billing.creditGrants.update` | write | `stripe.billing.creditGrants.update(id, params)` | Update a credit grant. |
| `billing.creditGrants.list` | read | `stripe.billing.creditGrants.list(params)` | List credit grants. |
| `billing.creditGrants.expire` | write | `stripe.billing.creditGrants.expire(id)` | Expire a credit grant. |
| `billing.creditGrants.voidGrant` | delete | `stripe.billing.creditGrants.voidGrant(id)` | Void a credit grant. |

---

## billing.meters (7 methods)

Usage-based billing meters for metered subscriptions.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billing.meters.create` | write | `stripe.billing.meters.create(params)` | Create a billing meter. |
| `billing.meters.retrieve` | read | `stripe.billing.meters.retrieve(id)` | Retrieve a billing meter. |
| `billing.meters.update` | write | `stripe.billing.meters.update(id, params)` | Update a billing meter. |
| `billing.meters.list` | read | `stripe.billing.meters.list(params)` | List billing meters. |
| `billing.meters.deactivate` | write | `stripe.billing.meters.deactivate(id)` | Deactivate a meter (no more events accepted). |
| `billing.meters.reactivate` | write | `stripe.billing.meters.reactivate(id)` | Reactivate a deactivated meter. |
| `billing.meters.listEventSummaries` | read | `stripe.billing.meters.listEventSummaries(id, params)` | List meter event summaries. |

---

## billing.meterEvents (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billing.meterEvents.create` | write | `stripe.billing.meterEvents.create(params)` | Create a billing meter event (report usage). |

---

## billing.meterEventAdjustments (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billing.meterEventAdjustments.create` | write | `stripe.billing.meterEventAdjustments.create(params)` | Create a meter event adjustment (correct previously reported usage). |

---

## billingPortal.configurations (4 methods)

Configure the customer billing portal.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billingPortal.configurations.create` | write | `stripe.billingPortal.configurations.create(params)` | Create a portal configuration. |
| `billingPortal.configurations.retrieve` | read | `stripe.billingPortal.configurations.retrieve(id)` | Retrieve a portal configuration. |
| `billingPortal.configurations.update` | write | `stripe.billingPortal.configurations.update(id, params)` | Update a portal configuration. |
| `billingPortal.configurations.list` | read | `stripe.billingPortal.configurations.list(params)` | List portal configurations. |

---

## billingPortal.sessions (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `billingPortal.sessions.create` | write | `stripe.billingPortal.sessions.create(params)` | Create a customer portal session. Returns a URL to redirect the customer. |

### Key Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `customer` | string | yes | Customer ID |
| `return_url` | string | no | URL to redirect after portal session |
| `configuration` | string | no | Portal configuration ID |

---

**Total: 81 methods**
