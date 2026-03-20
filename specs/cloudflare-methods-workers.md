# Cloudflare Methods — Workers & Serverless

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers Workers, KV, D1, Queues, Durable Objects, Workflows, Hyperdrive, and Pipelines.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Workers Scripts (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/scripts.d.ts`

Workers are serverless functions running at the edge.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.update` | write | `client.workers.scripts.update({ account_id, script_name, ...params })` |
| `workers.scripts.list` | read | `client.workers.scripts.list({ account_id })` |
| `workers.scripts.delete` | delete | `client.workers.scripts.delete({ account_id, script_name })` |
| `workers.scripts.get` | read | `client.workers.scripts.get({ account_id, script_name })` |
| `workers.scripts.search` | read | `client.workers.scripts.search({ account_id, ...params })` |

### Key Params — workers.scripts.update

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `script_name` | string | yes | Name of the worker script |
| `metadata` | object | no | Script metadata (bindings, compatibility_date, compatibility_flags, etc.) |

---

## Worker Script Settings (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/settings.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.settings.get` | read | `client.workers.scripts.settings.get({ account_id, script_name })` |
| `workers.scripts.settings.edit` | write | `client.workers.scripts.settings.edit({ account_id, script_name, ...params })` |

---

## Worker Script Secrets (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/secrets.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.secrets.update` | write | `client.workers.scripts.secrets.update({ account_id, script_name, ...params })` |
| `workers.scripts.secrets.list` | read | `client.workers.scripts.secrets.list({ account_id, script_name })` |
| `workers.scripts.secrets.delete` | delete | `client.workers.scripts.secrets.delete({ account_id, script_name, secret_name })` |
| `workers.scripts.secrets.get` | read | `client.workers.scripts.secrets.get({ account_id, script_name, secret_name })` |

---

## Worker Script Deployments (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/deployments.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.deployments.create` | write | `client.workers.scripts.deployments.create({ account_id, script_name, ...params })` |
| `workers.scripts.deployments.list` | read | `client.workers.scripts.deployments.list({ account_id, script_name })` |
| `workers.scripts.deployments.delete` | delete | `client.workers.scripts.deployments.delete({ account_id, script_name, deployment_id })` |
| `workers.scripts.deployments.get` | read | `client.workers.scripts.deployments.get({ account_id, script_name, deployment_id })` |

---

## Worker Script Versions (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/versions.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.versions.create` | write | `client.workers.scripts.versions.create({ account_id, script_name, ...params })` |
| `workers.scripts.versions.list` | read | `client.workers.scripts.versions.list({ account_id, script_name })` |
| `workers.scripts.versions.get` | read | `client.workers.scripts.versions.get({ account_id, script_name, version_id })` |

---

## Worker Script Schedules (Cron Triggers) (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/schedules.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.schedules.update` | write | `client.workers.scripts.schedules.update({ account_id, script_name, ...params })` |
| `workers.scripts.schedules.get` | read | `client.workers.scripts.schedules.get({ account_id, script_name })` |

---

## Worker Script Tail (Live Logs) (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/tail.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.tail.create` | write | `client.workers.scripts.tail.create({ account_id, script_name })` |
| `workers.scripts.tail.delete` | delete | `client.workers.scripts.tail.delete({ account_id, script_name, id })` |
| `workers.scripts.tail.get` | read | `client.workers.scripts.tail.get({ account_id, script_name })` |

---

## Worker Script Subdomain (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/scripts/subdomain.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.scripts.subdomain.create` | write | `client.workers.scripts.subdomain.create({ account_id, script_name, ...params })` |
| `workers.scripts.subdomain.delete` | delete | `client.workers.scripts.subdomain.delete({ account_id, script_name })` |
| `workers.scripts.subdomain.get` | read | `client.workers.scripts.subdomain.get({ account_id, script_name })` |

---

## Workers Routes (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/routes.d.ts`

Map URL patterns to worker scripts for a zone.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.routes.create` | write | `client.workers.routes.create({ zone_id, ...params })` |
| `workers.routes.update` | write | `client.workers.routes.update({ zone_id, route_id, ...params })` |
| `workers.routes.list` | read | `client.workers.routes.list({ zone_id })` |
| `workers.routes.delete` | delete | `client.workers.routes.delete({ zone_id, route_id })` |
| `workers.routes.get` | read | `client.workers.routes.get({ zone_id, route_id })` |

### Key Params — workers.routes.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `pattern` | string | yes | URL pattern (e.g., `example.com/api/*`) |
| `script` | string | no | Worker script name (omit to create a "negative" route that bypasses workers) |

---

## Workers Domains (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/domains.d.ts`

Custom domains for workers (alternative to routes).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.domains.update` | write | `client.workers.domains.update({ account_id, ...params })` |
| `workers.domains.list` | read | `client.workers.domains.list({ account_id })` |
| `workers.domains.delete` | delete | `client.workers.domains.delete({ account_id, domain_id })` |
| `workers.domains.get` | read | `client.workers.domains.get({ account_id, domain_id })` |

---

## Workers Account Settings (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/account-settings.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.accountSettings.update` | write | `client.workers.accountSettings.update({ account_id, ...params })` |
| `workers.accountSettings.get` | read | `client.workers.accountSettings.get({ account_id })` |

---

## Workers Subdomains (Account-Level) (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workers/subdomains.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workers.subdomains.update` | write | `client.workers.subdomains.update({ account_id, ...params })` |
| `workers.subdomains.get` | read | `client.workers.subdomains.get({ account_id })` |

---

## KV Namespaces (7 methods)

**JSDoc source**: `node_modules/cloudflare/resources/kv/namespaces/namespaces.d.ts`

Workers KV is a global, low-latency key-value store.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `kv.namespaces.create` | write | `client.kv.namespaces.create({ account_id, title })` |
| `kv.namespaces.update` | write | `client.kv.namespaces.update({ account_id, namespace_id, title })` |
| `kv.namespaces.list` | read | `client.kv.namespaces.list({ account_id })` |
| `kv.namespaces.delete` | delete | `client.kv.namespaces.delete({ account_id, namespace_id })` |
| `kv.namespaces.get` | read | `client.kv.namespaces.get({ account_id, namespace_id })` |
| `kv.namespaces.bulkUpdate` | write | `client.kv.namespaces.bulkUpdate({ account_id, namespace_id, body })` |
| `kv.namespaces.bulkDelete` | delete | `client.kv.namespaces.bulkDelete({ account_id, namespace_id, body })` |

---

## KV Keys (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/kv/namespaces/keys.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `kv.namespaces.keys.list` | read | `client.kv.namespaces.keys.list({ account_id, namespace_id, ...params })` |

### Key Params — kv.namespaces.keys.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `namespace_id` | string | yes | Namespace ID |
| `prefix` | string | no | Filter keys by prefix |
| `cursor` | string | no | Pagination cursor |
| `limit` | number | no | Number of keys to return (default 1000, max 1000) |

---

## KV Values (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/kv/namespaces/values.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `kv.namespaces.values.update` | write | `client.kv.namespaces.values.update({ account_id, namespace_id, key_name, ...params })` |
| `kv.namespaces.values.get` | read | `client.kv.namespaces.values.get({ account_id, namespace_id, key_name })` |
| `kv.namespaces.values.delete` | delete | `client.kv.namespaces.values.delete({ account_id, namespace_id, key_name })` |

### Key Params — kv.namespaces.values.update

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `namespace_id` | string | yes | Namespace ID |
| `key_name` | string | yes | Key name (max 512 bytes) |
| `value` | string | yes | Value (max 25 MiB) |
| `metadata` | object | no | JSON metadata object (max 1024 bytes) |
| `expiration` | number | no | Unix timestamp when key should expire |
| `expiration_ttl` | number | no | Seconds until key expires (min 60) |

---

## KV Metadata (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/kv/namespaces/metadata.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `kv.namespaces.metadata.get` | read | `client.kv.namespaces.metadata.get({ account_id, namespace_id, key_name })` |

---

## D1 Databases (9 methods)

**JSDoc source**: `node_modules/cloudflare/resources/d1/database.d.ts`

D1 is Cloudflare's serverless SQL database (SQLite-based).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `d1.database.create` | write | `client.d1.database.create({ account_id, name })` |
| `d1.database.list` | read | `client.d1.database.list({ account_id })` |
| `d1.database.get` | read | `client.d1.database.get({ account_id, database_id })` |
| `d1.database.update` | write | `client.d1.database.update({ account_id, database_id, ...params })` |
| `d1.database.delete` | delete | `client.d1.database.delete({ account_id, database_id })` |
| `d1.database.query` | write | `client.d1.database.query({ account_id, database_id, sql, params })` |
| `d1.database.raw` | write | `client.d1.database.raw({ account_id, database_id, sql, params })` |
| `d1.database.export` | read | `client.d1.database.export({ account_id, database_id })` |
| `d1.database.import` | write | `client.d1.database.import({ account_id, database_id, ...params })` |

### Key Params — d1.database.query

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `database_id` | string | yes | Database ID |
| `sql` | string | yes | SQL query to execute |
| `params` | array | no | Positional parameters for prepared statements |

### Key Params — d1.database.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Database name |
| `primary_location_hint` | string | no | Hint for primary location (e.g., `wnam`, `enam`, `weur`, `eeur`, `apac`) |

---

## Queues (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/queues/queues.d.ts`

Cloudflare Queues enable message passing between Workers.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `queues.create` | write | `client.queues.create({ account_id, ...params })` |
| `queues.update` | write | `client.queues.update({ account_id, queue_id, ...params })` |
| `queues.list` | read | `client.queues.list({ account_id })` |
| `queues.delete` | delete | `client.queues.delete({ account_id, queue_id })` |
| `queues.edit` | write | `client.queues.edit({ account_id, queue_id, ...params })` |
| `queues.get` | read | `client.queues.get({ account_id, queue_id })` |

---

## Queue Messages (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/queues/messages.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `queues.messages.push` | write | `client.queues.messages.push({ account_id, queue_id, ...params })` |
| `queues.messages.bulkPush` | write | `client.queues.messages.bulkPush({ account_id, queue_id, ...params })` |
| `queues.messages.pull` | write | `client.queues.messages.pull({ account_id, queue_id, ...params })` |
| `queues.messages.ack` | write | `client.queues.messages.ack({ account_id, queue_id, ...params })` |

---

## Queue Consumers (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/queues/consumers.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `queues.consumers.create` | write | `client.queues.consumers.create({ account_id, queue_id, ...params })` |
| `queues.consumers.update` | write | `client.queues.consumers.update({ account_id, queue_id, consumer_id, ...params })` |
| `queues.consumers.list` | read | `client.queues.consumers.list({ account_id, queue_id })` |
| `queues.consumers.delete` | delete | `client.queues.consumers.delete({ account_id, queue_id, consumer_id })` |
| `queues.consumers.get` | read | `client.queues.consumers.get({ account_id, queue_id, consumer_id })` |

---

## Durable Objects (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/durable-objects/namespaces/namespaces.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `durableObjects.namespaces.list` | read | `client.durableObjects.namespaces.list({ account_id })` |

---

## Workflows (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workflows/workflows.d.ts`

Cloudflare Workflows enable multi-step, durable execution.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workflows.update` | write | `client.workflows.update({ account_id, workflow_name, ...params })` |
| `workflows.list` | read | `client.workflows.list({ account_id })` |
| `workflows.delete` | delete | `client.workflows.delete({ account_id, workflow_name })` |
| `workflows.get` | read | `client.workflows.get({ account_id, workflow_name })` |

---

## Workflow Instances (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workflows/instances.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workflows.instances.create` | write | `client.workflows.instances.create({ account_id, workflow_name, ...params })` |
| `workflows.instances.list` | read | `client.workflows.instances.list({ account_id, workflow_name })` |
| `workflows.instances.get` | read | `client.workflows.instances.get({ account_id, workflow_name, instance_id })` |

---

## Workflow Versions (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/workflows/versions.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `workflows.versions.list` | read | `client.workflows.versions.list({ account_id, workflow_name })` |
| `workflows.versions.get` | read | `client.workflows.versions.get({ account_id, workflow_name, version_id })` |

---

## Hyperdrive (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/hyperdrive/configs.d.ts`

Hyperdrive accelerates connections to existing databases (Postgres, MySQL).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `hyperdrive.configs.create` | write | `client.hyperdrive.configs.create({ account_id, ...params })` |
| `hyperdrive.configs.update` | write | `client.hyperdrive.configs.update({ account_id, hyperdrive_id, ...params })` |
| `hyperdrive.configs.list` | read | `client.hyperdrive.configs.list({ account_id })` |
| `hyperdrive.configs.delete` | delete | `client.hyperdrive.configs.delete({ account_id, hyperdrive_id })` |
| `hyperdrive.configs.edit` | write | `client.hyperdrive.configs.edit({ account_id, hyperdrive_id, ...params })` |
| `hyperdrive.configs.get` | read | `client.hyperdrive.configs.get({ account_id, hyperdrive_id })` |

### Key Params — hyperdrive.configs.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Config name |
| `origin` | object | yes | `{ scheme: 'postgres', host, port, database, user, password }` |
| `caching` | object | no | `{ disabled: false, max_age: 30, stale_while_revalidate: 15 }` |

---

## Pipelines (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/pipelines.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `pipelines.create` | write | `client.pipelines.create({ account_id, ...params })` |
| `pipelines.update` | write | `client.pipelines.update({ account_id, pipeline_name, ...params })` |
| `pipelines.list` | read | `client.pipelines.list({ account_id })` |
| `pipelines.delete` | delete | `client.pipelines.delete({ account_id, pipeline_name })` |
| `pipelines.get` | read | `client.pipelines.get({ account_id, pipeline_name })` |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Workers Scripts | 5 | Deploy, list, delete, fetch, search |
| Worker Script Settings | 2 | Bindings and compatibility config |
| Worker Script Secrets | 4 | Secret environment variables |
| Worker Script Deployments | 4 | Deployment management |
| Worker Script Versions | 3 | Version management |
| Worker Script Schedules | 2 | Cron triggers |
| Worker Script Tail | 3 | Live log streaming |
| Worker Script Subdomain | 3 | workers.dev subdomain per script |
| Workers Routes | 5 | Zone URL pattern → script mapping |
| Workers Domains | 4 | Custom domains for workers |
| Workers Account Settings | 2 | Account-level worker config |
| Workers Subdomains | 2 | Account workers.dev subdomain |
| KV Namespaces | 7 | Namespace CRUD + bulk ops |
| KV Keys | 1 | List keys with prefix/cursor |
| KV Values | 3 | Read/write/delete individual values |
| KV Metadata | 1 | Key metadata |
| D1 Databases | 9 | SQL database CRUD + query |
| Queues | 6 | Queue management |
| Queue Messages | 4 | Push/pull/ack messages |
| Queue Consumers | 5 | Consumer (Worker) management |
| Durable Objects | 1 | List namespaces |
| Workflows | 4 | Workflow management |
| Workflow Instances | 3 | Trigger and track instances |
| Workflow Versions | 2 | Version listing |
| Hyperdrive | 6 | Database connection accelerator |
| Pipelines | 5 | Data pipelines |
| **Total** | **~95** | |
