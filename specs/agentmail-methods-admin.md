# AgentMail Methods — Admin

Sub-spec of [agentmail-connector.md](./agentmail-connector.md). Covers domains, pods, webhooks, lists, API keys, metrics, and organization.

## Domains (7 methods)

Custom domain management with DNS verification for SPF/DKIM/DMARC.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `domains.list` | read | GET | `/domains` | List all domains |
| `domains.create` | write | POST | `/domains` | Add a custom domain |
| `domains.get` | read | GET | `/domains/{domain_id}` | Get domain with DNS verification status |
| `domains.update` | write | PATCH | `/domains/{domain_id}` | Update domain settings |
| `domains.delete` | delete | DELETE | `/domains/{domain_id}` | Delete a domain |
| `domains.verify` | write | POST | `/domains/{domain_id}/verify` | Trigger domain verification |
| `domains.getZoneFile` | read | GET | `/domains/{domain_id}/zone-file` | Download DNS zone file |

### Key Params — domains.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Domain name (e.g., "example.com") |
| `feedback_enabled` | boolean | yes | Enable bounce/complaint feedback notifications |
| `pod_id` | string | no | Pod to associate the domain with |
| `client_id` | string | no | Client-provided ID |

### Key Params — domains.update

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `domain_id` | string | yes | Domain ID (the domain name) |
| `feedback_enabled` | boolean | no | Update feedback notifications setting |

### Key Params — domains.verify

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `domain_id` | string | yes | Domain ID to verify |

### Response Examples

**domains.get:**
```json
{
  "domain_id": "example.com",
  "status": "PENDING",
  "feedback_enabled": true,
  "records": [
    { "type": "TXT", "name": "_dmarc.example.com", "value": "v=DMARC1; p=none", "status": "MISSING" },
    { "type": "CNAME", "name": "abc._domainkey.example.com", "value": "abc.dkim.agentmail.to", "status": "VALID" },
    { "type": "MX", "name": "example.com", "value": "inbound.agentmail.to", "priority": 10, "status": "MISSING" }
  ],
  "created_at": "2025-03-19T10:00:00Z"
}
```

## Pods (4 methods)

Multi-tenancy units for organizing inboxes. Pods isolate inboxes, domains, and data.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `pods.list` | read | GET | `/pods` | List all pods |
| `pods.create` | write | POST | `/pods` | Create a new pod |
| `pods.get` | read | GET | `/pods/{pod_id}` | Get pod details |
| `pods.delete` | delete | DELETE | `/pods/{pod_id}` | Delete a pod |

### Key Params — pods.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Pod name |
| `client_id` | string | no | Client-provided ID |

### Response Examples

**pods.list:**
```json
{
  "count": 1,
  "items": [
    {
      "pod_id": "pod_abc",
      "name": "Production",
      "created_at": "2025-03-01T00:00:00Z",
      "updated_at": "2025-03-01T00:00:00Z"
    }
  ]
}
```

## Webhooks (5 methods)

Event delivery to external endpoints. Webhooks can be filtered by event type, inbox, or pod.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `webhooks.list` | read | GET | `/webhooks` | List all webhooks |
| `webhooks.create` | write | POST | `/webhooks` | Create a webhook |
| `webhooks.get` | read | GET | `/webhooks/{webhook_id}` | Get webhook details |
| `webhooks.update` | write | PATCH | `/webhooks/{webhook_id}` | Update webhook filters |
| `webhooks.delete` | delete | DELETE | `/webhooks/{webhook_id}` | Delete a webhook |

### Key Params — webhooks.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | Endpoint URL to receive events |
| `event_types` | string[] | no | Filter events: `message.received`, `message.sent`, `message.delivered`, `message.bounced`, `message.complained`, `message.rejected`, `domain.verified` |
| `inbox_ids` | string[] | no | Filter to specific inboxes (max 10) |
| `pod_ids` | string[] | no | Filter to specific pods (max 10) |
| `enabled` | boolean | no | Whether webhook is active (default: true) |
| `client_id` | string | no | Client-provided ID |

### Key Params — webhooks.update

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `webhook_id` | string | yes | Webhook ID |
| `add_inbox_ids` | string[] | no | Inbox IDs to add to filter |
| `remove_inbox_ids` | string[] | no | Inbox IDs to remove from filter |
| `add_pod_ids` | string[] | no | Pod IDs to add to filter |
| `remove_pod_ids` | string[] | no | Pod IDs to remove from filter |

### Response Examples

