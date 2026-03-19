# AgentMail Methods — Messaging

Sub-spec of [agentmail-connector.md](./agentmail-connector.md). Covers messages and threads.

## Messages (10 methods)

Core email operations. Send, receive, and manage messages within inboxes.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `messages.list` | read | GET | `/inboxes/{inbox_id}/messages` | List messages in an inbox |
| `messages.get` | read | GET | `/inboxes/{inbox_id}/messages/{message_id}` | Get a specific message |
| `messages.update` | write | PATCH | `/inboxes/{inbox_id}/messages/{message_id}` | Update message labels |
| `messages.send` | write | POST | `/inboxes/{inbox_id}/messages/send` | Send a new message |
| `messages.reply` | write | POST | `/inboxes/{inbox_id}/messages/{message_id}/reply` | Reply to a message |
| `messages.replyAll` | write | POST | `/inboxes/{inbox_id}/messages/{message_id}/reply-all` | Reply to all recipients |
| `messages.forward` | write | POST | `/inboxes/{inbox_id}/messages/{message_id}/forward` | Forward a message |
| `messages.getRaw` | read | GET | `/inboxes/{inbox_id}/messages/{message_id}/raw` | Get raw .eml file (presigned URL) |
| `messages.getAttachment` | read | GET | `/inboxes/{inbox_id}/messages/{message_id}/attachments/{attachment_id}` | Get attachment download URL |

### Key Params — messages.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `labels` | string[] | no | Filter by labels |
| `before` | string | no | Messages before this datetime (ISO 8601) |
| `after` | string | no | Messages after this datetime (ISO 8601) |
| `ascending` | boolean | no | Sort ascending by timestamp |
| `include_spam` | boolean | no | Include spam messages |
| `include_blocked` | boolean | no | Include blocked messages |
| `include_trash` | boolean | no | Include trashed messages |
| `limit` | number | no | Max results to return |
| `page_token` | string | no | Pagination token |

### Key Params — messages.get

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `message_id` | string | yes | Message ID |

### Key Params — messages.update

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `message_id` | string | yes | Message ID |
| `add_labels` | string[] | no | Labels to add |
| `remove_labels` | string[] | no | Labels to remove |

### Key Params — messages.send

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox to send from |
| `to` | string[] | yes | Recipient email addresses |
| `cc` | string[] | no | CC recipients |
| `bcc` | string[] | no | BCC recipients |
| `reply_to` | string[] | no | Reply-to addresses |
| `subject` | string | no | Email subject |
| `text` | string | no | Plain text body |
| `html` | string | no | HTML body |
| `attachments` | object[] | no | Attachments (each with `filename`, `content_type`, and either `content` as base64 or `url`) |
| `headers` | object | no | Custom email headers |
| `in_reply_to` | string | no | Message ID being replied to |
| `references` | string[] | no | Message ID chain for threading |

### Key Params — messages.reply

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `message_id` | string | yes | Message ID to reply to |
| `text` | string | no | Plain text body |
| `html` | string | no | HTML body |
| `attachments` | object[] | no | Attachments |

### Key Params — messages.replyAll

Same as `messages.reply`.

### Key Params — messages.forward

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `message_id` | string | yes | Message ID to forward |
| `to` | string[] | yes | Forward recipient addresses |
| `cc` | string[] | no | CC recipients |
| `bcc` | string[] | no | BCC recipients |
| `text` | string | no | Additional text to prepend |
| `html` | string | no | Additional HTML to prepend |

### Key Params — messages.getRaw

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `message_id` | string | yes | Message ID |

Returns: `{ download_url, expires_at }` — presigned S3 URL for the raw .eml file.

### Key Params — messages.getAttachment

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `message_id` | string | yes | Message ID |
| `attachment_id` | string | yes | Attachment ID |

Returns: `{ attachment_id, filename, size, content_type, content_disposition, download_url, expires_at }`

### Response Examples

