# Stripe Methods — Other

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers Terminal, Identity, Financial Connections, Tax, Radar, Reporting, Sigma, and miscellaneous resources.

---

## Terminal

Point-of-sale hardware integration.

### terminal.configurations (5 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `terminal.configurations.create` | write | `stripe.terminal.configurations.create(params)` | Create a terminal configuration. |
| `terminal.configurations.retrieve` | read | `stripe.terminal.configurations.retrieve(id)` | Retrieve a configuration. |
| `terminal.configurations.update` | write | `stripe.terminal.configurations.update(id, params)` | Update a configuration. |
| `terminal.configurations.list` | read | `stripe.terminal.configurations.list(params)` | List configurations. |
| `terminal.configurations.delete` | delete | `stripe.terminal.configurations.del(id)` | Delete a configuration. |

### terminal.connectionTokens (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `terminal.connectionTokens.create` | write | `stripe.terminal.connectionTokens.create(params)` | Create a short-lived connection token for Terminal SDK. |

### terminal.locations (5 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `terminal.locations.create` | write | `stripe.terminal.locations.create(params)` | Create a location. |
| `terminal.locations.retrieve` | read | `stripe.terminal.locations.retrieve(id)` | Retrieve a location. |
| `terminal.locations.update` | write | `stripe.terminal.locations.update(id, params)` | Update a location. |
| `terminal.locations.list` | read | `stripe.terminal.locations.list(params)` | List locations. |
| `terminal.locations.delete` | delete | `stripe.terminal.locations.del(id)` | Delete a location. |

### terminal.readers (12 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `terminal.readers.create` | write | `stripe.terminal.readers.create(params)` | Register a new reader. |
| `terminal.readers.retrieve` | read | `stripe.terminal.readers.retrieve(id)` | Retrieve a reader. |
| `terminal.readers.update` | write | `stripe.terminal.readers.update(id, params)` | Update a reader (label, etc.). |
| `terminal.readers.list` | read | `stripe.terminal.readers.list(params)` | List readers. |
| `terminal.readers.delete` | delete | `stripe.terminal.readers.del(id)` | Delete a reader. |
| `terminal.readers.cancelAction` | write | `stripe.terminal.readers.cancelAction(id)` | Cancel the current reader action. |
| `terminal.readers.collectInputs` | write | `stripe.terminal.readers.collectInputs(id, params)` | Display input forms on a reader to collect customer information. |
| `terminal.readers.collectPaymentMethod` | write | `stripe.terminal.readers.collectPaymentMethod(id, params)` | Initiate payment method collection on a reader. |
| `terminal.readers.confirmPaymentIntent` | write | `stripe.terminal.readers.confirmPaymentIntent(id, params)` | Finalize a payment on a reader. |
| `terminal.readers.processPaymentIntent` | write | `stripe.terminal.readers.processPaymentIntent(id, params)` | Initiate payment flow on a reader. |
| `terminal.readers.processSetupIntent` | write | `stripe.terminal.readers.processSetupIntent(id, params)` | Initiate SetupIntent flow on a reader. |
| `terminal.readers.refundPayment` | write | `stripe.terminal.readers.refundPayment(id, params)` | Initiate an in-person refund on a reader. |

### terminal.onboardingLinks (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `terminal.onboardingLinks.create` | write | `stripe.terminal.onboardingLinks.create(params)` | Create a terminal onboarding link. |

---

## Identity

Identity verification for KYC/compliance.

### identity.verificationSessions (6 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `identity.verificationSessions.create` | write | `stripe.identity.verificationSessions.create(params)` | Create a verification session. Display modal using client_secret or redirect to URL. |
| `identity.verificationSessions.retrieve` | read | `stripe.identity.verificationSessions.retrieve(id)` | Retrieve a verification session. |
| `identity.verificationSessions.update` | write | `stripe.identity.verificationSessions.update(id, params)` | Update verification check and options (when status is `requires_input`). |
| `identity.verificationSessions.list` | read | `stripe.identity.verificationSessions.list(params)` | List verification sessions. |
| `identity.verificationSessions.cancel` | write | `stripe.identity.verificationSessions.cancel(id)` | Cancel a verification session (only when `requires_input`). Cannot be undone. |
| `identity.verificationSessions.redact` | delete | `stripe.identity.verificationSessions.redact(id)` | Redact all collected information from a session and related objects. |

