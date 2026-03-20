# Cloudflare Methods — Platform

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers Accounts, User, Registrar, Email Routing, Logpush, Alerting, Cache, Audit Logs, Healthchecks, and other platform resources.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Accounts (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/accounts/accounts.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `accounts.create` | write | `client.accounts.create({ ...params })` |
| `accounts.update` | write | `client.accounts.update({ account_id, ...params })` |
| `accounts.list` | read | `client.accounts.list()` |
| `accounts.delete` | delete | `client.accounts.delete({ account_id })` |
| `accounts.get` | read | `client.accounts.get({ account_id })` |

---

## Account Members (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/accounts/members.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `accounts.members.create` | write | `client.accounts.members.create({ account_id, ...params })` |
| `accounts.members.update` | write | `client.accounts.members.update({ account_id, member_id, ...params })` |
| `accounts.members.list` | read | `client.accounts.members.list({ account_id })` |
| `accounts.members.delete` | delete | `client.accounts.members.delete({ account_id, member_id })` |
| `accounts.members.get` | read | `client.accounts.members.get({ account_id, member_id })` |

### Key Params — accounts.members.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `email` | string | yes | Email address to invite |
| `roles` | array | yes | Array of role IDs (get from `accounts.roles.list`) |
| `status` | string | no | `accepted` (skip invite, SSO-managed) or `pending` (default) |

---

## Account Roles (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/accounts/roles.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `accounts.roles.list` | read | `client.accounts.roles.list({ account_id })` |
| `accounts.roles.get` | read | `client.accounts.roles.get({ account_id, role_id })` |

---

## Account Subscriptions (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/accounts/subscriptions.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `accounts.subscriptions.create` | write | `client.accounts.subscriptions.create({ account_id, ...params })` |
| `accounts.subscriptions.update` | write | `client.accounts.subscriptions.update({ account_id, subscription_identifier, ...params })` |
| `accounts.subscriptions.delete` | delete | `client.accounts.subscriptions.delete({ account_id, subscription_identifier })` |
| `accounts.subscriptions.get` | read | `client.accounts.subscriptions.get({ account_id })` |

---

## Account Tokens (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/accounts/tokens/tokens.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `accounts.tokens.create` | write | `client.accounts.tokens.create({ account_id, ...params })` |
| `accounts.tokens.update` | write | `client.accounts.tokens.update({ account_id, token_id, ...params })` |
| `accounts.tokens.list` | read | `client.accounts.tokens.list({ account_id })` |
| `accounts.tokens.delete` | delete | `client.accounts.tokens.delete({ account_id, token_id })` |
| `accounts.tokens.get` | read | `client.accounts.tokens.get({ account_id, token_id })` |
| `accounts.tokens.verify` | read | `client.accounts.tokens.verify({ account_id, token_id })` |

---

## User (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/user/user.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `user.edit` | write | `client.user.edit({ ...params })` |
| `user.get` | read | `client.user.get()` |

---

## User Tokens (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/user/tokens/tokens.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `user.tokens.create` | write | `client.user.tokens.create({ ...params })` |
| `user.tokens.update` | write | `client.user.tokens.update({ token_id, ...params })` |
| `user.tokens.list` | read | `client.user.tokens.list()` |
| `user.tokens.delete` | delete | `client.user.tokens.delete({ token_id })` |
| `user.tokens.verify` | read | `client.user.tokens.verify()` |

---

## User Invites (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/user/invites.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `user.invites.list` | read | `client.user.invites.list()` |
| `user.invites.edit` | write | `client.user.invites.edit({ invite_id, ...params })` |

---

## User Organizations (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/user/organizations.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `user.organizations.list` | read | `client.user.organizations.list()` |
| `user.organizations.delete` | delete | `client.user.organizations.delete({ organization_id })` |
| `user.organizations.get` | read | `client.user.organizations.get({ organization_id })` |

---

## Memberships (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/memberships.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `memberships.update` | write | `client.memberships.update({ membership_id, ...params })` |
| `memberships.list` | read | `client.memberships.list()` |
| `memberships.delete` | delete | `client.memberships.delete({ membership_id })` |
| `memberships.get` | read | `client.memberships.get({ membership_id })` |

---

## Audit Logs (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/audit-logs.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `auditLogs.list` | read | `client.auditLogs.list({ account_id, ...params })` |

### Key Params — auditLogs.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `since` | string | no | Start date (ISO 8601) |
| `before` | string | no | End date (ISO 8601) |
| `actor.email` | string | no | Filter by actor email |
| `actor.ip` | string | no | Filter by actor IP |
| `action.type` | string | no | Filter by action type |
| `zone.name` | string | no | Filter by zone name |
| `direction` | string | no | `desc` or `asc` |
| `per_page` | number | no | Results per page (default 100) |
| `page` | number | no | Page number |

---

## Registrar Domains (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/registrar/domains.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `registrar.domains.update` | write | `client.registrar.domains.update({ account_id, domain_name, ...params })` |
| `registrar.domains.list` | read | `client.registrar.domains.list({ account_id })` |
| `registrar.domains.get` | read | `client.registrar.domains.get({ account_id, domain_name })` |

---

## Email Routing (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/email-routing/email-routing.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `emailRouting.get` | read | `client.emailRouting.get({ zone_id })` |
| `emailRouting.enable` | write | `client.emailRouting.enable({ zone_id })` |
| `emailRouting.disable` | write | `client.emailRouting.disable({ zone_id })` |

---

## Email Routing Rules (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/email-routing/rules/rules.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `emailRouting.rules.create` | write | `client.emailRouting.rules.create({ zone_id, ...params })` |
| `emailRouting.rules.update` | write | `client.emailRouting.rules.update({ zone_id, rule_identifier, ...params })` |
| `emailRouting.rules.list` | read | `client.emailRouting.rules.list({ zone_id })` |
| `emailRouting.rules.delete` | delete | `client.emailRouting.rules.delete({ zone_id, rule_identifier })` |
| `emailRouting.rules.get` | read | `client.emailRouting.rules.get({ zone_id, rule_identifier })` |

### Key Params — emailRouting.rules.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `name` | string | no | Rule name |
| `matchers` | array | yes | `[{ type: 'literal', field: 'to', value: 'info@example.com' }]` |
| `actions` | array | yes | `[{ type: 'forward', value: ['user@gmail.com'] }]` or `[{ type: 'worker', value: ['my-worker'] }]` |
| `enabled` | boolean | no | Whether the rule is enabled (default true) |
| `priority` | number | no | Rule priority (lower = higher priority) |

---

## Email Routing Addresses (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/email-routing/addresses.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `emailRouting.addresses.create` | write | `client.emailRouting.addresses.create({ account_id, ...params })` |
| `emailRouting.addresses.list` | read | `client.emailRouting.addresses.list({ account_id })` |
| `emailRouting.addresses.delete` | delete | `client.emailRouting.addresses.delete({ account_id, destination_address_identifier })` |
| `emailRouting.addresses.get` | read | `client.emailRouting.addresses.get({ account_id, destination_address_identifier })` |

---

## Email Routing DNS (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/email-routing/dns.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `emailRouting.dns.create` | write | `client.emailRouting.dns.create({ zone_id, ...params })` |
| `emailRouting.dns.delete` | delete | `client.emailRouting.dns.delete({ zone_id, ...params })` |
| `emailRouting.dns.edit` | write | `client.emailRouting.dns.edit({ zone_id, ...params })` |
| `emailRouting.dns.get` | read | `client.emailRouting.dns.get({ zone_id })` |

---

## Logpush Jobs (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/logpush/jobs.d.ts`

Push logs to storage destinations (R2, S3, GCS, Azure, Datadog, Splunk, etc.).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `logpush.jobs.create` | write | `client.logpush.jobs.create({ account_id or zone_id, ...params })` |
| `logpush.jobs.update` | write | `client.logpush.jobs.update({ account_id or zone_id, job_id, ...params })` |
| `logpush.jobs.list` | read | `client.logpush.jobs.list({ account_id or zone_id })` |
| `logpush.jobs.delete` | delete | `client.logpush.jobs.delete({ account_id or zone_id, job_id })` |
| `logpush.jobs.get` | read | `client.logpush.jobs.get({ account_id or zone_id, job_id })` |

### Key Params — logpush.jobs.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` or `zone_id` | string | yes | Scope |
| `destination_conf` | string | yes | Destination URI (e.g., `r2://bucket/path`, `s3://bucket?region=us-east-1`) |
| `dataset` | string | yes | Log dataset: `http_requests`, `firewall_events`, `dns_logs`, `nel_reports`, `spectrum_events`, `workers_trace_events`, etc. |
| `enabled` | boolean | no | Whether the job is active |
| `frequency` | string | no | `high` (every 30s) or `low` (every 5min, default) |
| `logpull_options` | string | no | Filter options (fields, timestamps, sample) |
| `ownership_challenge` | string | no | Ownership verification token |

---

## Logpush Ownership (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/logpush/ownership.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `logpush.ownership.create` | write | `client.logpush.ownership.create({ account_id or zone_id, ...params })` |
| `logpush.ownership.validate` | write | `client.logpush.ownership.validate({ account_id or zone_id, ...params })` |

---

## Alerting Policies (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/alerting/policies.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `alerting.policies.create` | write | `client.alerting.policies.create({ account_id, ...params })` |
| `alerting.policies.update` | write | `client.alerting.policies.update({ account_id, policy_id, ...params })` |
| `alerting.policies.list` | read | `client.alerting.policies.list({ account_id })` |
| `alerting.policies.delete` | delete | `client.alerting.policies.delete({ account_id, policy_id })` |
| `alerting.policies.get` | read | `client.alerting.policies.get({ account_id, policy_id })` |

### Key Params — alerting.policies.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Policy name |
| `alert_type` | string | yes | Alert type: `dos_attack_l4`, `dos_attack_l7`, `health_check_status_notification`, etc. |
| `enabled` | boolean | yes | Whether the policy is active |
| `mechanisms` | object | yes | `{ email: [{ id: 'user@example.com' }], webhooks: [{ id: 'webhook_id' }] }` |
| `filters` | object | no | Alert filters (zones, services, etc.) |

---

## Alerting Destinations (Webhooks) (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/alerting/destinations/webhooks.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `alerting.destinations.webhooks.create` | write | `client.alerting.destinations.webhooks.create({ account_id, ...params })` |
| `alerting.destinations.webhooks.update` | write | `client.alerting.destinations.webhooks.update({ account_id, webhook_id, ...params })` |
| `alerting.destinations.webhooks.list` | read | `client.alerting.destinations.webhooks.list({ account_id })` |
| `alerting.destinations.webhooks.delete` | delete | `client.alerting.destinations.webhooks.delete({ account_id, webhook_id })` |

---

## Alerting History (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/alerting/history.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `alerting.history.list` | read | `client.alerting.history.list({ account_id })` |

---

## Cache (10 methods)

**JSDoc source**: `node_modules/cloudflare/resources/cache/variants.d.ts`, `node_modules/cloudflare/resources/cache/smart-tiered-cache.d.ts`, `node_modules/cloudflare/resources/cache/regional-tiered-cache.d.ts`, `node_modules/cloudflare/resources/cache/cache-reserve.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `cache.variants.update` | write | `client.cache.variants.update({ zone_id, ...params })` |
| `cache.variants.delete` | delete | `client.cache.variants.delete({ zone_id })` |
| `cache.variants.get` | read | `client.cache.variants.get({ zone_id })` |
| `cache.smartTieredCache.update` | write | `client.cache.smartTieredCache.update({ zone_id, ...params })` |
| `cache.smartTieredCache.delete` | delete | `client.cache.smartTieredCache.delete({ zone_id })` |
| `cache.smartTieredCache.get` | read | `client.cache.smartTieredCache.get({ zone_id })` |
| `cache.regionalTieredCache.update` | write | `client.cache.regionalTieredCache.update({ zone_id, ...params })` |
| `cache.regionalTieredCache.get` | read | `client.cache.regionalTieredCache.get({ zone_id })` |
| `cache.cacheReserve.update` | write | `client.cache.cacheReserve.update({ zone_id, ...params })` |
| `cache.cacheReserve.get` | read | `client.cache.cacheReserve.get({ zone_id })` |

---

## Healthchecks (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/healthchecks/healthchecks.d.ts`

Stand-alone health checks (not tied to load balancers).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `healthchecks.create` | write | `client.healthchecks.create({ zone_id, ...params })` |
| `healthchecks.update` | write | `client.healthchecks.update({ zone_id, healthcheck_id, ...params })` |
| `healthchecks.list` | read | `client.healthchecks.list({ zone_id })` |
| `healthchecks.delete` | delete | `client.healthchecks.delete({ zone_id, healthcheck_id })` |
| `healthchecks.edit` | write | `client.healthchecks.edit({ zone_id, healthcheck_id, ...params })` |
| `healthchecks.get` | read | `client.healthchecks.get({ zone_id, healthcheck_id })` |

### Key Params — healthchecks.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `name` | string | yes | Health check name |
| `address` | string | yes | Hostname or IP to check |
| `type` | string | no | `HTTP`, `HTTPS`, `TCP` (default `HTTP`) |
| `port` | number | no | Port to check |
| `method` | string | no | HTTP method (default `GET`) |
| `path` | string | no | URL path (default `/`) |
| `expected_codes` | array | no | Expected HTTP status codes (e.g., `['2xx', '302']`) |
| `expected_body` | string | no | Expected response body substring |
| `interval` | number | no | Check interval in seconds (default 60) |
| `retries` | number | no | Retries before unhealthy (default 2) |
| `timeout` | number | no | Timeout in seconds (default 5) |

---

## Healthcheck Previews (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/healthchecks/previews.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `healthchecks.previews.create` | write | `client.healthchecks.previews.create({ zone_id, ...params })` |
| `healthchecks.previews.delete` | delete | `client.healthchecks.previews.delete({ zone_id, healthcheck_id })` |
| `healthchecks.previews.get` | read | `client.healthchecks.previews.get({ zone_id, healthcheck_id })` |

---

## Custom Pages (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/custom-pages.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `customPages.update` | write | `client.customPages.update({ zone_id or account_id, identifier, ...params })` |
| `customPages.list` | read | `client.customPages.list({ zone_id or account_id })` |
| `customPages.get` | read | `client.customPages.get({ zone_id or account_id, identifier })` |

---

## Secrets Store (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/secrets-store/stores/stores.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `secretsStore.stores.create` | write | `client.secretsStore.stores.create({ account_id, ...params })` |
| `secretsStore.stores.list` | read | `client.secretsStore.stores.list({ account_id })` |
| `secretsStore.stores.delete` | delete | `client.secretsStore.stores.delete({ account_id, store_id })` |

---

## Origin Post-Quantum Encryption (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/origin-post-quantum-encryption.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `originPostQuantumEncryption.update` | write | `client.originPostQuantumEncryption.update({ zone_id, ...params })` |
| `originPostQuantumEncryption.get` | read | `client.originPostQuantumEncryption.get({ zone_id })` |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Accounts | 5 | Account CRUD |
| Account Members | 5 | Member management |
| Account Roles | 2 | Role reference |
| Account Subscriptions | 4 | Billing subscriptions |
| Account Tokens | 6 | API token management |
| User | 2 | User profile |
| User Tokens | 5 | User API tokens |
| User Invites | 2 | Invitation management |
| User Organizations | 3 | Org membership |
| Memberships | 4 | Account memberships |
| Audit Logs | 1 | Activity logging |
| Registrar Domains | 3 | Domain registration |
| Email Routing | 3 | Enable/disable/get |
| Email Routing Rules | 5 | Routing rules |
| Email Routing Addresses | 4 | Destination addresses |
| Email Routing DNS | 4 | DNS records for routing |
| Logpush Jobs | 5 | Log export to storage |
| Logpush Ownership | 2 | Destination validation |
| Alerting Policies | 5 | Alert rules |
| Alerting Destinations | 4 | Webhook destinations |
| Alerting History | 1 | Alert history |
| Cache | 10 | Cache variants, tiered cache, reserve |
| Healthchecks | 6 | Standalone health checks |
| Healthcheck Previews | 3 | Preview health check runs |
| Custom Pages | 3 | Custom error pages |
| Secrets Store | 3 | Account secrets |
| Origin PQ Encryption | 2 | Post-quantum encryption |
| **Total** | **~107** | |