**webhooks.create:**
```json
{
  "webhook_id": "whk_abc",
  "url": "https://myapp.com/webhooks/agentmail",
  "event_types": ["message.received"],
  "inbox_ids": [],
  "pod_ids": [],
  "secret": "whsec_...",
  "enabled": true,
  "created_at": "2025-03-19T10:00:00Z"
}
```

## Lists (4 methods)

Allowlists and blocklists for controlling email send/receive/reply. Can be scoped to organization, pod, or inbox level.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `lists.list` | read | GET | `/lists/{direction}/{type}` | List entries in an allow/block list |
| `lists.get` | read | GET | `/lists/{direction}/{type}/{entry}` | Get a specific list entry |
| `lists.create` | write | POST | `/lists/{direction}/{type}` | Add an entry to a list |
| `lists.delete` | delete | DELETE | `/lists/{direction}/{type}/{entry}` | Remove an entry from a list |

### Key Params — lists.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | yes | `send`, `receive`, or `reply` |
| `type` | string | yes | `allow` or `block` |
| `limit` | number | no | Max results |
| `page_token` | string | no | Pagination token |

### Key Params — lists.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | yes | `send`, `receive`, or `reply` |
| `type` | string | yes | `allow` or `block` |
| `entry` | string | yes | Email address or domain to add |
| `reason` | string | no | Reason for the entry |

### Key Params — lists.delete

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | yes | `send`, `receive`, or `reply` |
| `type` | string | yes | `allow` or `block` |
| `entry` | string | yes | Email address or domain to remove |

### Response Examples

**lists.list:**
```json
{
  "count": 2,
  "items": [
    {
      "entry": "spam@bad.com",
      "direction": "receive",
      "list_type": "block",
      "entry_type": "email",
      "reason": "Known spammer",
      "created_at": "2025-03-19T10:00:00Z"
    },
    {
      "entry": "bad.com",
      "direction": "receive",
      "list_type": "block",
      "entry_type": "domain",
      "reason": null,
      "created_at": "2025-03-19T10:00:00Z"
    }
  ]
}
```

## API Keys (3 methods)

Manage API keys for the organization. Keys can be scoped to pod or inbox level.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `apiKeys.list` | read | GET | `/api-keys` | List all API keys |
| `apiKeys.create` | write | POST | `/api-keys` | Create a new API key |
| `apiKeys.delete` | delete | DELETE | `/api-keys/{api_key_id}` | Delete an API key |

### Key Params — apiKeys.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Key name/description |
| `pod_id` | string | no | Scope to a specific pod |
| `inbox_id` | string | no | Scope to a specific inbox |

### Response Examples

**apiKeys.create:**
```json
{
  "api_key_id": "key_abc",
  "api_key": "am_live_...",
  "prefix": "am_live",
  "name": "Production Bot Key",
  "pod_id": null,
  "inbox_id": null,
  "created_at": "2025-03-19T10:00:00Z"
}
```

Note: The `api_key` field (the actual secret) is only returned on creation. Subsequent list/get calls only show the prefix.

## Metrics (2 methods)

Time-series email delivery metrics.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `metrics.getOrg` | read | GET | `/metrics` | Get organization-level metrics |
| `metrics.getInbox` | read | GET | `/inboxes/{inbox_id}/metrics` | Get inbox-level metrics |

### Key Params — metrics.getOrg / metrics.getInbox

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes (getInbox only) | Inbox ID |
| `event_types` | string[] | no | Filter: `message.sent`, `message.delivered`, `message.bounced`, `message.delayed`, `message.rejected`, `message.complained`, `message.received` |
| `start` | string | no | Start time (ISO 8601) |
| `end` | string | no | End time (ISO 8601) |
| `period` | string | no | Bucket period |
| `limit` | number | no | Max buckets to return |
| `descending` | boolean | no | Sort descending |

### Response Examples

**metrics.getOrg:**
```json
{
  "message.sent": [
    { "timestamp": "2025-03-19T00:00:00Z", "count": 150 },
    { "timestamp": "2025-03-18T00:00:00Z", "count": 120 }
  ],
  "message.delivered": [
    { "timestamp": "2025-03-19T00:00:00Z", "count": 148 },
    { "timestamp": "2025-03-18T00:00:00Z", "count": 119 }
  ]
}
```

## Organization (1 method)

Get current organization details and usage limits.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `organization.get` | read | GET | `/organizations` | Get organization info and limits |

### Response Examples

**organization.get:**
```json
{
  "organization_id": "org_abc",
  "inbox_count": 5,
  "domain_count": 2,
  "inbox_limit": 100,
  "domain_limit": 10,
  "created_at": "2025-01-01T00:00:00Z"
}
```