### identity.verificationReports (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `identity.verificationReports.retrieve` | read | `stripe.identity.verificationReports.retrieve(id)` | Retrieve a verification report. |
| `identity.verificationReports.list` | read | `stripe.identity.verificationReports.list(params)` | List verification reports. |

---

## Financial Connections

Connect to customer bank accounts for data access.

### financialConnections.accounts (7 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `financialConnections.accounts.retrieve` | read | `stripe.financialConnections.accounts.retrieve(id)` | Retrieve a Financial Connections account. |
| `financialConnections.accounts.list` | read | `stripe.financialConnections.accounts.list(params)` | List Financial Connections accounts. |
| `financialConnections.accounts.disconnect` | write | `stripe.financialConnections.accounts.disconnect(id)` | Disconnect — disables access to account data. |
| `financialConnections.accounts.listOwners` | read | `stripe.financialConnections.accounts.listOwners(id, params)` | List account owners. |
| `financialConnections.accounts.refresh` | write | `stripe.financialConnections.accounts.refresh(id, params)` | Refresh account data (balances, transactions). |
| `financialConnections.accounts.subscribe` | write | `stripe.financialConnections.accounts.subscribe(id, params)` | Subscribe to periodic data refreshes. |
| `financialConnections.accounts.unsubscribe` | write | `stripe.financialConnections.accounts.unsubscribe(id, params)` | Unsubscribe from periodic refreshes. |

### financialConnections.sessions (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `financialConnections.sessions.create` | write | `stripe.financialConnections.sessions.create(params)` | Create a session to launch the Financial Connections auth flow. |
| `financialConnections.sessions.retrieve` | read | `stripe.financialConnections.sessions.retrieve(id)` | Retrieve a session. |

### financialConnections.transactions (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `financialConnections.transactions.retrieve` | read | `stripe.financialConnections.transactions.retrieve(id)` | Retrieve a transaction. |
| `financialConnections.transactions.list` | read | `stripe.financialConnections.transactions.list(params)` | List transactions. |

---

## Tax

Automated tax calculation and registration.

### tax.calculations (3 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `tax.calculations.create` | write | `stripe.tax.calculations.create(params)` | Calculate tax for a transaction. |
| `tax.calculations.retrieve` | read | `stripe.tax.calculations.retrieve(id)` | Retrieve a tax calculation (if not expired). |
| `tax.calculations.listLineItems` | read | `stripe.tax.calculations.listLineItems(id, params)` | List line items of a tax calculation. |

### tax.registrations (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `tax.registrations.create` | write | `stripe.tax.registrations.create(params)` | Create a tax registration. |
| `tax.registrations.retrieve` | read | `stripe.tax.registrations.retrieve(id)` | Retrieve a tax registration. |
| `tax.registrations.update` | write | `stripe.tax.registrations.update(id, params)` | Update a registration (set `expires_at` to end it). Cannot be deleted. |
| `tax.registrations.list` | read | `stripe.tax.registrations.list(params)` | List tax registrations. |

### tax.settings (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `tax.settings.retrieve` | read | `stripe.tax.settings.retrieve()` | Retrieve tax settings. |
| `tax.settings.update` | write | `stripe.tax.settings.update(params)` | Update tax settings. Parameters cannot be removed once set. |

### tax.transactions (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `tax.transactions.retrieve` | read | `stripe.tax.transactions.retrieve(id)` | Retrieve a tax transaction. |
| `tax.transactions.createFromCalculation` | write | `stripe.tax.transactions.createFromCalculation(params)` | Create a transaction from a calculation (within 90 days). |
| `tax.transactions.createReversal` | write | `stripe.tax.transactions.createReversal(params)` | Partially or fully reverse a transaction. |
| `tax.transactions.listLineItems` | read | `stripe.tax.transactions.listLineItems(id, params)` | List line items of a transaction. |

---

## Radar

Fraud prevention and management.

### radar.earlyFraudWarnings (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `radar.earlyFraudWarnings.retrieve` | read | `stripe.radar.earlyFraudWarnings.retrieve(id)` | Retrieve an early fraud warning. |
| `radar.earlyFraudWarnings.list` | read | `stripe.radar.earlyFraudWarnings.list(params)` | List early fraud warnings. |

### radar.valueLists (5 methods)

