# Cloudflare Methods — Pages & Sites

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers Pages projects, custom hostnames, waiting rooms, snippets, and web3 hostnames.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Pages Projects (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/pages/projects/projects.d.ts`

Cloudflare Pages hosts full-stack web applications with Git integration and preview deployments.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `pages.projects.create` | write | `client.pages.projects.create({ account_id, ...params })` |
| `pages.projects.list` | read | `client.pages.projects.list({ account_id })` |
| `pages.projects.delete` | delete | `client.pages.projects.delete({ account_id, project_name })` |
| `pages.projects.edit` | write | `client.pages.projects.edit({ account_id, project_name, ...params })` |
| `pages.projects.get` | read | `client.pages.projects.get({ account_id, project_name })` |
| `pages.projects.purgeBuildCache` | write | `client.pages.projects.purgeBuildCache({ account_id, project_name })` |

### Key Params — pages.projects.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Project name (URL-safe, lowercase) |
| `production_branch` | string | no | Git branch for production deployments (default `main`) |
| `build_config` | object | no | `{ build_command, destination_dir, root_dir, web_analytics_token }` |
| `deployment_configs` | object | no | Environment-specific config for `production` and `preview` |
| `source` | object | no | Git source config: `{ type: 'github', config: { owner, repo_name, ... } }` |

### Key Params — pages.projects.edit

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `project_name` | string | yes | Project name |
| `production_branch` | string | no | Production branch |
| `build_config` | object | no | Build configuration |
| `deployment_configs` | object | no | Per-environment config (env vars, KV bindings, D1 bindings, etc.) |

---

## Pages Deployments (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/pages/projects/deployments/deployments.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `pages.projects.deployments.create` | write | `client.pages.projects.deployments.create({ account_id, project_name, ...params })` |
| `pages.projects.deployments.list` | read | `client.pages.projects.deployments.list({ account_id, project_name })` |
| `pages.projects.deployments.delete` | delete | `client.pages.projects.deployments.delete({ account_id, project_name, deployment_id })` |
| `pages.projects.deployments.get` | read | `client.pages.projects.deployments.get({ account_id, project_name, deployment_id })` |
| `pages.projects.deployments.retry` | write | `client.pages.projects.deployments.retry({ account_id, project_name, deployment_id })` |
| `pages.projects.deployments.rollback` | write | `client.pages.projects.deployments.rollback({ account_id, project_name, deployment_id })` |

---

## Pages Domains (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/pages/projects/domains.d.ts`

Custom domains for Pages projects.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `pages.projects.domains.create` | write | `client.pages.projects.domains.create({ account_id, project_name, ...params })` |
| `pages.projects.domains.list` | read | `client.pages.projects.domains.list({ account_id, project_name })` |
| `pages.projects.domains.delete` | delete | `client.pages.projects.domains.delete({ account_id, project_name, domain_name })` |
| `pages.projects.domains.edit` | write | `client.pages.projects.domains.edit({ account_id, project_name, domain_name })` |
| `pages.projects.domains.get` | read | `client.pages.projects.domains.get({ account_id, project_name, domain_name })` |

---

## Custom Hostnames (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/custom-hostnames/custom-hostnames.d.ts`

Custom hostnames allow SaaS providers to serve customer domains via Cloudflare (SSL for SaaS).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `customHostnames.create` | write | `client.customHostnames.create({ zone_id, ...params })` |
| `customHostnames.list` | read | `client.customHostnames.list({ zone_id, ...params })` |
| `customHostnames.delete` | delete | `client.customHostnames.delete({ zone_id, custom_hostname_id })` |
| `customHostnames.edit` | write | `client.customHostnames.edit({ zone_id, custom_hostname_id, ...params })` |
| `customHostnames.get` | read | `client.customHostnames.get({ zone_id, custom_hostname_id })` |

### Key Params — customHostnames.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `hostname` | string | yes | Custom hostname (e.g., `app.customer.com`) |
| `ssl` | object | yes | SSL config: `{ method: 'http'/'cname'/'txt'/'email', type: 'dv', settings: { ... } }` |
| `custom_metadata` | object | no | Custom metadata for the hostname |
| `custom_origin_server` | string | no | Override origin server |
| `custom_origin_sni` | string | no | Override origin SNI |

---

## Custom Hostname Fallback Origin (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/custom-hostnames/fallback-origin.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `customHostnames.fallbackOrigin.update` | write | `client.customHostnames.fallbackOrigin.update({ zone_id, ...params })` |
| `customHostnames.fallbackOrigin.get` | read | `client.customHostnames.fallbackOrigin.get({ zone_id })` |

---

## Waiting Rooms (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/waiting-rooms/waiting-rooms.d.ts`

Queue visitors during traffic spikes to protect origin servers.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `waitingRooms.create` | write | `client.waitingRooms.create({ zone_id, ...params })` |
| `waitingRooms.update` | write | `client.waitingRooms.update({ zone_id, waiting_room_id, ...params })` |
| `waitingRooms.list` | read | `client.waitingRooms.list({ zone_id })` |
| `waitingRooms.delete` | delete | `client.waitingRooms.delete({ zone_id, waiting_room_id })` |
| `waitingRooms.edit` | write | `client.waitingRooms.edit({ zone_id, waiting_room_id, ...params })` |
| `waitingRooms.get` | read | `client.waitingRooms.get({ zone_id, waiting_room_id })` |

### Key Params — waitingRooms.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `name` | string | yes | Waiting room name |
| `host` | string | yes | Hostname to protect (e.g., `shop.example.com`) |
| `new_users_per_minute` | number | yes | New users allowed per minute |
| `total_active_users` | number | yes | Total active users before queueing starts |
| `path` | string | no | Path to protect (default `/`) |
| `queue_all` | boolean | no | Queue all traffic (not just overflow) |
| `session_duration` | number | no | Session duration in minutes (1-30, default 5) |
| `custom_page_html` | string | no | Custom waiting room page HTML |

---

## Waiting Room Events (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/waiting-rooms/events/events.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `waitingRooms.events.create` | write | `client.waitingRooms.events.create({ zone_id, waiting_room_id, ...params })` |
| `waitingRooms.events.update` | write | `client.waitingRooms.events.update({ zone_id, waiting_room_id, event_id, ...params })` |
| `waitingRooms.events.list` | read | `client.waitingRooms.events.list({ zone_id, waiting_room_id })` |
| `waitingRooms.events.delete` | delete | `client.waitingRooms.events.delete({ zone_id, waiting_room_id, event_id })` |
| `waitingRooms.events.edit` | write | `client.waitingRooms.events.edit({ zone_id, waiting_room_id, event_id, ...params })` |
| `waitingRooms.events.get` | read | `client.waitingRooms.events.get({ zone_id, waiting_room_id, event_id })` |

---

## Waiting Room Rules (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/waiting-rooms/rules.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `waitingRooms.rules.create` | write | `client.waitingRooms.rules.create({ zone_id, waiting_room_id, ...params })` |
| `waitingRooms.rules.update` | write | `client.waitingRooms.rules.update({ zone_id, waiting_room_id, ...params })` |
| `waitingRooms.rules.delete` | delete | `client.waitingRooms.rules.delete({ zone_id, waiting_room_id, rule_id })` |
| `waitingRooms.rules.edit` | write | `client.waitingRooms.rules.edit({ zone_id, waiting_room_id, rule_id, ...params })` |

---

## Waiting Room Status (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/waiting-rooms/statuses.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `waitingRooms.statuses.get` | read | `client.waitingRooms.statuses.get({ zone_id, waiting_room_id })` |

---

## Waiting Room Settings (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/waiting-rooms/settings.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `waitingRooms.settings.update` | write | `client.waitingRooms.settings.update({ zone_id, ...params })` |
| `waitingRooms.settings.edit` | write | `client.waitingRooms.settings.edit({ zone_id, ...params })` |
| `waitingRooms.settings.get` | read | `client.waitingRooms.settings.get({ zone_id })` |

---

## Snippets (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/snippets/snippets.d.ts`

Cloudflare Snippets are lightweight code blocks that run on requests.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `snippets.update` | write | `client.snippets.update({ zone_id, snippet_name, ...params })` |
| `snippets.list` | read | `client.snippets.list({ zone_id })` |
| `snippets.delete` | delete | `client.snippets.delete({ zone_id, snippet_name })` |
| `snippets.get` | read | `client.snippets.get({ zone_id, snippet_name })` |

---

## Snippet Rules (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/snippets/rules.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `snippets.rules.update` | write | `client.snippets.rules.update({ zone_id, ...params })` |
| `snippets.rules.list` | read | `client.snippets.rules.list({ zone_id })` |
| `snippets.rules.delete` | delete | `client.snippets.rules.delete({ zone_id })` |

---

## Web3 Hostnames (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/web3/hostnames/hostnames.d.ts`

Serve IPFS/ENS/Ethereum content via Cloudflare gateways.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `web3.hostnames.create` | write | `client.web3.hostnames.create({ zone_id, ...params })` |
| `web3.hostnames.list` | read | `client.web3.hostnames.list({ zone_id })` |
| `web3.hostnames.delete` | delete | `client.web3.hostnames.delete({ zone_id, identifier })` |
| `web3.hostnames.edit` | write | `client.web3.hostnames.edit({ zone_id, identifier, ...params })` |
| `web3.hostnames.get` | read | `client.web3.hostnames.get({ zone_id, identifier })` |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Pages Projects | 6 | Full CRUD + purge cache |
| Pages Deployments | 6 | Deploy, rollback, retry |
| Pages Domains | 5 | Custom domains for Pages |
| Custom Hostnames | 5 | SSL for SaaS |
| Custom Hostname Fallback Origin | 2 | Fallback origin config |
| Waiting Rooms | 6 | Traffic queueing |
| Waiting Room Events | 6 | Scheduled events |
| Waiting Room Rules | 4 | Bypass rules |
| Waiting Room Status | 1 | Real-time status |
| Waiting Room Settings | 3 | Zone-wide config |
| Snippets | 4 | Lightweight code blocks |
| Snippet Rules | 3 | Execution rules |
| Web3 Hostnames | 5 | IPFS/Ethereum gateway |
| **Total** | **~56** | |
