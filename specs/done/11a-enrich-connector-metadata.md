# 11a - Enrich Connector Metadata

## Scope

Add missing metadata fields to `ConnectorMethod` and the Gmail/Notion
connectors so the server-side renderer (11b) has everything it needs.
No behavioral changes — this is purely additive.

## Type Changes (packages/proto/src/types.ts)

### Add to `ConnectorMethod`:

```typescript
interface ConnectorMethod {
  // existing fields unchanged
  name: string;
  description: string;
  operationType: OperationType;
  params: ParamSchema[];
  returns: string;
  example?: { params: Record<string, unknown>; description: string };

  // new fields
  seeAlso?: string[];              // Related method names, e.g. ['drafts.send', 'messages.send']
  responseExample?: unknown;       // Example response JSON shape
  notes?: string[];                // Free-form guidance lines shown at the bottom of method help
}
```

### Add to `ParamSchema`:

```typescript
interface ParamSchema {
  // existing fields unchanged
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];

  // new fields
  syntax?: string[];               // Query/format syntax lines, shown in method help
                                   // e.g. ['from:user@example.com — Messages from sender',
                                   //        'is:unread — Unread messages', ...]
}
```

### Add to `ServiceHelp`:

```typescript
interface ServiceHelp {
  // existing fields unchanged
  service: string;
  name: string;
  methods: ConnectorMethod[];
  accounts?: Array<{ id: string; label?: string }>;

  // new field
  summary?: string;                // One-line service summary for Level 1 help
                                   // e.g. 'Email — read, send, draft, organize'
}
```

## Gmail Connector Changes (packages/connectors/src/connectors/gmail.ts)

### Service summary

Add to `help()` return value:
```
summary: 'Email — read, send, draft, organize'
```

### Method-level additions

For each method, add `seeAlso`, `responseExample`, and `notes` where useful.
Add `syntax` to the `q` param on `messages.list` and `threads.list`.

#### messages.list

```typescript
{
  // params.q gets syntax:
  params: [{
    name: 'q',
    // ... existing fields
    syntax: [
      'from:user@example.com          Messages from a sender',
      'to:user@example.com            Messages to a recipient',
      'subject:meeting                Word in subject line',
      '"exact phrase"                 Exact phrase match',
      'is:unread                      Unread messages',
      'is:starred                     Starred messages',
      'has:attachment                 Has attachments',
      'after:2024/01/15               Sent after date',
      'before:2024/02/01              Sent before date',
      'label:important                Has label',
      'Combine with spaces (AND) or use OR',
    ],
  }, ...],
  responseExample: {
    messages: [
      { id: 'abc123', threadId: 'def456', snippet: 'Hey, about the...' }
    ],
    nextPageToken: 'token123',
  },
  notes: [
    "To get the full message, use the 'id' with messages.get",
    "When 'nextPageToken' is present, pass it as pageToken to get the next page",
  ],
  seeAlso: ['messages.get', 'threads.list'],
}
```

#### messages.get

```typescript
{
  responseExample: {
    id: '18e5a1b2c3d4e5f6',
    threadId: '18e5a1b2c3d4e5f6',
    from: 'alice@example.com',
    to: 'you@gmail.com',
    subject: 'Hello',
    date: '2024-01-15T10:30:00Z',
    body: 'Hi, just wanted to check in...',
    labelIds: ['INBOX', 'UNREAD'],
  },
  notes: ['Find a message ID first with messages.list'],
  seeAlso: ['messages.list', 'threads.get'],
}
```

#### messages.send

```typescript
{
  responseExample: {
    id: '18e5a1b2c3d4e5f6',
    threadId: '18e5a1b2c3d4e5f6',
    labelIds: ['SENT'],
  },
  seeAlso: ['drafts.create', 'drafts.send'],
}
```

#### messages.trash

```typescript
{
  responseExample: { id: '18e5a1b2c3d4e5f6', labelIds: ['TRASH'] },
  notes: ['Find a message ID first with messages.list'],
  seeAlso: ['messages.list', 'messages.modify'],
}
```

#### messages.modify

```typescript
{
  responseExample: { id: '18e5a1b2c3d4e5f6', labelIds: ['INBOX', 'IMPORTANT'] },
  notes: [
    'Use labels.list to find available label IDs',
    'Find a message ID first with messages.list',
  ],
  seeAlso: ['labels.list', 'messages.list'],
}
```

#### drafts.create

