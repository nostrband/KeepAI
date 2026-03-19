# Hetzner Methods — Infrastructure

Sub-spec of [hetzner-connector.md](./hetzner-connector.md). Covers read-only reference resources: datacenters, locations, pricing, and actions.

## Datacenters (2 methods) — Read-Only

Physical datacenters where resources are hosted.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `datacenters.list` | read | GET | `/datacenters` | List all datacenters |
| `datacenters.get` | read | GET | `/datacenters/{id}` | Get datacenter by ID |

### Key Params — datacenters.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by name |
| `sort` | string | no | Sort by: `id`, `name` |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

---

## Locations (2 methods) — Read-Only

Geographic locations containing one or more datacenters.

| Method | Op Type | HTTP | Path | Description |
|-------|---------|------|------|-------------|
| `locations.list` | read | GET | `/locations` | List all locations |
| `locations.get` | read | GET | `/locations/{id}` | Get location by ID |

### Key Params — locations.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by name |
| `sort` | string | no | Sort by: `id`, `name` |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

---

## Pricing (1 method) — Read-Only

Current pricing for all Hetzner Cloud resources.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `pricing.get` | read | GET | `/pricing` | Get pricing for all resource types |

Returns pricing for: servers, images, volumes, floating IPs, primary IPs, load balancers, traffic, and server backups. Prices include both net and gross amounts.

---

## Actions (2 methods) — Read-Only

Actions represent asynchronous operations. Every write/action endpoint returns an action object that can be polled for completion.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `actions.list` | read | GET | `/actions` | List all actions |
| `actions.get` | read | GET | `/actions/{id}` | Get action by ID |

### Key Params — actions.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | no | Filter by action ID |
| `status` | string | no | Filter by status: `running`, `success`, `error` |
| `sort` | string | no | Sort by: `id`, `command`, `status`, `started`, `finished` |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

### Action Object Structure

```json
{
  "id": 42,
  "command": "create_server",
  "status": "running",
  "progress": 50,
  "started": "2025-01-01T00:00:00+00:00",
  "finished": null,
  "resources": [{ "id": 123, "type": "server" }],
  "error": null
}
```

Status values: `running` → `success` or `error`. Agents can poll `actions.get` to wait for completion.
