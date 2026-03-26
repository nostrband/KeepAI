# Resolvable IDs — Gmail Connector

Depends on: `resolvable-ids-infra.md`

## Resolvable Types

```ts
resolvableTypes: {
  message_id: {
    label: 'Message',
    params: {
      'messages.get': 'id',
      'messages.trash': 'id',
      'messages.untrash': 'id',
      'messages.delete': 'id',
      'messages.modify': 'id',
      'messages.attachments.get': 'messageId',
    },
  },
  thread_id: {
    label: 'Thread',
    params: {
      'threads.get': 'id',
      'threads.trash': 'id',
      'threads.untrash': 'id',
      'threads.delete': 'id',
      'threads.modify': 'id',
    },
  },
  draft_id: {
    label: 'Draft',
    params: {
      'drafts.get': 'id',
      'drafts.update': 'id',
      'drafts.delete': 'id',
      'drafts.send': 'id',
    },
  },
}
```

### Types not resolved

- `label_id` — label names are already human-readable in most cases (INBOX, SENT, custom names). System label IDs like `CATEGORY_SOCIAL` are self-documenting.
- `attachmentId` — meaningless without message context, and filenames are typically in params already.

---

## resolveId Implementation

File: `packages/connectors/src/connectors/gmail.ts`

Gmail uses direct HTTP, not an SDK. Resolution calls the Gmail API directly.

```ts
async resolveId(
  type: string,
  id: string,
  credentials: OAuthCredentials
): Promise<ResolveResult | null> {
  const base = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const headers = { Authorization: `Bearer ${credentials.accessToken}` };

  try {
    switch (type) {
      case 'message_id': {
        // Fetch metadata only (not full body) for efficiency
        const res = await fetch(
          `${base}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          { headers }
        );
        if (!res.ok) return null;
        const msg = await res.json();
        const subject = getHeader(msg, 'Subject') || '(no subject)';
        const from = getHeader(msg, 'From') || '';
        return {
          title: `${subject}${from ? ` — from ${from}` : ''}`,
          url: `https://mail.google.com/mail/u/0/#inbox/${id}`,
        };
      }
      case 'thread_id': {
        // Fetch thread with minimal data — first message's subject
        const res = await fetch(
          `${base}/threads/${id}?format=metadata&metadataHeaders=Subject`,
          { headers }
        );
        if (!res.ok) return null;
        const thread = await res.json();
        const firstMsg = thread.messages?.[0];
        const subject = firstMsg ? getHeader(firstMsg, 'Subject') : null;
        return {
          title: subject || '(no subject)',
          url: `https://mail.google.com/mail/u/0/#inbox/${id}`,
        };
      }
      case 'draft_id': {
        const res = await fetch(
          `${base}/drafts/${id}?format=metadata`,
          { headers }
        );
        if (!res.ok) return null;
        const draft = await res.json();
        const subject = getHeader(draft.message, 'Subject') || '(no subject)';
        return {
          title: `Draft: ${subject}`,
          url: `https://mail.google.com/mail/u/0/#drafts/${draft.message?.id || id}`,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function getHeader(msg: any, name: string): string | undefined {
  return msg?.payload?.headers?.find(
    (h: any) => h.name.toLowerCase() === name.toLowerCase()
  )?.value;
}
```

---

## describeGmailRequest — Updated Format

Current Gmail descriptions already include useful context for many methods (e.g. `to` addresses for sends, `q` for searches). Only methods referencing raw message/thread/draft IDs need updating.

Key changes:

```ts
// Before
case 'messages.get': return `Get email ${params.id || '(unknown)'}`;
// After
case 'messages.get':
  return params.id ? `Get email [message_id:${params.id}]` : 'Get email (unknown)';

// Before
case 'messages.trash': return `Trash email ${params.id || '(unknown)'}`;
// After
case 'messages.trash':
  return params.id ? `Trash email [message_id:${params.id}]` : 'Trash email (unknown)';

// Before
case 'messages.delete': return `Permanently delete email ${params.id || '(unknown)'}`;
// After
case 'messages.delete':
  return params.id
    ? `Permanently delete [message_id:${params.id}]`
    : 'Permanently delete email (unknown)';

// Before
case 'threads.get': return `Get thread ${params.id || '(unknown)'}`;
// After
case 'threads.get':
  return params.id ? `Get thread [thread_id:${params.id}]` : 'Get thread (unknown)';

// Before
case 'threads.trash': return `Trash thread ${params.id || '(unknown)'}`;
// After
case 'threads.trash':
  return params.id ? `Trash [thread_id:${params.id}]` : 'Trash thread (unknown)';

// Before
case 'drafts.get': return `Get draft ${params.id || '(unknown)'}`;
// After
case 'drafts.get':
  return params.id ? `Get [draft_id:${params.id}]` : 'Get draft (unknown)';

// Before
case 'drafts.delete': return `Delete draft ${params.id || '(unknown)'}`;
// After
case 'drafts.delete':
  return params.id ? `Delete [draft_id:${params.id}]` : 'Delete draft (unknown)';
```

Methods that already show useful context (e.g. `messages.send` shows `to`, `messages.list` shows query) keep their current format — no IDs to resolve there.

---

## Bare `id` Handling

Gmail uses `id` as the parameter name for messages, threads, and drafts. The `params` field on each resolvable type declares the mapping explicitly — e.g. `message_id.params['messages.get'] = 'id'` tells the JSON viewer that in a `messages.get` call, the `id` param resolves as `message_id`. No heuristics needed.
