/**
 * Gmail connector — 28 methods covering messages, attachments, drafts, labels, threads, and profile.
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gmailFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {}
): Promise<unknown> {
  const url = `${GMAIL_API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail API error ${response.status}: ${text}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true };
  }

  return response.json();
}

function describeGmailRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'messages.list':
      return params.q ? `Search emails: "${params.q}"` : 'List recent emails';
    case 'messages.get':
      return `Read email ${params.id || '(unknown)'}`;
    case 'messages.send':
      return `Send email to ${params.to || 'recipient'}`;
    case 'messages.trash':
      return `Move email ${params.id || '(unknown)'} to trash`;
    case 'messages.modify':
      return `Modify labels on email ${params.id || '(unknown)'}`;
    case 'messages.untrash':
      return `Restore email ${params.id || '(unknown)'} from trash`;
    case 'messages.delete':
      return `Permanently delete email ${params.id || '(unknown)'}`;
    case 'messages.batchModify':
      return `Modify labels on ${Array.isArray(params.ids) ? params.ids.length : '?'} emails`;
    case 'messages.batchDelete':
      return `Permanently delete ${Array.isArray(params.ids) ? params.ids.length : '?'} emails`;
    case 'attachments.get':
      return `Download attachment ${params.attachmentId || '(unknown)'} from email ${params.messageId || '(unknown)'}`;
    case 'drafts.create':
      return `Create draft email${params.to ? ` to ${params.to}` : ''}`;
    case 'drafts.list':
      return 'List draft emails';
    case 'drafts.get':
      return `Get draft ${params.id || '(unknown)'}`;
    case 'drafts.send':
      return `Send draft ${params.id || '(unknown)'}`;
    case 'drafts.update':
      return `Update draft ${params.id || '(unknown)'}`;
    case 'drafts.delete':
      return `Delete draft ${params.id || '(unknown)'}`;
    case 'labels.list':
      return 'List email labels';
    case 'labels.get':
      return `Get label ${params.id || '(unknown)'}`;
    case 'labels.create':
      return `Create label "${params.name || '(unnamed)'}"`;
    case 'labels.patch':
      return `Update label ${params.id || '(unknown)'}`;
    case 'labels.delete':
      return `Delete label ${params.id || '(unknown)'}`;
    case 'threads.list':
      return params.q ? `Search threads: "${params.q}"` : 'List email threads';
    case 'threads.get':
      return `Get thread ${params.id || '(unknown)'}`;
    case 'threads.modify':
      return `Modify labels on thread ${params.id || '(unknown)'}`;
    case 'threads.trash':
      return `Move thread ${params.id || '(unknown)'} to trash`;
    case 'threads.untrash':
      return `Restore thread ${params.id || '(unknown)'} from trash`;
    case 'threads.delete':
      return `Permanently delete thread ${params.id || '(unknown)'}`;
    case 'profile.get':
      return 'Get email profile info';
    default:
      return `Gmail ${method}`;
  }
}

const GMAIL_SEARCH_SYNTAX: string[] = [
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
];

const methods: ConnectorMethod[] = [
  {
    name: 'messages.list',
    description: 'List messages matching a query',
    operationType: 'read',
    params: [
      { name: 'q', type: 'string', required: false, description: 'Gmail search query (e.g., "from:alice subject:hello")', syntax: GMAIL_SEARCH_SYNTAX },
      { name: 'maxResults', type: 'number', required: false, description: 'Maximum number of messages to return', default: 10 },
      { name: 'labelIds', type: 'array', required: false, description: 'Only return messages with these label IDs' },
      { name: 'pageToken', type: 'string', required: false, description: 'Page token for pagination' },
    ],
    returns: 'List of message objects with id, threadId, snippet',
    example: { params: { q: 'from:alice@example.com', maxResults: 5 }, description: 'Search for emails from Alice' },
    responseExample: {
      messages: [
        { id: 'abc123', threadId: 'def456', snippet: 'Hey, about the...' },
      ],
      nextPageToken: 'token123',
    },
    notes: [
      "To get the full message, use the 'id' with messages.get",
      "When 'nextPageToken' is present, pass it as pageToken to get the next page",
    ],
    seeAlso: ['messages.get', 'threads.list'],
  },
  {
    name: 'messages.get',
    description: 'Get a message by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Message ID (from messages.list or threads.get)' },
      { name: 'format', type: 'string', required: false, description: 'Message format', default: 'full', enum: ['minimal', 'full', 'raw', 'metadata'] },
    ],
    returns: 'Full message object with headers, body, and attachments',
    example: { params: { id: '18a1b2c3d4e5f6' }, description: 'Get a specific message' },
    responseExample: {
      id: '18a1b2c3d4e5f6',
      threadId: '18a1b2c3d4e5f6',
      from: 'alice@example.com',
      to: 'you@gmail.com',
      subject: 'Hello',
      date: '2024-01-15T10:30:00Z',
      body: 'Hi, just wanted to check in...',
      labelIds: ['INBOX', 'UNREAD'],
    },
    notes: ['Find a message ID first with messages.list'],
    seeAlso: ['messages.list', 'threads.get'],
  },
  {
    name: 'messages.send',
    description: 'Send an email',
    operationType: 'write',
    params: [
      { name: 'to', type: 'string', required: true, description: 'Recipient email (comma-separated for multiple)' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject' },
      { name: 'body', type: 'string', required: true, description: 'Email body (plain text)' },
      { name: 'cc', type: 'string', required: false, description: 'CC recipients (comma-separated)' },
      { name: 'bcc', type: 'string', required: false, description: 'BCC recipients (comma-separated)' },
      { name: 'inReplyTo', type: 'string', required: false, description: 'Message ID being replied to' },
      { name: 'threadId', type: 'string', required: false, description: 'Thread ID to send in' },
    ],
    returns: 'Sent message object with id and threadId',
    example: { params: { to: 'bob@example.com', subject: 'Hello', body: 'Hi Bob!' }, description: 'Send a simple email' },
    responseExample: {
      id: '18a1b2c3d4e5f6',
      threadId: '18a1b2c3d4e5f6',
      labelIds: ['SENT'],
    },
    seeAlso: ['drafts.create', 'drafts.send'],
  },
  {
    name: 'messages.trash',
    description: 'Move a message to trash',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Message ID to trash (from messages.list)' },
    ],
    returns: 'Trashed message object',
    example: { params: { id: '18a1b2c3d4e5f6' }, description: 'Trash a message' },
    responseExample: { id: '18a1b2c3d4e5f6', labelIds: ['TRASH'] },
    notes: ['Find a message ID first with messages.list'],
    seeAlso: ['messages.list', 'messages.modify'],
  },
  {
    name: 'messages.modify',
    description: 'Modify message labels (add or remove)',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Message ID (from messages.list)' },
      { name: 'addLabelIds', type: 'array', required: false, description: 'Label IDs to add' },
      { name: 'removeLabelIds', type: 'array', required: false, description: 'Label IDs to remove' },
    ],
    returns: 'Modified message object',
    example: { params: { id: '18a1b2c3d4e5f6', addLabelIds: ['STARRED'] }, description: 'Star a message' },
    responseExample: { id: '18a1b2c3d4e5f6', labelIds: ['INBOX', 'STARRED'] },
    notes: [
      'Use labels.list to find available label IDs',
      'Find a message ID first with messages.list',
    ],
    seeAlso: ['labels.list', 'messages.list'],
  },
  {
    name: 'messages.untrash',
    description: 'Restore a message from trash',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Message ID to restore (from messages.list)' },
    ],
    returns: 'Restored message object',
    example: { params: { id: '18a1b2c3d4e5f6' }, description: 'Restore a trashed message' },
    responseExample: { id: '18a1b2c3d4e5f6', labelIds: ['INBOX'] },
    seeAlso: ['messages.trash', 'messages.list'],
  },
  {
    name: 'messages.delete',
    description: 'Permanently delete a message (cannot be undone)',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Message ID to permanently delete' },
    ],
    returns: 'Empty success response',
    example: { params: { id: '18a1b2c3d4e5f6' }, description: 'Permanently delete a message' },
    notes: [
      'This is irreversible — the message is permanently deleted, not moved to trash',
      'Consider using messages.trash instead for recoverable deletion',
    ],
    seeAlso: ['messages.trash', 'messages.list'],
  },
  {
    name: 'messages.batchModify',
    description: 'Modify labels on multiple messages at once',
    operationType: 'write',
    params: [
      { name: 'ids', type: 'array', required: true, description: 'Message IDs to modify (max 1000)' },
      { name: 'addLabelIds', type: 'array', required: false, description: 'Label IDs to add to all messages' },
      { name: 'removeLabelIds', type: 'array', required: false, description: 'Label IDs to remove from all messages' },
    ],
    returns: 'Empty success response',
    example: { params: { ids: ['msg1', 'msg2'], addLabelIds: ['STARRED'] }, description: 'Star multiple messages' },
    notes: ['Maximum 1000 message IDs per request'],
    seeAlso: ['messages.modify', 'labels.list'],
  },
  {
    name: 'messages.batchDelete',
    description: 'Permanently delete multiple messages at once (cannot be undone)',
    operationType: 'delete',
    params: [
      { name: 'ids', type: 'array', required: true, description: 'Message IDs to permanently delete (max 1000)' },
    ],
    returns: 'Empty success response',
    example: { params: { ids: ['msg1', 'msg2'] }, description: 'Permanently delete multiple messages' },
    notes: [
      'This is irreversible — messages are permanently deleted',
      'Maximum 1000 message IDs per request',
    ],
    seeAlso: ['messages.delete', 'messages.trash'],
  },
  {
    name: 'attachments.get',
    description: 'Download an email attachment',
    operationType: 'read',
    params: [
      { name: 'messageId', type: 'string', required: true, description: 'Message ID containing the attachment' },
      { name: 'attachmentId', type: 'string', required: true, description: 'Attachment ID (from message parts body.attachmentId in messages.get response)' },
    ],
    returns: 'Attachment data with base64url-encoded content',
    example: { params: { messageId: '18a1b2c3d4e5f6', attachmentId: 'ANGjd...' }, description: 'Download an attachment' },
    responseExample: {
      attachmentId: 'ANGjd...',
      size: 12345,
      data: '<base64url-encoded attachment data>',
    },
    notes: [
      'First use messages.get to find attachment IDs in the message parts',
      'Each message part with a filename has body.attachmentId',
      'The data field is base64url-encoded',
    ],
    seeAlso: ['messages.get'],
  },
  {
    name: 'drafts.create',
    description: 'Create a draft email',
    operationType: 'write',
    params: [
      { name: 'to', type: 'string', required: true, description: 'Recipient email (comma-separated for multiple)' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject' },
      { name: 'body', type: 'string', required: true, description: 'Email body (plain text)' },
      { name: 'cc', type: 'string', required: false, description: 'CC recipients (comma-separated)' },
      { name: 'bcc', type: 'string', required: false, description: 'BCC recipients (comma-separated)' },
    ],
    returns: 'Draft object with id and message',
    example: { params: { to: 'bob@example.com', subject: 'Draft', body: 'Working on this...' }, description: 'Create a draft' },
    responseExample: {
      id: 'r-123456789',
      message: { id: 'abc123', threadId: 'abc123', labelIds: ['DRAFT'] },
    },
    notes: ["Use the returned 'id' with drafts.send to send the draft"],
    seeAlso: ['drafts.send', 'drafts.list', 'messages.send'],
  },
  {
    name: 'drafts.list',
    description: 'List draft emails',
    operationType: 'read',
    params: [
      { name: 'maxResults', type: 'number', required: false, description: 'Maximum number of drafts', default: 10 },
      { name: 'pageToken', type: 'string', required: false, description: 'Page token for pagination' },
    ],
    returns: 'List of draft objects',
    responseExample: {
      drafts: [
        { id: 'r-123', message: { id: 'abc123', threadId: 'abc123' } },
      ],
      nextPageToken: 'token123',
    },
    notes: [
      "When 'nextPageToken' is present, pass it as pageToken to get the next page",
    ],
    seeAlso: ['drafts.get', 'drafts.create'],
  },
  {
    name: 'drafts.get',
    description: 'Get a draft by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Draft ID (from drafts.list)' },
      { name: 'format', type: 'string', required: false, description: 'Message format', default: 'full', enum: ['minimal', 'full', 'raw', 'metadata'] },
    ],
    returns: 'Draft object with full message',
    responseExample: {
      id: 'r-123',
      message: { id: 'abc123', threadId: 'abc123', subject: 'Draft subject', body: '...' },
    },
    notes: ['Find a draft ID first with drafts.list'],
    seeAlso: ['drafts.list', 'drafts.send'],
  },
  {
    name: 'drafts.send',
    description: 'Send a draft',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Draft ID to send (from drafts.list)' },
    ],
    returns: 'Sent message object',
    example: { params: { id: 'r-abc123' }, description: 'Send an existing draft' },
    responseExample: {
      id: '18a1b2c3d4e5f6',
      threadId: '18a1b2c3d4e5f6',
      labelIds: ['SENT'],
    },
    notes: ['Find a draft ID first with drafts.list'],
    seeAlso: ['drafts.list', 'drafts.create'],
  },
  {
    name: 'drafts.update',
    description: 'Update an existing draft',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Draft ID to update (from drafts.list)' },
      { name: 'to', type: 'string', required: true, description: 'Recipient email (comma-separated for multiple)' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject' },
      { name: 'body', type: 'string', required: true, description: 'Email body (plain text)' },
      { name: 'cc', type: 'string', required: false, description: 'CC recipients (comma-separated)' },
      { name: 'bcc', type: 'string', required: false, description: 'BCC recipients (comma-separated)' },
    ],
    returns: 'Updated draft object',
    example: { params: { id: 'r-abc123', to: 'bob@example.com', subject: 'Updated', body: 'New content' }, description: 'Update a draft' },
    responseExample: {
      id: 'r-123456789',
      message: { id: 'abc123', threadId: 'abc123', labelIds: ['DRAFT'] },
    },
    notes: [
      'Replaces the entire draft content',
      'Find a draft ID first with drafts.list',
    ],
    seeAlso: ['drafts.create', 'drafts.list', 'drafts.get'],
  },
  {
    name: 'drafts.delete',
    description: 'Permanently delete a draft',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Draft ID to delete (from drafts.list)' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'r-abc123' }, description: 'Delete a draft' },
    notes: ['This is permanent — the draft cannot be recovered'],
    seeAlso: ['drafts.list'],
  },
  {
    name: 'labels.list',
    description: 'List all labels',
    operationType: 'read',
    params: [],
    returns: 'List of label objects with id, name, type',
    responseExample: {
      labels: [
        { id: 'INBOX', name: 'INBOX', type: 'system' },
        { id: 'Label_1', name: 'My Label', type: 'user' },
      ],
    },
    seeAlso: ['labels.get', 'messages.modify'],
  },
  {
    name: 'labels.get',
    description: 'Get a label by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Label ID (from labels.list)' },
    ],
    returns: 'Label object with counts and settings',
    responseExample: {
      id: 'INBOX',
      name: 'INBOX',
      type: 'system',
      messagesTotal: 1234,
      messagesUnread: 5,
    },
    notes: ['Find label IDs with labels.list'],
    seeAlso: ['labels.list'],
  },
  {
    name: 'labels.create',
    description: 'Create a new label',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Label name' },
      { name: 'labelListVisibility', type: 'string', required: false, description: 'Visibility in label list', default: 'labelShow', enum: ['labelShow', 'labelShowIfUnread', 'labelHide'] },
      { name: 'messageListVisibility', type: 'string', required: false, description: 'Visibility in message list', default: 'show', enum: ['show', 'hide'] },
      { name: 'backgroundColor', type: 'string', required: false, description: 'Background color hex (e.g., "#16a765")' },
      { name: 'textColor', type: 'string', required: false, description: 'Text color hex (e.g., "#ffffff")' },
    ],
    returns: 'Created label object with id, name, type',
    example: { params: { name: 'My Label' }, description: 'Create a simple label' },
    responseExample: { id: 'Label_1', name: 'My Label', type: 'user' },
    seeAlso: ['labels.list', 'labels.patch', 'messages.modify'],
  },
  {
    name: 'labels.patch',
    description: 'Update a label (partial update)',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Label ID to update (from labels.list)' },
      { name: 'name', type: 'string', required: false, description: 'New label name' },
      { name: 'labelListVisibility', type: 'string', required: false, description: 'Visibility in label list', enum: ['labelShow', 'labelShowIfUnread', 'labelHide'] },
      { name: 'messageListVisibility', type: 'string', required: false, description: 'Visibility in message list', enum: ['show', 'hide'] },
      { name: 'backgroundColor', type: 'string', required: false, description: 'Background color hex' },
      { name: 'textColor', type: 'string', required: false, description: 'Text color hex' },
    ],
    returns: 'Updated label object',
    example: { params: { id: 'Label_1', name: 'Renamed Label' }, description: 'Rename a label' },
    responseExample: { id: 'Label_1', name: 'Renamed Label', type: 'user' },
    notes: ['Only specified fields are updated'],
    seeAlso: ['labels.list', 'labels.create'],
  },
  {
    name: 'labels.delete',
    description: 'Permanently delete a label',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Label ID to delete (from labels.list)' },
    ],
    returns: 'Empty success response',
    notes: [
      'This is permanent and also removes the label from all messages',
      'System labels (INBOX, SENT, etc.) cannot be deleted',
    ],
    seeAlso: ['labels.list'],
  },
  {
    name: 'threads.list',
    description: 'List email threads',
    operationType: 'read',
    params: [
      { name: 'q', type: 'string', required: false, description: 'Gmail search query', syntax: GMAIL_SEARCH_SYNTAX },
      { name: 'maxResults', type: 'number', required: false, description: 'Maximum threads to return', default: 10 },
      { name: 'labelIds', type: 'array', required: false, description: 'Filter by label IDs' },
      { name: 'pageToken', type: 'string', required: false, description: 'Page token for pagination' },
    ],
    returns: 'List of thread objects with id and snippet',
    responseExample: {
      threads: [
        { id: 'thread123', snippet: 'Latest message in thread...' },
      ],
      nextPageToken: 'token123',
    },
    notes: [
      "To get all messages in a thread, use the 'id' with threads.get",
      "When 'nextPageToken' is present, pass it as pageToken to get the next page",
    ],
    seeAlso: ['threads.get', 'messages.list'],
  },
  {
    name: 'threads.get',
    description: 'Get a thread with all messages',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Thread ID (from threads.list or messages.list)' },
      { name: 'format', type: 'string', required: false, description: 'Message format', default: 'full', enum: ['minimal', 'full', 'raw', 'metadata'] },
    ],
    returns: 'Thread object with all messages',
    responseExample: {
      id: 'thread123',
      messages: [
        { id: 'msg1', from: 'alice@example.com', snippet: 'First message...' },
        { id: 'msg2', from: 'you@gmail.com', snippet: 'Reply...' },
      ],
    },
    notes: ['Find a thread ID first with threads.list or messages.list'],
    seeAlso: ['threads.list', 'messages.get'],
  },
  {
    name: 'threads.modify',
    description: 'Modify thread labels',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Thread ID (from threads.list)' },
      { name: 'addLabelIds', type: 'array', required: false, description: 'Label IDs to add' },
      { name: 'removeLabelIds', type: 'array', required: false, description: 'Label IDs to remove' },
    ],
    returns: 'Modified thread object',
    notes: [
      'Use labels.list to find available label IDs',
      'Find a thread ID first with threads.list',
    ],
    seeAlso: ['labels.list', 'threads.list'],
  },
  {
    name: 'threads.trash',
    description: 'Move a thread and all its messages to trash',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Thread ID to trash (from threads.list)' },
    ],
    returns: 'Trashed thread object',
    example: { params: { id: 'thread123' }, description: 'Trash a thread' },
    responseExample: { id: 'thread123' },
    seeAlso: ['threads.untrash', 'threads.list', 'messages.trash'],
  },
  {
    name: 'threads.untrash',
    description: 'Restore a thread and all its messages from trash',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Thread ID to restore (from threads.list)' },
    ],
    returns: 'Restored thread object',
    example: { params: { id: 'thread123' }, description: 'Restore a trashed thread' },
    responseExample: { id: 'thread123' },
    seeAlso: ['threads.trash', 'threads.list'],
  },
  {
    name: 'threads.delete',
    description: 'Permanently delete a thread and all its messages (cannot be undone)',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Thread ID to permanently delete' },
    ],
    returns: 'Empty success response',
    notes: [
      'This is irreversible — the thread and all messages are permanently deleted',
      'Consider using threads.trash instead for recoverable deletion',
    ],
    seeAlso: ['threads.trash', 'threads.list'],
  },
  {
    name: 'profile.get',
    description: 'Get user profile information',
    operationType: 'read',
    params: [],
    returns: 'Profile with emailAddress, messagesTotal, threadsTotal, historyId',
    responseExample: {
      emailAddress: 'user@gmail.com',
      messagesTotal: 12345,
      threadsTotal: 6789,
    },
  },
];

function buildRawEmail(params: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`To: ${params.to}`);
  if (params.cc) lines.push(`Cc: ${params.cc}`);
  if (params.bcc) lines.push(`Bcc: ${params.bcc}`);
  lines.push(`Subject: ${params.subject}`);
  if (params.inReplyTo) lines.push(`In-Reply-To: ${params.inReplyTo}`);
  lines.push('Content-Type: text/plain; charset=utf-8');
  lines.push('');
  lines.push(String(params.body || ''));

  const raw = lines.join('\r\n');
  return Buffer.from(raw).toString('base64url');
}

async function executeGmail(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials
): Promise<unknown> {
  switch (method) {
    case 'messages.list': {
      const query = new URLSearchParams();
      if (params.q) query.set('q', String(params.q));
      if (params.maxResults) query.set('maxResults', String(params.maxResults));
      if (params.pageToken) query.set('pageToken', String(params.pageToken));
      if (Array.isArray(params.labelIds)) {
        for (const l of params.labelIds) query.append('labelIds', String(l));
      }
      const qs = query.toString();
      return gmailFetch(`/messages${qs ? `?${qs}` : ''}`, credentials);
    }

    case 'messages.get': {
      const format = params.format || 'full';
      return gmailFetch(`/messages/${params.id}?format=${format}`, credentials);
    }

    case 'messages.send': {
      const raw = buildRawEmail(params);
      const body: Record<string, unknown> = { raw };
      if (params.threadId) body.threadId = params.threadId;
      return gmailFetch('/messages/send', credentials, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    case 'messages.trash':
      return gmailFetch(`/messages/${params.id}/trash`, credentials, {
        method: 'POST',
      });

    case 'messages.modify':
      return gmailFetch(`/messages/${params.id}/modify`, credentials, {
        method: 'POST',
        body: JSON.stringify({
          addLabelIds: params.addLabelIds || [],
          removeLabelIds: params.removeLabelIds || [],
        }),
      });

    case 'messages.untrash':
      return gmailFetch(`/messages/${params.id}/untrash`, credentials, {
        method: 'POST',
      });

    case 'messages.delete':
      return gmailFetch(`/messages/${params.id}`, credentials, {
        method: 'DELETE',
      });

    case 'messages.batchModify':
      return gmailFetch('/messages/batchModify', credentials, {
        method: 'POST',
        body: JSON.stringify({
          ids: params.ids,
          addLabelIds: params.addLabelIds || [],
          removeLabelIds: params.removeLabelIds || [],
        }),
      });

    case 'messages.batchDelete':
      return gmailFetch('/messages/batchDelete', credentials, {
        method: 'POST',
        body: JSON.stringify({ ids: params.ids }),
      });

    case 'attachments.get':
      return gmailFetch(
        `/messages/${params.messageId}/attachments/${params.attachmentId}`,
        credentials
      );

    case 'drafts.create': {
      const raw = buildRawEmail(params);
      return gmailFetch('/drafts', credentials, {
        method: 'POST',
        body: JSON.stringify({ message: { raw } }),
      });
    }

    case 'drafts.list': {
      const query = new URLSearchParams();
      if (params.maxResults) query.set('maxResults', String(params.maxResults));
      if (params.pageToken) query.set('pageToken', String(params.pageToken));
      const qs = query.toString();
      return gmailFetch(`/drafts${qs ? `?${qs}` : ''}`, credentials);
    }

    case 'drafts.get': {
      const format = params.format || 'full';
      return gmailFetch(`/drafts/${params.id}?format=${format}`, credentials);
    }

    case 'drafts.send':
      return gmailFetch('/drafts/send', credentials, {
        method: 'POST',
        body: JSON.stringify({ id: params.id }),
      });

    case 'drafts.update': {
      const raw = buildRawEmail(params);
      return gmailFetch(`/drafts/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify({ message: { raw } }),
      });
    }

    case 'drafts.delete':
      return gmailFetch(`/drafts/${params.id}`, credentials, {
        method: 'DELETE',
      });

    case 'labels.list':
      return gmailFetch('/labels', credentials);

    case 'labels.get':
      return gmailFetch(`/labels/${params.id}`, credentials);

    case 'labels.create': {
      const labelBody: Record<string, unknown> = { name: params.name };
      if (params.labelListVisibility) labelBody.labelListVisibility = params.labelListVisibility;
      if (params.messageListVisibility) labelBody.messageListVisibility = params.messageListVisibility;
      if (params.backgroundColor || params.textColor) {
        const color: Record<string, unknown> = {};
        if (params.backgroundColor) color.backgroundColor = params.backgroundColor;
        if (params.textColor) color.textColor = params.textColor;
        labelBody.color = color;
      }
      return gmailFetch('/labels', credentials, {
        method: 'POST',
        body: JSON.stringify(labelBody),
      });
    }

    case 'labels.patch': {
      const patchBody: Record<string, unknown> = {};
      if (params.name) patchBody.name = params.name;
      if (params.labelListVisibility) patchBody.labelListVisibility = params.labelListVisibility;
      if (params.messageListVisibility) patchBody.messageListVisibility = params.messageListVisibility;
      if (params.backgroundColor || params.textColor) {
        const color: Record<string, unknown> = {};
        if (params.backgroundColor) color.backgroundColor = params.backgroundColor;
        if (params.textColor) color.textColor = params.textColor;
        patchBody.color = color;
      }
      return gmailFetch(`/labels/${params.id}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(patchBody),
      });
    }

    case 'labels.delete':
      return gmailFetch(`/labels/${params.id}`, credentials, {
        method: 'DELETE',
      });

    case 'threads.list': {
      const query = new URLSearchParams();
      if (params.q) query.set('q', String(params.q));
      if (params.maxResults) query.set('maxResults', String(params.maxResults));
      if (params.pageToken) query.set('pageToken', String(params.pageToken));
      if (Array.isArray(params.labelIds)) {
        for (const l of params.labelIds) query.append('labelIds', String(l));
      }
      const qs = query.toString();
      return gmailFetch(`/threads${qs ? `?${qs}` : ''}`, credentials);
    }

    case 'threads.get': {
      const format = params.format || 'full';
      return gmailFetch(`/threads/${params.id}?format=${format}`, credentials);
    }

    case 'threads.modify':
      return gmailFetch(`/threads/${params.id}/modify`, credentials, {
        method: 'POST',
        body: JSON.stringify({
          addLabelIds: params.addLabelIds || [],
          removeLabelIds: params.removeLabelIds || [],
        }),
      });

    case 'threads.trash':
      return gmailFetch(`/threads/${params.id}/trash`, credentials, {
        method: 'POST',
      });

    case 'threads.untrash':
      return gmailFetch(`/threads/${params.id}/untrash`, credentials, {
        method: 'POST',
      });

    case 'threads.delete':
      return gmailFetch(`/threads/${params.id}`, credentials, {
        method: 'DELETE',
      });

    case 'profile.get':
      return gmailFetch('/profile', credentials);

    default:
      throw new Error(`Unknown Gmail method: ${method}`);
  }
}

function getResourceType(method: string): string | undefined {
  const [resource] = method.split('.');
  switch (resource) {
    case 'messages': return 'message';
    case 'attachments': return 'attachment';
    case 'drafts': return 'draft';
    case 'labels': return 'label';
    case 'threads': return 'thread';
    case 'profile': return 'profile';
    default: return undefined;
  }
}

export const gmailConnector: Connector = {
  service: 'gmail',
  name: 'Gmail',
  methods,

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata {
    const methodDef = methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown Gmail method: ${method}`);
    }
    return {
      service: 'gmail',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeGmailRequest(method, params),
    };
  },

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown> {
    return executeGmail(method, params, credentials);
  },

  help(method?: string): ServiceHelp {
    if (method) {
      const m = methods.find((md) => md.name === method);
      return {
        service: 'gmail',
        name: 'Gmail',
        summary: 'Email — read, send, draft, organize',
        methods: m ? [m] : [],
      };
    }
    return {
      service: 'gmail',
      name: 'Gmail',
      summary: 'Email — read, send, draft, organize',
      methods,
    };
  },
};