```typescript
{
  responseExample: {
    id: 'r-123456789',
    message: { id: 'abc123', threadId: 'abc123', labelIds: ['DRAFT'] },
  },
  notes: ["Use the returned 'id' with drafts.send to send the draft"],
  seeAlso: ['drafts.send', 'drafts.list', 'messages.send'],
}
```

#### drafts.list

```typescript
{
  responseExample: {
    drafts: [
      { id: 'r-123', message: { id: 'abc123', threadId: 'abc123' } }
    ],
    nextPageToken: 'token123',
  },
  seeAlso: ['drafts.get', 'drafts.create'],
}
```

#### drafts.get

```typescript
{
  responseExample: {
    id: 'r-123',
    message: { id: 'abc123', threadId: 'abc123', subject: 'Draft subject', body: '...' },
  },
  notes: ['Find a draft ID first with drafts.list'],
  seeAlso: ['drafts.list', 'drafts.send'],
}
```

#### drafts.send

```typescript
{
  responseExample: {
    id: '18e5a1b2c3d4e5f6',
    threadId: '18e5a1b2c3d4e5f6',
    labelIds: ['SENT'],
  },
  notes: ['Find a draft ID first with drafts.list'],
  seeAlso: ['drafts.list', 'drafts.create'],
}
```

#### labels.list

```typescript
{
  responseExample: {
    labels: [
      { id: 'INBOX', name: 'INBOX', type: 'system' },
      { id: 'Label_1', name: 'My Label', type: 'user' },
    ],
  },
  seeAlso: ['labels.get', 'messages.modify'],
}
```

#### labels.get

```typescript
{
  responseExample: {
    id: 'INBOX',
    name: 'INBOX',
    type: 'system',
    messagesTotal: 1234,
    messagesUnread: 5,
  },
  notes: ['Find label IDs with labels.list'],
  seeAlso: ['labels.list'],
}
```

#### threads.list

Same `q` param syntax as messages.list.

```typescript
{
  responseExample: {
    threads: [
      { id: 'thread123', snippet: 'Latest message in thread...' }
    ],
    nextPageToken: 'token123',
  },
  notes: [
    "To get all messages in a thread, use the 'id' with threads.get",
    "When 'nextPageToken' is present, pass it as pageToken to get the next page",
  ],
  seeAlso: ['threads.get', 'messages.list'],
}
```

#### threads.get

```typescript
{
  responseExample: {
    id: 'thread123',
    messages: [
      { id: 'msg1', from: 'alice@example.com', snippet: 'First message...' },
      { id: 'msg2', from: 'you@gmail.com', snippet: 'Reply...' },
    ],
  },
  notes: ['Find a thread ID first with threads.list or messages.list'],
  seeAlso: ['threads.list', 'messages.get'],
}
```

#### threads.modify

```typescript
{
  notes: [
    'Use labels.list to find available label IDs',
    'Find a thread ID first with threads.list',
  ],
  seeAlso: ['labels.list', 'threads.list'],
}
```

#### profile.get

```typescript
{
  responseExample: {
    emailAddress: 'user@gmail.com',
    messagesTotal: 12345,
    threadsTotal: 6789,
  },
  seeAlso: [],
}
```

## Notion Connector Changes (packages/connectors/src/connectors/notion.ts)

Same pattern — add `summary`, `seeAlso`, `responseExample`, `notes` to
each method. Specifics:

### Service summary

```
summary: 'Documents & databases — read, create, search'
```

### Method-level additions

Follow the same pattern as Gmail. Key ones:

- `search` → notes about filter syntax, seeAlso: ['databases.query', 'pages.retrieve']
- `databases.query` → notes about filter/sort object shapes, response example
- `pages.create` → notes about parent format, response example, seeAlso: ['pages.retrieve']
- All methods with IDs → notes about where to find IDs

## Files Changed

| File | Change |
|---|---|
| `packages/proto/src/types.ts` | Add `seeAlso`, `responseExample`, `notes` to ConnectorMethod; add `syntax` to ParamSchema; add `summary` to ServiceHelp |
| `packages/connectors/src/connectors/gmail.ts` | Add metadata to all 15 methods + service summary |
| `packages/connectors/src/connectors/notion.ts` | Add metadata to all 8 methods + service summary |

## Testing

- Existing tests should pass unchanged (new fields are optional)
- Add tests verifying new metadata fields are present on all methods
- Verify `connector.help()` includes new fields in output
