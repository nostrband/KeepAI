# AgentMail Methods — Inboxes

Sub-spec of [agentmail-connector.md](./agentmail-connector.md). Covers inboxes and drafts.

## Inboxes (5 methods)

Manage email inboxes. Each inbox gets a unique email address (e.g., `bot@myapp.agentmail.to` or a custom domain address).

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `inboxes.list` | read | GET | `/inboxes` | List all inboxes |
| `inboxes.create` | write | POST | `/inboxes` | Create a new inbox |
| `inboxes.get` | read | GET | `/inboxes/{inbox_id}` | Get inbox details |
| `inboxes.update` | write | PATCH | `/inboxes/{inbox_id}` | Update inbox display name |
| `inboxes.delete` | delete | DELETE | `/inboxes/{inbox_id}` | Delete an inbox |

### Key Params — inboxes.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | no | Max results to return |
| `page_token` | string | no | Pagination token |

### Key Params — inboxes.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `display_name` | string | no | Display name (e.g., "My Bot \<bot@example.com\>") |
| `pod_id` | string | no | Pod to create the inbox in |
| `client_id` | string | no | Client-provided ID for tracking |

### Key Params — inboxes.get

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |

### Key Params — inboxes.update

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `display_name` | string | no | New display name |

### Key Params — inboxes.delete

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |

### Response Examples

**inboxes.list:**
```json
{
  "count": 2,
  "limit": 10,
  "next_page_token": null,
  "items": [
    {
      "inbox_id": "inb_abc123",
      "display_name": "Support Bot",
      "pod_id": "pod_xyz",
      "created_at": "2025-03-01T00:00:00Z",
      "updated_at": "2025-03-01T00:00:00Z"
    }
  ]
}
```

**inboxes.create:**
```json
{
  "inbox_id": "inb_def456",
  "display_name": "Sales Bot",
  "pod_id": null,
  "client_id": "my-sales-bot",
  "created_at": "2025-03-19T10:00:00Z",
  "updated_at": "2025-03-19T10:00:00Z"
}
```

## Drafts (7 methods)

Create, edit, and send email drafts within an inbox. Drafts support scheduled sending via `send_at`.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `drafts.list` | read | GET | `/inboxes/{inbox_id}/drafts` | List drafts in an inbox |
| `drafts.get` | read | GET | `/inboxes/{inbox_id}/drafts/{draft_id}` | Get a specific draft |
| `drafts.create` | write | POST | `/inboxes/{inbox_id}/drafts` | Create a new draft |
| `drafts.update` | write | PATCH | `/inboxes/{inbox_id}/drafts/{draft_id}` | Update a draft |
| `drafts.delete` | delete | DELETE | `/inboxes/{inbox_id}/drafts/{draft_id}` | Delete a draft |
| `drafts.send` | write | POST | `/inboxes/{inbox_id}/drafts/{draft_id}/send` | Send a draft |
| `drafts.getAttachment` | read | GET | `/inboxes/{inbox_id}/drafts/{draft_id}/attachments/{attachment_id}` | Get draft attachment download URL |

### Key Params — drafts.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `limit` | number | no | Max results |
| `page_token` | string | no | Pagination token |

### Key Params — drafts.get

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `draft_id` | string | yes | Draft ID |

### Key Params — drafts.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `to` | string[] | no | Recipient email addresses |
| `cc` | string[] | no | CC recipients |
| `bcc` | string[] | no | BCC recipients |
| `reply_to` | string[] | no | Reply-to addresses |
| `subject` | string | no | Email subject |
| `text` | string | no | Plain text body |
| `html` | string | no | HTML body |
| `attachments` | object[] | no | Attachments (each with `filename`, `content_type`, and either `content` as base64 or `url`) |
| `in_reply_to` | string | no | Message ID being replied to |
| `references` | string[] | no | Message ID chain |
| `send_at` | string | no | Scheduled send time (ISO 8601) |
| `client_id` | string | no | Client-provided ID |

### Key Params — drafts.update

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `draft_id` | string | yes | Draft ID |
| `to` | string[] | no | Updated recipients |
| `cc` | string[] | no | Updated CC |
| `bcc` | string[] | no | Updated BCC |
| `reply_to` | string[] | no | Updated reply-to |
| `subject` | string | no | Updated subject |
| `text` | string | no | Updated plain text body |
| `html` | string | no | Updated HTML body |
| `attachments` | object[] | no | Updated attachments |
| `send_at` | string | no | Updated scheduled send time |

### Key Params — drafts.delete

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `draft_id` | string | yes | Draft ID |

### Key Params — drafts.send

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `draft_id` | string | yes | Draft ID |

### Key Params — drafts.getAttachment

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `draft_id` | string | yes | Draft ID |
| `attachment_id` | string | yes | Attachment ID |

### Response Examples

**drafts.create:**
```json
{
  "inbox_id": "inb_abc",
  "draft_id": "drf_123",
  "labels": ["draft"],
  "to": ["alice@example.com"],
  "subject": "Follow up",
  "text": "Just wanted to follow up on...",
  "send_status": null,
  "send_at": null,
  "created_at": "2025-03-19T10:00:00Z",
  "updated_at": "2025-03-19T10:00:00Z"
}
```

**drafts.send:**
```json
{
  "inbox_id": "inb_abc",
  "thread_id": "thr_456",
  "message_id": "msg_789",
  "labels": ["sent"],
  "from": "bot@myapp.agentmail.to",
  "to": ["alice@example.com"],
  "subject": "Follow up",
  "text": "Just wanted to follow up on...",
  "timestamp": "2025-03-19T10:01:00Z"
}
```
