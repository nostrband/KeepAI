/**
 * AgentMail connector — 49 methods covering inboxes, messages, threads,
 * drafts, domains, pods, webhooks, lists, API keys, metrics, and organization.
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
  ResolveResult,
  ResolvableType,
} from '@keepai/proto';
import { classifyFetchError } from '../classify-fetch-error.js';

const AGENTMAIL_API = 'https://api.agentmail.to/v0';

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function agentmailFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${AGENTMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as any)?.message || `AgentMail API error: ${res.status}`;
    throw classifyFetchError(res.status, msg, 'agentmail');
  }

  if (res.status === 204) return {};
  return res.json();
}

function buildQuery(params: Record<string, unknown>, keys: string[]): string {
  const entries: [string, string][] = [];
  for (const k of keys) {
    const v = params[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      entries.push([k, v.join(',')]);
    } else {
      entries.push([k, String(v)]);
    }
  }
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ---------------------------------------------------------------------------
// Human-readable descriptions
// ---------------------------------------------------------------------------

function inboxRef(id: unknown): string { return id ? `[inbox_id:${id}]` : '(unknown)'; }
function amMsgRef(id: unknown): string { return id ? `[message_id:${id}]` : '(unknown)'; }
function amThreadRef(id: unknown): string { return id ? `[thread_id:${id}]` : '(unknown)'; }

function describeAgentmailRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'inboxes.list': return 'List inboxes';
    case 'inboxes.create': return `Create inbox${params.display_name ? ` "${params.display_name}"` : ''}`;
    case 'inboxes.get': return `Get ${inboxRef(params.inbox_id)}`;
    case 'inboxes.update': return `Update ${inboxRef(params.inbox_id)}`;
    case 'inboxes.delete': return `Delete ${inboxRef(params.inbox_id)}`;

    case 'messages.list': return `List messages in ${inboxRef(params.inbox_id)}`;
    case 'messages.get': return `Get ${amMsgRef(params.message_id)}`;
    case 'messages.update': return `Update labels on ${amMsgRef(params.message_id)}`;
    case 'messages.send': return `Send message to ${(params.to as string[])?.join(', ') || 'recipients'}${params.subject ? `: "${params.subject}"` : ''}`;
    case 'messages.reply': return `Reply to ${amMsgRef(params.message_id)}`;
    case 'messages.replyAll': return `Reply all to ${amMsgRef(params.message_id)}`;
    case 'messages.forward': return `Forward ${amMsgRef(params.message_id)} to ${(params.to as string[])?.join(', ') || 'recipients'}`;
    case 'messages.getRaw': return `Get raw .eml for ${amMsgRef(params.message_id)}`;
    case 'messages.getAttachment': return `Get attachment from ${amMsgRef(params.message_id)}`;

    case 'threads.list': return `List threads in ${inboxRef(params.inbox_id)}`;
    case 'threads.get': return `Get ${amThreadRef(params.thread_id)}`;
    case 'threads.delete': return `Delete ${amThreadRef(params.thread_id)}${params.permanent ? ' permanently' : ''}`;
    case 'threads.getAttachment': return `Get attachment from ${amThreadRef(params.thread_id)}`;

    case 'drafts.list': return `List drafts in ${inboxRef(params.inbox_id)}`;
    case 'drafts.get': return `Get draft ${params.draft_id || '(unknown)'}`;
    case 'drafts.create': return `Create draft${params.subject ? `: "${params.subject}"` : ''}`;
    case 'drafts.update': return `Update draft ${params.draft_id || '(unknown)'}`;
    case 'drafts.delete': return `Delete draft ${params.draft_id || '(unknown)'}`;
    case 'drafts.send': return `Send draft ${params.draft_id || '(unknown)'}`;
    case 'drafts.getAttachment': return `Get attachment from draft ${params.draft_id || '(unknown)'}`;

    case 'domains.list': return 'List domains';
    case 'domains.create': return `Add domain "${params.name || '(unknown)'}"`;
    case 'domains.get': return `Get domain ${params.domain_id || '(unknown)'}`;
    case 'domains.update': return `Update domain ${params.domain_id || '(unknown)'}`;
    case 'domains.delete': return `Delete domain ${params.domain_id || '(unknown)'}`;
    case 'domains.verify': return `Verify domain ${params.domain_id || '(unknown)'}`;
    case 'domains.getZoneFile': return `Download zone file for domain ${params.domain_id || '(unknown)'}`;

    case 'pods.list': return 'List pods';
    case 'pods.create': return `Create pod "${params.name || '(unknown)'}"`;
    case 'pods.get': return `Get pod ${params.pod_id || '(unknown)'}`;
    case 'pods.delete': return `Delete pod ${params.pod_id || '(unknown)'}`;

    case 'webhooks.list': return 'List webhooks';
    case 'webhooks.create': return `Create webhook for ${params.url || '(unknown)'}`;
    case 'webhooks.get': return `Get webhook ${params.webhook_id || '(unknown)'}`;
    case 'webhooks.update': return `Update webhook ${params.webhook_id || '(unknown)'}`;
    case 'webhooks.delete': return `Delete webhook ${params.webhook_id || '(unknown)'}`;

    case 'lists.list': return `List ${params.direction}/${params.type} entries`;
    case 'lists.get': return `Get ${params.direction}/${params.type} entry "${params.entry}"`;
    case 'lists.create': return `Add "${params.entry}" to ${params.direction}/${params.type} list`;
    case 'lists.delete': return `Remove "${params.entry}" from ${params.direction}/${params.type} list`;

    case 'apiKeys.list': return 'List API keys';
    case 'apiKeys.create': return `Create API key "${params.name || '(unknown)'}"`;
    case 'apiKeys.delete': return `Delete API key ${params.api_key_id || '(unknown)'}`;

    case 'metrics.getOrg': return 'Get organization metrics';
    case 'metrics.getInbox': return `Get metrics for ${inboxRef(params.inbox_id)}`;

    case 'organization.get': return 'Get organization info';

    default: return `AgentMail ${method}`;
  }
}

// ---------------------------------------------------------------------------
// Common params
// ---------------------------------------------------------------------------

const LIMIT_PARAM = { name: 'limit', type: 'number', required: false, description: 'Max items to return' } as const;
const PAGE_TOKEN_PARAM = { name: 'page_token', type: 'string', required: false, description: 'Token for next page (from previous response)' } as const;
const LIST_PARAMS = [LIMIT_PARAM, PAGE_TOKEN_PARAM];
const INBOX_ID_PARAM = { name: 'inbox_id', type: 'string', required: true, description: 'Inbox ID' } as const;

const MESSAGE_FILTER_PARAMS = [
  { name: 'labels', type: 'array', required: false, description: 'Filter by labels' },
  { name: 'before', type: 'string', required: false, description: 'Before this datetime (ISO 8601)' },
  { name: 'after', type: 'string', required: false, description: 'After this datetime (ISO 8601)' },
  { name: 'ascending', type: 'boolean', required: false, description: 'Sort ascending by timestamp' },
  { name: 'include_spam', type: 'boolean', required: false, description: 'Include spam' },
  { name: 'include_blocked', type: 'boolean', required: false, description: 'Include blocked' },
  { name: 'include_trash', type: 'boolean', required: false, description: 'Include trashed' },
] as const;

const SEND_PARAMS = [
  { name: 'to', type: 'array', required: true, description: 'Recipient email addresses' },
  { name: 'cc', type: 'array', required: false, description: 'CC recipients' },
  { name: 'bcc', type: 'array', required: false, description: 'BCC recipients' },
  { name: 'reply_to', type: 'array', required: false, description: 'Reply-to addresses' },
  { name: 'subject', type: 'string', required: false, description: 'Email subject' },
  { name: 'text', type: 'string', required: false, description: 'Plain text body' },
  { name: 'html', type: 'string', required: false, description: 'HTML body' },
  { name: 'attachments', type: 'array', required: false, description: 'Attachments — array of {filename, content_type, content (base64) or url}' },
  { name: 'headers', type: 'object', required: false, description: 'Custom email headers' },
  { name: 'in_reply_to', type: 'string', required: false, description: 'Message ID being replied to' },
  { name: 'references', type: 'array', required: false, description: 'Message ID chain for threading' },
] as const;

// ---------------------------------------------------------------------------
// Method definitions — Messaging group
// ---------------------------------------------------------------------------

const messagingMethods: ConnectorMethod[] = [
  // Messages
  {
    name: 'messages.list',
    description: 'List messages in an inbox',
    operationType: 'read',
    params: [INBOX_ID_PARAM, ...MESSAGE_FILTER_PARAMS, ...LIST_PARAMS],
    returns: 'List of message objects with pagination',
    example: { params: { inbox_id: 'inb_abc', limit: 10 }, description: 'List recent messages' },
    responseExample: { count: 2, limit: 10, next_page_token: null, items: [{ inbox_id: 'inb_abc', message_id: 'msg_123', from: 'alice@example.com', subject: 'Hello', preview: 'Hi there...' }] },
    seeAlso: ['messages.get', 'threads.list'],
  },
  {
    name: 'messages.get',
    description: 'Get a specific message',
    operationType: 'read',
    params: [INBOX_ID_PARAM, { name: 'message_id', type: 'string', required: true, description: 'Message ID' }],
    returns: 'Full message object with body and attachments',
    example: { params: { inbox_id: 'inb_abc', message_id: 'msg_123' }, description: 'Get a message' },
    seeAlso: ['messages.list', 'messages.getAttachment'],
  },
  {
    name: 'messages.update',
    description: 'Update message labels (add or remove)',
    operationType: 'write',
    params: [
      INBOX_ID_PARAM,
      { name: 'message_id', type: 'string', required: true, description: 'Message ID' },
      { name: 'add_labels', type: 'array', required: false, description: 'Labels to add' },
      { name: 'remove_labels', type: 'array', required: false, description: 'Labels to remove' },
    ],
    returns: 'Updated message object',
    example: { params: { inbox_id: 'inb_abc', message_id: 'msg_123', add_labels: ['important'] }, description: 'Add a label' },
    seeAlso: ['messages.get'],
  },
  {
    name: 'messages.send',
    description: 'Send a new message',
    operationType: 'write',
    params: [INBOX_ID_PARAM, ...SEND_PARAMS],
    returns: 'Sent message object',
    example: { params: { inbox_id: 'inb_abc', to: ['alice@example.com'], subject: 'Hello', text: 'Hi Alice!' }, description: 'Send a message' },
    seeAlso: ['messages.reply', 'drafts.create'],
  },
  {
    name: 'messages.reply',
    description: 'Reply to a message',
    operationType: 'write',
    params: [
      INBOX_ID_PARAM,
      { name: 'message_id', type: 'string', required: true, description: 'Message ID to reply to' },
      { name: 'text', type: 'string', required: false, description: 'Plain text body' },
      { name: 'html', type: 'string', required: false, description: 'HTML body' },
      { name: 'attachments', type: 'array', required: false, description: 'Attachments' },
    ],
    returns: 'Sent reply message object',
    example: { params: { inbox_id: 'inb_abc', message_id: 'msg_123', text: 'Thanks!' }, description: 'Reply to a message' },
    seeAlso: ['messages.replyAll', 'messages.forward'],
  },
  {
    name: 'messages.replyAll',
    description: 'Reply to all recipients of a message',
    operationType: 'write',
    params: [
      INBOX_ID_PARAM,
      { name: 'message_id', type: 'string', required: true, description: 'Message ID to reply to' },
      { name: 'text', type: 'string', required: false, description: 'Plain text body' },
      { name: 'html', type: 'string', required: false, description: 'HTML body' },
      { name: 'attachments', type: 'array', required: false, description: 'Attachments' },
    ],
    returns: 'Sent reply message object',
    seeAlso: ['messages.reply', 'messages.forward'],
  },
  {
    name: 'messages.forward',
    description: 'Forward a message to new recipients',
    operationType: 'write',
    params: [
      INBOX_ID_PARAM,
      { name: 'message_id', type: 'string', required: true, description: 'Message ID to forward' },
      { name: 'to', type: 'array', required: true, description: 'Forward recipient addresses' },
      { name: 'cc', type: 'array', required: false, description: 'CC recipients' },
      { name: 'bcc', type: 'array', required: false, description: 'BCC recipients' },
      { name: 'text', type: 'string', required: false, description: 'Additional text to prepend' },
      { name: 'html', type: 'string', required: false, description: 'Additional HTML to prepend' },
    ],
    returns: 'Sent forwarded message object',
    seeAlso: ['messages.reply', 'messages.send'],
  },
  {
    name: 'messages.getRaw',
    description: 'Get raw .eml file as a presigned download URL',
    operationType: 'read',
    params: [INBOX_ID_PARAM, { name: 'message_id', type: 'string', required: true, description: 'Message ID' }],
    returns: 'Object with download_url and expires_at',
    seeAlso: ['messages.get'],
  },
  {
    name: 'messages.getAttachment',
    description: 'Get attachment download URL from a message',
    operationType: 'read',
    params: [
      INBOX_ID_PARAM,
      { name: 'message_id', type: 'string', required: true, description: 'Message ID' },
      { name: 'attachment_id', type: 'string', required: true, description: 'Attachment ID' },
    ],
    returns: 'Attachment with download_url and expires_at',
    seeAlso: ['messages.get'],
  },

  // Threads
  {
    name: 'threads.list',
    description: 'List threads in an inbox',
    operationType: 'read',
    params: [INBOX_ID_PARAM, ...MESSAGE_FILTER_PARAMS, ...LIST_PARAMS],
    returns: 'List of thread objects with pagination',
    example: { params: { inbox_id: 'inb_abc', limit: 10 }, description: 'List recent threads' },
    seeAlso: ['threads.get', 'messages.list'],
  },
  {
    name: 'threads.get',
    description: 'Get a thread with all its messages',
    operationType: 'read',
    params: [INBOX_ID_PARAM, { name: 'thread_id', type: 'string', required: true, description: 'Thread ID' }],
    returns: 'Thread object with nested messages array',
    example: { params: { inbox_id: 'inb_abc', thread_id: 'thr_123' }, description: 'Get a full thread' },
    seeAlso: ['threads.list', 'messages.get'],
  },
  {
    name: 'threads.delete',
    description: 'Delete or trash a thread',
    operationType: 'delete',
    params: [
      INBOX_ID_PARAM,
      { name: 'thread_id', type: 'string', required: true, description: 'Thread ID' },
      { name: 'permanent', type: 'boolean', required: false, description: 'If true, permanently delete instead of trashing' },
    ],
    returns: 'Empty success response',
    notes: ['Without permanent=true, the thread is moved to trash'],
    seeAlso: ['threads.list'],
  },
  {
    name: 'threads.getAttachment',
    description: 'Get attachment download URL from a thread',
    operationType: 'read',
    params: [
      INBOX_ID_PARAM,
      { name: 'thread_id', type: 'string', required: true, description: 'Thread ID' },
      { name: 'attachment_id', type: 'string', required: true, description: 'Attachment ID' },
    ],
    returns: 'Attachment with download_url and expires_at',
    seeAlso: ['threads.get'],
  },
];

// ---------------------------------------------------------------------------
// Method definitions — Inboxes group
// ---------------------------------------------------------------------------

const inboxesMethods: ConnectorMethod[] = [
  // Inboxes
  {
    name: 'inboxes.list',
    description: 'List all inboxes',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of inbox objects with pagination',
    seeAlso: ['inboxes.create', 'inboxes.get'],
  },
  {
    name: 'inboxes.create',
    description: 'Create a new inbox',
    operationType: 'write',
    params: [
      { name: 'display_name', type: 'string', required: false, description: 'Display name (e.g., "My Bot <bot@example.com>")' },
      { name: 'pod_id', type: 'string', required: false, description: 'Pod to create the inbox in' },
      { name: 'client_id', type: 'string', required: false, description: 'Client-provided ID for tracking' },
    ],
    returns: 'Created inbox object',
    example: { params: { display_name: 'Support Bot' }, description: 'Create an inbox' },
    seeAlso: ['inboxes.list', 'inboxes.delete'],
  },
  {
    name: 'inboxes.get',
    description: 'Get inbox details',
    operationType: 'read',
    params: [INBOX_ID_PARAM],
    returns: 'Inbox object',
    seeAlso: ['inboxes.list'],
  },
  {
    name: 'inboxes.update',
    description: 'Update inbox display name',
    operationType: 'write',
    params: [INBOX_ID_PARAM, { name: 'display_name', type: 'string', required: false, description: 'New display name' }],
    returns: 'Updated inbox object',
    seeAlso: ['inboxes.get'],
  },
  {
    name: 'inboxes.delete',
    description: 'Delete an inbox',
    operationType: 'delete',
    params: [INBOX_ID_PARAM],
    returns: 'Empty success response',
    notes: ['This permanently deletes the inbox and all its messages'],
    seeAlso: ['inboxes.list'],
  },

  // Drafts
  {
    name: 'drafts.list',
    description: 'List drafts in an inbox',
    operationType: 'read',
    params: [INBOX_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of draft objects with pagination',
    seeAlso: ['drafts.create', 'drafts.get'],
  },
  {
    name: 'drafts.get',
    description: 'Get a specific draft',
    operationType: 'read',
    params: [INBOX_ID_PARAM, { name: 'draft_id', type: 'string', required: true, description: 'Draft ID' }],
    returns: 'Draft object',
    seeAlso: ['drafts.list'],
  },
  {
    name: 'drafts.create',
    description: 'Create a new draft',
    operationType: 'write',
    params: [
      INBOX_ID_PARAM,
      { name: 'to', type: 'array', required: false, description: 'Recipient email addresses' },
      { name: 'cc', type: 'array', required: false, description: 'CC recipients' },
      { name: 'bcc', type: 'array', required: false, description: 'BCC recipients' },
      { name: 'reply_to', type: 'array', required: false, description: 'Reply-to addresses' },
      { name: 'subject', type: 'string', required: false, description: 'Email subject' },
      { name: 'text', type: 'string', required: false, description: 'Plain text body' },
      { name: 'html', type: 'string', required: false, description: 'HTML body' },
      { name: 'attachments', type: 'array', required: false, description: 'Attachments' },
      { name: 'in_reply_to', type: 'string', required: false, description: 'Message ID being replied to' },
      { name: 'references', type: 'array', required: false, description: 'Message ID chain' },
      { name: 'send_at', type: 'string', required: false, description: 'Scheduled send time (ISO 8601)' },
      { name: 'client_id', type: 'string', required: false, description: 'Client-provided ID' },
    ],
    returns: 'Created draft object',
    example: { params: { inbox_id: 'inb_abc', to: ['alice@example.com'], subject: 'Follow up', text: 'Hi!' }, description: 'Create a draft' },
    seeAlso: ['drafts.send', 'drafts.update', 'messages.send'],
  },
  {
    name: 'drafts.update',
    description: 'Update a draft',
    operationType: 'write',
    params: [
      INBOX_ID_PARAM,
      { name: 'draft_id', type: 'string', required: true, description: 'Draft ID' },
      { name: 'to', type: 'array', required: false, description: 'Updated recipients' },
      { name: 'cc', type: 'array', required: false, description: 'Updated CC' },
      { name: 'bcc', type: 'array', required: false, description: 'Updated BCC' },
      { name: 'reply_to', type: 'array', required: false, description: 'Updated reply-to' },
      { name: 'subject', type: 'string', required: false, description: 'Updated subject' },
      { name: 'text', type: 'string', required: false, description: 'Updated plain text body' },
      { name: 'html', type: 'string', required: false, description: 'Updated HTML body' },
      { name: 'attachments', type: 'array', required: false, description: 'Updated attachments' },
      { name: 'send_at', type: 'string', required: false, description: 'Updated scheduled send time' },
    ],
    returns: 'Updated draft object',
    seeAlso: ['drafts.get', 'drafts.send'],
  },
  {
    name: 'drafts.delete',
    description: 'Delete a draft',
    operationType: 'delete',
    params: [INBOX_ID_PARAM, { name: 'draft_id', type: 'string', required: true, description: 'Draft ID' }],
    returns: 'Empty success response',
    seeAlso: ['drafts.list'],
  },
  {
    name: 'drafts.send',
    description: 'Send a draft',
    operationType: 'write',
    params: [INBOX_ID_PARAM, { name: 'draft_id', type: 'string', required: true, description: 'Draft ID to send' }],
    returns: 'Sent message object',
    example: { params: { inbox_id: 'inb_abc', draft_id: 'drf_123' }, description: 'Send a draft' },
    seeAlso: ['drafts.create', 'messages.send'],
  },
  {
    name: 'drafts.getAttachment',
    description: 'Get attachment download URL from a draft',
    operationType: 'read',
    params: [
      INBOX_ID_PARAM,
      { name: 'draft_id', type: 'string', required: true, description: 'Draft ID' },
      { name: 'attachment_id', type: 'string', required: true, description: 'Attachment ID' },
    ],
    returns: 'Attachment with download_url and expires_at',
    seeAlso: ['drafts.get'],
  },
];

// ---------------------------------------------------------------------------
// Method definitions — Admin group
// ---------------------------------------------------------------------------

const adminMethods: ConnectorMethod[] = [
  // Domains
  {
    name: 'domains.list',
    description: 'List all custom domains',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of domain objects',
    seeAlso: ['domains.create', 'domains.get'],
  },
  {
    name: 'domains.create',
    description: 'Add a custom domain',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Domain name (e.g., "example.com")' },
      { name: 'feedback_enabled', type: 'boolean', required: true, description: 'Enable bounce/complaint feedback notifications' },
      { name: 'pod_id', type: 'string', required: false, description: 'Pod to associate the domain with' },
      { name: 'client_id', type: 'string', required: false, description: 'Client-provided ID' },
    ],
    returns: 'Created domain object with DNS verification records',
    example: { params: { name: 'example.com', feedback_enabled: true }, description: 'Add a domain' },
    seeAlso: ['domains.verify', 'domains.get'],
  },
  {
    name: 'domains.get',
    description: 'Get domain details with DNS verification status',
    operationType: 'read',
    params: [{ name: 'domain_id', type: 'string', required: true, description: 'Domain ID (domain name)' }],
    returns: 'Domain object with records and verification status',
    seeAlso: ['domains.list', 'domains.verify'],
  },
  {
    name: 'domains.update',
    description: 'Update domain settings',
    operationType: 'write',
    params: [
      { name: 'domain_id', type: 'string', required: true, description: 'Domain ID' },
      { name: 'feedback_enabled', type: 'boolean', required: false, description: 'Update feedback notifications setting' },
    ],
    returns: 'Updated domain object',
    seeAlso: ['domains.get'],
  },
  {
    name: 'domains.delete',
    description: 'Delete a custom domain',
    operationType: 'delete',
    params: [{ name: 'domain_id', type: 'string', required: true, description: 'Domain ID' }],
    returns: 'Empty success response',
    seeAlso: ['domains.list'],
  },
  {
    name: 'domains.verify',
    description: 'Trigger domain DNS verification',
    operationType: 'write',
    params: [{ name: 'domain_id', type: 'string', required: true, description: 'Domain ID to verify' }],
    returns: 'Domain object with updated verification status',
    seeAlso: ['domains.get', 'domains.getZoneFile'],
  },
  {
    name: 'domains.getZoneFile',
    description: 'Download DNS zone file for a domain',
    operationType: 'read',
    params: [{ name: 'domain_id', type: 'string', required: true, description: 'Domain ID' }],
    returns: 'Zone file content',
    seeAlso: ['domains.get', 'domains.verify'],
  },

  // Pods
  {
    name: 'pods.list',
    description: 'List all pods',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of pod objects',
    seeAlso: ['pods.create'],
  },
  {
    name: 'pods.create',
    description: 'Create a new pod for multi-tenancy',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Pod name' },
      { name: 'client_id', type: 'string', required: false, description: 'Client-provided ID' },
    ],
    returns: 'Created pod object',
    example: { params: { name: 'Production' }, description: 'Create a pod' },
    seeAlso: ['pods.list', 'pods.delete'],
  },
  {
    name: 'pods.get',
    description: 'Get pod details',
    operationType: 'read',
    params: [{ name: 'pod_id', type: 'string', required: true, description: 'Pod ID' }],
    returns: 'Pod object',
    seeAlso: ['pods.list'],
  },
  {
    name: 'pods.delete',
    description: 'Delete a pod',
    operationType: 'delete',
    params: [{ name: 'pod_id', type: 'string', required: true, description: 'Pod ID' }],
    returns: 'Empty success response',
    seeAlso: ['pods.list'],
  },

  // Webhooks
  {
    name: 'webhooks.list',
    description: 'List all webhooks',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of webhook objects',
    seeAlso: ['webhooks.create'],
  },
  {
    name: 'webhooks.create',
    description: 'Create a webhook for event delivery',
    operationType: 'write',
    params: [
      { name: 'url', type: 'string', required: true, description: 'Endpoint URL to receive events' },
      { name: 'event_types', type: 'array', required: false, description: 'Event types to filter (e.g., message.received, message.sent)' },
      { name: 'inbox_ids', type: 'array', required: false, description: 'Filter to specific inboxes (max 10)' },
      { name: 'pod_ids', type: 'array', required: false, description: 'Filter to specific pods (max 10)' },
      { name: 'enabled', type: 'boolean', required: false, description: 'Whether webhook is active (default: true)' },
      { name: 'client_id', type: 'string', required: false, description: 'Client-provided ID' },
    ],
    returns: 'Created webhook object with secret for signature verification',
    example: { params: { url: 'https://myapp.com/webhooks', event_types: ['message.received'] }, description: 'Create a webhook' },
    seeAlso: ['webhooks.list', 'webhooks.update'],
  },
  {
    name: 'webhooks.get',
    description: 'Get webhook details',
    operationType: 'read',
    params: [{ name: 'webhook_id', type: 'string', required: true, description: 'Webhook ID' }],
    returns: 'Webhook object',
    seeAlso: ['webhooks.list'],
  },
  {
    name: 'webhooks.update',
    description: 'Update webhook filters',
    operationType: 'write',
    params: [
      { name: 'webhook_id', type: 'string', required: true, description: 'Webhook ID' },
      { name: 'add_inbox_ids', type: 'array', required: false, description: 'Inbox IDs to add to filter' },
      { name: 'remove_inbox_ids', type: 'array', required: false, description: 'Inbox IDs to remove from filter' },
      { name: 'add_pod_ids', type: 'array', required: false, description: 'Pod IDs to add to filter' },
      { name: 'remove_pod_ids', type: 'array', required: false, description: 'Pod IDs to remove from filter' },
    ],
    returns: 'Updated webhook object',
    seeAlso: ['webhooks.get'],
  },
  {
    name: 'webhooks.delete',
    description: 'Delete a webhook',
    operationType: 'delete',
    params: [{ name: 'webhook_id', type: 'string', required: true, description: 'Webhook ID' }],
    returns: 'Empty success response',
    seeAlso: ['webhooks.list'],
  },

  // Lists
  {
    name: 'lists.list',
    description: 'List entries in an allow/block list',
    operationType: 'read',
    params: [
      { name: 'direction', type: 'string', required: true, description: 'Direction: send, receive, or reply' },
      { name: 'type', type: 'string', required: true, description: 'List type: allow or block' },
      ...LIST_PARAMS,
    ],
    returns: 'List of entries',
    example: { params: { direction: 'receive', type: 'block' }, description: 'List blocked receive addresses' },
    seeAlso: ['lists.create', 'lists.delete'],
  },
  {
    name: 'lists.get',
    description: 'Get a specific list entry',
    operationType: 'read',
    params: [
      { name: 'direction', type: 'string', required: true, description: 'Direction: send, receive, or reply' },
      { name: 'type', type: 'string', required: true, description: 'List type: allow or block' },
      { name: 'entry', type: 'string', required: true, description: 'Email address or domain' },
    ],
    returns: 'List entry object',
    seeAlso: ['lists.list'],
  },
  {
    name: 'lists.create',
    description: 'Add an entry to an allow/block list',
    operationType: 'write',
    params: [
      { name: 'direction', type: 'string', required: true, description: 'Direction: send, receive, or reply' },
      { name: 'type', type: 'string', required: true, description: 'List type: allow or block' },
      { name: 'entry', type: 'string', required: true, description: 'Email address or domain to add' },
      { name: 'reason', type: 'string', required: false, description: 'Reason for the entry' },
    ],
    returns: 'Created list entry',
    example: { params: { direction: 'receive', type: 'block', entry: 'spam@bad.com', reason: 'Spammer' }, description: 'Block a sender' },
    seeAlso: ['lists.list', 'lists.delete'],
  },
  {
    name: 'lists.delete',
    description: 'Remove an entry from an allow/block list',
    operationType: 'delete',
    params: [
      { name: 'direction', type: 'string', required: true, description: 'Direction: send, receive, or reply' },
      { name: 'type', type: 'string', required: true, description: 'List type: allow or block' },
      { name: 'entry', type: 'string', required: true, description: 'Email address or domain to remove' },
    ],
    returns: 'Empty success response',
    seeAlso: ['lists.list'],
  },

  // API Keys
  {
    name: 'apiKeys.list',
    description: 'List all API keys',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of API key objects (secrets are masked)',
    seeAlso: ['apiKeys.create'],
  },
  {
    name: 'apiKeys.create',
    description: 'Create a new API key',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Key name/description' },
      { name: 'pod_id', type: 'string', required: false, description: 'Scope to a specific pod' },
      { name: 'inbox_id', type: 'string', required: false, description: 'Scope to a specific inbox' },
    ],
    returns: 'Created API key object (api_key field only returned on creation)',
    example: { params: { name: 'Production Bot Key' }, description: 'Create an API key' },
    notes: ['The api_key value is only returned on creation — store it securely'],
    seeAlso: ['apiKeys.list', 'apiKeys.delete'],
  },
  {
    name: 'apiKeys.delete',
    description: 'Delete an API key',
    operationType: 'delete',
    params: [{ name: 'api_key_id', type: 'string', required: true, description: 'API key ID' }],
    returns: 'Empty success response',
    seeAlso: ['apiKeys.list'],
  },

  // Metrics
  {
    name: 'metrics.getOrg',
    description: 'Get organization-level email delivery metrics',
    operationType: 'read',
    params: [
      { name: 'event_types', type: 'array', required: false, description: 'Filter by event types (e.g., message.sent, message.delivered)' },
      { name: 'start', type: 'string', required: false, description: 'Start time (ISO 8601)' },
      { name: 'end', type: 'string', required: false, description: 'End time (ISO 8601)' },
      { name: 'period', type: 'string', required: false, description: 'Bucket period' },
      LIMIT_PARAM,
      { name: 'descending', type: 'boolean', required: false, description: 'Sort descending' },
    ],
    returns: 'Map of event type to time-series buckets',
    seeAlso: ['metrics.getInbox'],
  },
  {
    name: 'metrics.getInbox',
    description: 'Get inbox-level email delivery metrics',
    operationType: 'read',
    params: [
      INBOX_ID_PARAM,
      { name: 'event_types', type: 'array', required: false, description: 'Filter by event types' },
      { name: 'start', type: 'string', required: false, description: 'Start time (ISO 8601)' },
      { name: 'end', type: 'string', required: false, description: 'End time (ISO 8601)' },
      { name: 'period', type: 'string', required: false, description: 'Bucket period' },
      LIMIT_PARAM,
      { name: 'descending', type: 'boolean', required: false, description: 'Sort descending' },
    ],
    returns: 'Map of event type to time-series buckets',
    seeAlso: ['metrics.getOrg'],
  },

  // Organization
  {
    name: 'organization.get',
    description: 'Get organization info, usage counts, and limits',
    operationType: 'read',
    params: [],
    returns: 'Organization object with inbox_count, domain_count, and limits',
  },
];

// ---------------------------------------------------------------------------
// Aggregation & groups
// ---------------------------------------------------------------------------

const allMethods: ConnectorMethod[] = [
  ...messagingMethods,
  ...inboxesMethods,
  ...adminMethods,
];


// ---------------------------------------------------------------------------
// Resource type
// ---------------------------------------------------------------------------

function getResourceType(method: string): string | undefined {
  const [resource] = method.split('.');
  switch (resource) {
    case 'inboxes': return 'inbox';
    case 'messages': return 'message';
    case 'threads': return 'thread';
    case 'drafts': return 'draft';
    case 'domains': return 'domain';
    case 'pods': return 'pod';
    case 'webhooks': return 'webhook';
    case 'lists': return 'list';
    case 'apiKeys': return 'api_key';
    case 'metrics': return 'metrics';
    case 'organization': return 'organization';
    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

async function executeAgentmail(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials,
): Promise<unknown> {
  const { inbox_id, message_id, thread_id, draft_id, domain_id, pod_id, webhook_id, api_key_id, attachment_id } = params as Record<string, string>;

  switch (method) {
    // --- Inboxes ---
    case 'inboxes.list':
      return agentmailFetch(`/inboxes${buildQuery(params, ['limit', 'page_token'])}`, credentials);

    case 'inboxes.create':
      return agentmailFetch('/inboxes', credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['display_name', 'pod_id', 'client_id'])),
      });

    case 'inboxes.get':
      return agentmailFetch(`/inboxes/${inbox_id}`, credentials);

    case 'inboxes.update':
      return agentmailFetch(`/inboxes/${inbox_id}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(pick(params, ['display_name'])),
      });

    case 'inboxes.delete':
      return agentmailFetch(`/inboxes/${inbox_id}`, credentials, { method: 'DELETE' });

    // --- Messages ---
    case 'messages.list':
      return agentmailFetch(
        `/inboxes/${inbox_id}/messages${buildQuery(params, ['labels', 'before', 'after', 'ascending', 'include_spam', 'include_blocked', 'include_trash', 'limit', 'page_token'])}`,
        credentials,
      );

    case 'messages.get':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/${message_id}`, credentials);

    case 'messages.update':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/${message_id}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(pick(params, ['add_labels', 'remove_labels'])),
      });

    case 'messages.send':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/send`, credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['to', 'cc', 'bcc', 'reply_to', 'subject', 'text', 'html', 'attachments', 'headers', 'in_reply_to', 'references'])),
      });

    case 'messages.reply':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/${message_id}/reply`, credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['text', 'html', 'attachments'])),
      });

    case 'messages.replyAll':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/${message_id}/reply-all`, credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['text', 'html', 'attachments'])),
      });

    case 'messages.forward':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/${message_id}/forward`, credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['to', 'cc', 'bcc', 'text', 'html'])),
      });

    case 'messages.getRaw':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/${message_id}/raw`, credentials);

    case 'messages.getAttachment':
      return agentmailFetch(`/inboxes/${inbox_id}/messages/${message_id}/attachments/${attachment_id}`, credentials);

    // --- Threads ---
    case 'threads.list':
      return agentmailFetch(
        `/inboxes/${inbox_id}/threads${buildQuery(params, ['labels', 'before', 'after', 'ascending', 'include_spam', 'include_blocked', 'include_trash', 'limit', 'page_token'])}`,
        credentials,
      );

    case 'threads.get':
      return agentmailFetch(`/inboxes/${inbox_id}/threads/${thread_id}`, credentials);

    case 'threads.delete':
      return agentmailFetch(
        `/inboxes/${inbox_id}/threads/${thread_id}${params.permanent ? '?permanent=true' : ''}`,
        credentials,
        { method: 'DELETE' },
      );

    case 'threads.getAttachment':
      return agentmailFetch(`/inboxes/${inbox_id}/threads/${thread_id}/attachments/${attachment_id}`, credentials);

    // --- Drafts ---
    case 'drafts.list':
      return agentmailFetch(`/inboxes/${inbox_id}/drafts${buildQuery(params, ['limit', 'page_token'])}`, credentials);

    case 'drafts.get':
      return agentmailFetch(`/inboxes/${inbox_id}/drafts/${draft_id}`, credentials);

    case 'drafts.create':
      return agentmailFetch(`/inboxes/${inbox_id}/drafts`, credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['to', 'cc', 'bcc', 'reply_to', 'subject', 'text', 'html', 'attachments', 'in_reply_to', 'references', 'send_at', 'client_id'])),
      });

    case 'drafts.update':
      return agentmailFetch(`/inboxes/${inbox_id}/drafts/${draft_id}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(pick(params, ['to', 'cc', 'bcc', 'reply_to', 'subject', 'text', 'html', 'attachments', 'send_at'])),
      });

    case 'drafts.delete':
      return agentmailFetch(`/inboxes/${inbox_id}/drafts/${draft_id}`, credentials, { method: 'DELETE' });

    case 'drafts.send':
      return agentmailFetch(`/inboxes/${inbox_id}/drafts/${draft_id}/send`, credentials, { method: 'POST' });

    case 'drafts.getAttachment':
      return agentmailFetch(`/inboxes/${inbox_id}/drafts/${draft_id}/attachments/${attachment_id}`, credentials);

    // --- Domains ---
    case 'domains.list':
      return agentmailFetch(`/domains${buildQuery(params, ['limit', 'page_token'])}`, credentials);

    case 'domains.create':
      return agentmailFetch('/domains', credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['name', 'feedback_enabled', 'pod_id', 'client_id'])),
      });

    case 'domains.get':
      return agentmailFetch(`/domains/${domain_id}`, credentials);

    case 'domains.update':
      return agentmailFetch(`/domains/${domain_id}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(pick(params, ['feedback_enabled'])),
      });

    case 'domains.delete':
      return agentmailFetch(`/domains/${domain_id}`, credentials, { method: 'DELETE' });

    case 'domains.verify':
      return agentmailFetch(`/domains/${domain_id}/verify`, credentials, { method: 'POST' });

    case 'domains.getZoneFile':
      return agentmailFetch(`/domains/${domain_id}/zone-file`, credentials);

    // --- Pods ---
    case 'pods.list':
      return agentmailFetch(`/pods${buildQuery(params, ['limit', 'page_token'])}`, credentials);

    case 'pods.create':
      return agentmailFetch('/pods', credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['name', 'client_id'])),
      });

    case 'pods.get':
      return agentmailFetch(`/pods/${pod_id}`, credentials);

    case 'pods.delete':
      return agentmailFetch(`/pods/${pod_id}`, credentials, { method: 'DELETE' });

    // --- Webhooks ---
    case 'webhooks.list':
      return agentmailFetch(`/webhooks${buildQuery(params, ['limit', 'page_token'])}`, credentials);

    case 'webhooks.create':
      return agentmailFetch('/webhooks', credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['url', 'event_types', 'inbox_ids', 'pod_ids', 'enabled', 'client_id'])),
      });

    case 'webhooks.get':
      return agentmailFetch(`/webhooks/${webhook_id}`, credentials);

    case 'webhooks.update':
      return agentmailFetch(`/webhooks/${webhook_id}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(pick(params, ['add_inbox_ids', 'remove_inbox_ids', 'add_pod_ids', 'remove_pod_ids'])),
      });

    case 'webhooks.delete':
      return agentmailFetch(`/webhooks/${webhook_id}`, credentials, { method: 'DELETE' });

    // --- Lists ---
    case 'lists.list':
      return agentmailFetch(
        `/lists/${params.direction}/${params.type}${buildQuery(params, ['limit', 'page_token'])}`,
        credentials,
      );

    case 'lists.get':
      return agentmailFetch(`/lists/${params.direction}/${params.type}/${encodeURIComponent(params.entry as string)}`, credentials);

    case 'lists.create':
      return agentmailFetch(`/lists/${params.direction}/${params.type}`, credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['entry', 'reason'])),
      });

    case 'lists.delete':
      return agentmailFetch(
        `/lists/${params.direction}/${params.type}/${encodeURIComponent(params.entry as string)}`,
        credentials,
        { method: 'DELETE' },
      );

    // --- API Keys ---
    case 'apiKeys.list':
      return agentmailFetch(`/api-keys${buildQuery(params, ['limit', 'page_token'])}`, credentials);

    case 'apiKeys.create':
      return agentmailFetch('/api-keys', credentials, {
        method: 'POST',
        body: JSON.stringify(pick(params, ['name', 'pod_id', 'inbox_id'])),
      });

    case 'apiKeys.delete':
      return agentmailFetch(`/api-keys/${api_key_id}`, credentials, { method: 'DELETE' });

    // --- Metrics ---
    case 'metrics.getOrg':
      return agentmailFetch(`/metrics${buildQuery(params, ['event_types', 'start', 'end', 'period', 'limit', 'descending'])}`, credentials);

    case 'metrics.getInbox':
      return agentmailFetch(
        `/inboxes/${inbox_id}/metrics${buildQuery(params, ['event_types', 'start', 'end', 'period', 'limit', 'descending'])}`,
        credentials,
      );

    // --- Organization ---
    case 'organization.get':
      return agentmailFetch('/organizations', credentials);

    default:
      throw new Error(`Unknown AgentMail method: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const k of keys) {
    if (obj[k] !== undefined) result[k] = obj[k];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resolvable ID types & resolver
// ---------------------------------------------------------------------------

const agentmailResolvableTypes: Record<string, ResolvableType> = {
  inbox_id: { label: 'Inbox' },
  message_id: { label: 'Message' },
  thread_id: { label: 'Thread' },
};

async function resolveAgentmailId(
  type: string,
  id: string,
  credentials: OAuthCredentials,
): Promise<ResolveResult | null> {
  const pathMap: Record<string, string> = {
    inbox_id: 'inboxes',
    message_id: 'messages',
    thread_id: 'threads',
  };
  const path = pathMap[type];
  if (!path) return null;

  try {
    const data: any = await agentmailFetch(`/${path}/${id}`, credentials);
    switch (type) {
      case 'inbox_id':
        return { title: data.display_name || data.email || id };
      case 'message_id':
        return { title: data.subject || '(no subject)' };
      case 'thread_id':
        return { title: data.subject || data.messages?.[0]?.subject || '(no subject)' };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

export const agentmailConnector: Connector = {
  service: 'agentmail',
  name: 'AgentMail',
  methods: allMethods,
  resolvableTypes: agentmailResolvableTypes,
  groupDescriptions: {
    messages: 'Send, receive, reply, forward messages',
    threads: 'List, get, and delete threads',
    inboxes: 'Create and manage inboxes',
    drafts: 'Create, edit, and send drafts',
    domains: 'Custom email domains — create, verify, DNS',
    pods: 'Isolated inbox groups',
    webhooks: 'Webhook endpoints for incoming mail events',
    lists: 'Allowlists and blocklists',
    apiKeys: 'API key management',
    metrics: 'Usage metrics for org and inbox',
    organization: 'Organization info and limits',
  },

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string,
  ): PermissionMetadata {
    const methodDef = allMethods.find((m) => m.name === method);
    if (!methodDef) throw new Error(`Unknown AgentMail method: ${method}`);
    return {
      service: 'agentmail',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeAgentmailRequest(method, params),
    };
  },

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials,
  ): Promise<unknown> {
    return executeAgentmail(method, params, credentials);
  },

  resolveId: resolveAgentmailId,

  help(method?: string): ServiceHelp {
    if (method) {
      const m = allMethods.find((md) => md.name === method);
      return { service: 'agentmail', name: 'AgentMail', methods: m ? [m] : [] };
    }
    return {
      service: 'agentmail',
      name: 'AgentMail',
      summary: 'Programmatic email for AI agents — inboxes, messages, threads, drafts, domains, and more',
      methods: allMethods,
    };
  },
};