**messages.list:**
```json
{
  "count": 2,
  "limit": 10,
  "next_page_token": null,
  "items": [
    {
      "inbox_id": "inb_abc",
      "thread_id": "thr_123",
      "message_id": "msg_456",
      "labels": ["inbox"],
      "from": "alice@example.com",
      "to": ["bot@myapp.agentmail.to"],
      "subject": "Hello",
      "preview": "Hi there, I wanted to...",
      "text": "Hi there, I wanted to ask about...",
      "attachments": [],
      "size": 1234,
      "timestamp": "2025-03-19T10:00:00Z"
    }
  ]
}
```

**messages.send:**
```json
{
  "inbox_id": "inb_abc",
  "thread_id": "thr_789",
  "message_id": "msg_012",
  "labels": ["sent"],
  "from": "bot@myapp.agentmail.to",
  "to": ["alice@example.com"],
  "subject": "Re: Hello",
  "text": "Thanks for reaching out!",
  "size": 567,
  "timestamp": "2025-03-19T10:05:00Z"
}
```

## Threads (4 methods)

Conversation threads grouping related messages.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `threads.list` | read | GET | `/inboxes/{inbox_id}/threads` | List threads in an inbox |
| `threads.get` | read | GET | `/inboxes/{inbox_id}/threads/{thread_id}` | Get a thread with all messages |
| `threads.delete` | delete | DELETE | `/inboxes/{inbox_id}/threads/{thread_id}` | Delete/trash a thread |
| `threads.getAttachment` | read | GET | `/inboxes/{inbox_id}/threads/{thread_id}/attachments/{attachment_id}` | Get attachment from a thread |

### Key Params — threads.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `labels` | string[] | no | Filter by labels |
| `before` | string | no | Threads before this datetime (ISO 8601) |
| `after` | string | no | Threads after this datetime (ISO 8601) |
| `ascending` | boolean | no | Sort ascending by timestamp |
| `include_spam` | boolean | no | Include spam threads |
| `include_blocked` | boolean | no | Include blocked threads |
| `include_trash` | boolean | no | Include trashed threads |
| `limit` | number | no | Max results |
| `page_token` | string | no | Pagination token |

### Key Params — threads.get

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `thread_id` | string | yes | Thread ID |

Returns thread with nested `messages` array (ordered by timestamp ascending).

### Key Params — threads.delete

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `thread_id` | string | yes | Thread ID |
| `permanent` | boolean | no | If true, permanently delete instead of trashing |

### Key Params — threads.getAttachment

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `inbox_id` | string | yes | Inbox ID |
| `thread_id` | string | yes | Thread ID |
| `attachment_id` | string | yes | Attachment ID |

### Response Examples

**threads.list:**
```json
{
  "count": 1,
  "limit": 10,
  "next_page_token": null,
  "items": [
    {
      "inbox_id": "inb_abc",
      "thread_id": "thr_123",
      "labels": ["inbox"],
      "senders": ["alice@example.com"],
      "recipients": ["bot@myapp.agentmail.to"],
      "subject": "Hello",
      "preview": "Hi there, I wanted to...",
      "last_message_id": "msg_456",
      "message_count": 3,
      "size": 4567,
      "timestamp": "2025-03-19T10:05:00Z"
    }
  ]
}
```

**threads.get:**
```json
{
  "inbox_id": "inb_abc",
  "thread_id": "thr_123",
  "labels": ["inbox"],
  "senders": ["alice@example.com", "bot@myapp.agentmail.to"],
  "recipients": ["alice@example.com", "bot@myapp.agentmail.to"],
  "subject": "Hello",
  "message_count": 2,
  "messages": [
    {
      "message_id": "msg_456",
      "from": "alice@example.com",
      "to": ["bot@myapp.agentmail.to"],
      "subject": "Hello",
      "text": "Hi there!",
      "timestamp": "2025-03-19T10:00:00Z"
    },
    {
      "message_id": "msg_789",
      "from": "bot@myapp.agentmail.to",
      "to": ["alice@example.com"],
      "subject": "Re: Hello",
      "text": "Thanks for reaching out!",
      "timestamp": "2025-03-19T10:05:00Z"
    }
  ]
}
```