Custom lists used in Radar rules (e.g., block lists, allow lists).

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `radar.valueLists.create` | write | `stripe.radar.valueLists.create(params)` | Create a value list for use in Radar rules. |
| `radar.valueLists.retrieve` | read | `stripe.radar.valueLists.retrieve(id)` | Retrieve a value list. |
| `radar.valueLists.update` | write | `stripe.radar.valueLists.update(id, params)` | Update a value list (name, alias, metadata). |
| `radar.valueLists.list` | read | `stripe.radar.valueLists.list(params)` | List value lists. |
| `radar.valueLists.delete` | delete | `stripe.radar.valueLists.del(id)` | Delete a value list (must not be referenced in rules). |

### radar.valueListItems (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `radar.valueListItems.create` | write | `stripe.radar.valueListItems.create(params)` | Add an item to a value list. |
| `radar.valueListItems.retrieve` | read | `stripe.radar.valueListItems.retrieve(id)` | Retrieve a value list item. |
| `radar.valueListItems.list` | read | `stripe.radar.valueListItems.list(params)` | List items in a value list. |
| `radar.valueListItems.delete` | delete | `stripe.radar.valueListItems.del(id)` | Remove an item from a value list. |

---

## Reporting

Custom financial reports.

### reporting.reportRuns (3 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `reporting.reportRuns.create` | write | `stripe.reporting.reportRuns.create(params)` | Create and run a report (some types require live-mode key). |
| `reporting.reportRuns.retrieve` | read | `stripe.reporting.reportRuns.retrieve(id)` | Retrieve a report run. |
| `reporting.reportRuns.list` | read | `stripe.reporting.reportRuns.list(params)` | List report runs, most recent first. |

### reporting.reportTypes (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `reporting.reportTypes.retrieve` | read | `stripe.reporting.reportTypes.retrieve(id)` | Retrieve a report type. |
| `reporting.reportTypes.list` | read | `stripe.reporting.reportTypes.list(params)` | List all available report types. |

---

## Sigma

SQL-based custom reports via Stripe Sigma.

### sigma.scheduledQueryRuns (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `sigma.scheduledQueryRuns.retrieve` | read | `stripe.sigma.scheduledQueryRuns.retrieve(id)` | Retrieve a scheduled query run. |
| `sigma.scheduledQueryRuns.list` | read | `stripe.sigma.scheduledQueryRuns.list(params)` | List scheduled query runs. |

---

## Events (2 methods)

Webhook event objects.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `events.retrieve` | read | `stripe.events.retrieve(id)` | Retrieve an event (available for 30 days). |
| `events.list` | read | `stripe.events.list(params)` | List events, going back up to 30 days. |

### Key Params — events.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | no | Filter by event type (e.g., `payment_intent.succeeded`) |
| `types` | array | no | Filter by multiple event types |
| `created` | object | no | Filter by creation date: `{ gte, lte, gt, lt }` (unix timestamps) |
| `delivery_success` | boolean | no | Filter by delivery status |

---

## Files (3 methods)

Upload and manage files (evidence, logos, identity documents).

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `files.create` | write | `stripe.files.create(params)` | Upload a file (multipart/form-data). |
| `files.retrieve` | read | `stripe.files.retrieve(id)` | Retrieve a file. |
| `files.list` | read | `stripe.files.list(params)` | List files. |

### Key Params — files.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | stream | yes | File data |
| `purpose` | string | yes | `dispute_evidence`, `identity_document`, `account_requirement`, `business_logo`, etc. |
| `file_link_data` | object | no | `{ create: true }` to auto-create a file link |

---

## FileLinks (4 methods)

Shareable links to uploaded files.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `fileLinks.create` | write | `stripe.fileLinks.create(params)` | Create a file link. |
| `fileLinks.retrieve` | read | `stripe.fileLinks.retrieve(id)` | Retrieve a file link. |
| `fileLinks.update` | write | `stripe.fileLinks.update(id, params)` | Update a file link (expired links cannot be updated). |
| `fileLinks.list` | read | `stripe.fileLinks.list(params)` | List file links. |

---

## WebhookEndpoints (5 methods)

Manage webhook subscriptions.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `webhookEndpoints.create` | write | `stripe.webhookEndpoints.create(params)` | Create a webhook endpoint. |
| `webhookEndpoints.retrieve` | read | `stripe.webhookEndpoints.retrieve(id)` | Retrieve a webhook endpoint. |
| `webhookEndpoints.update` | write | `stripe.webhookEndpoints.update(id, params)` | Update a webhook endpoint. |
| `webhookEndpoints.list` | read | `stripe.webhookEndpoints.list(params)` | List webhook endpoints. |
| `webhookEndpoints.delete` | delete | `stripe.webhookEndpoints.del(id)` | Delete a webhook endpoint. |

### Key Params — webhookEndpoints.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | Webhook destination URL |
| `enabled_events` | array | yes | Events to subscribe to (e.g., `['payment_intent.succeeded', 'invoice.paid']`) or `['*']` for all |
| `description` | string | no | Description |
| `metadata` | object | no | Key-value metadata |

---

## Reviews (3 methods)

Radar review objects for flagged payments.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `reviews.retrieve` | read | `stripe.reviews.retrieve(id)` | Retrieve a review. |
| `reviews.list` | read | `stripe.reviews.list(params)` | List open reviews. |
| `reviews.approve` | write | `stripe.reviews.approve(id)` | Approve a review, closing it and removing from the list. |

---

## ApplePayDomains (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `applePayDomains.create` | write | `stripe.applePayDomains.create(params)` | Register a domain for Apple Pay. |
| `applePayDomains.retrieve` | read | `stripe.applePayDomains.retrieve(id)` | Retrieve a domain. |
| `applePayDomains.list` | read | `stripe.applePayDomains.list(params)` | List registered domains. |
| `applePayDomains.delete` | delete | `stripe.applePayDomains.del(id)` | Delete a domain. |

---

## EphemeralKeys (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `ephemeralKeys.create` | write | `stripe.ephemeralKeys.create(params)` | Create a short-lived API key for a resource. |
| `ephemeralKeys.delete` | delete | `stripe.ephemeralKeys.del(id)` | Invalidate a short-lived API key. |

---

## CustomerSessions (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `customerSessions.create` | write | `stripe.customerSessions.create(params)` | Create a customer session with a single-use client secret for frontend access. |

---

## apps.secrets (4 methods)

Secret storage for Stripe Apps.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `apps.secrets.create` | write | `stripe.apps.secrets.create(params)` | Create or replace a secret in the secret store. |
| `apps.secrets.find` | read | `stripe.apps.secrets.find(params)` | Find a secret by name and scope. |
| `apps.secrets.list` | read | `stripe.apps.secrets.list(params)` | List secrets for a given scope. |
| `apps.secrets.deleteWhere` | delete | `stripe.apps.secrets.deleteWhere(params)` | Delete a secret by name and scope. |

---

## entitlements.activeEntitlements (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `entitlements.activeEntitlements.retrieve` | read | `stripe.entitlements.activeEntitlements.retrieve(id)` | Retrieve an active entitlement. |
| `entitlements.activeEntitlements.list` | read | `stripe.entitlements.activeEntitlements.list(params)` | List active entitlements for a customer. |

---

## entitlements.features (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `entitlements.features.create` | write | `stripe.entitlements.features.create(params)` | Create a feature. |
| `entitlements.features.retrieve` | read | `stripe.entitlements.features.retrieve(id)` | Retrieve a feature. |
| `entitlements.features.update` | write | `stripe.entitlements.features.update(id, params)` | Update or deactivate a feature. |
| `entitlements.features.list` | read | `stripe.entitlements.features.list(params)` | List features. |

---

## forwarding.requests (3 methods)

Forward API requests through Stripe to third-party endpoints.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `forwarding.requests.create` | write | `stripe.forwarding.requests.create(params)` | Create a forwarding request. |
| `forwarding.requests.retrieve` | read | `stripe.forwarding.requests.retrieve(id)` | Retrieve a forwarding request. |
| `forwarding.requests.list` | read | `stripe.forwarding.requests.list(params)` | List forwarding requests. |

---

## PaymentAttemptRecords (2 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `paymentAttemptRecords.retrieve` | read | `stripe.paymentAttemptRecords.retrieve(id)` | Retrieve a payment attempt record. |
| `paymentAttemptRecords.list` | read | `stripe.paymentAttemptRecords.list(params)` | List payment attempt records for a payment record. |

---

## PaymentRecords (1 method)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `paymentRecords.retrieve` | read | `stripe.paymentRecords.retrieve(id)` | Retrieve a payment record. |

---

**Total: 97 methods**
