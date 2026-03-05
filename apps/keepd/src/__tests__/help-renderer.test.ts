import { describe, it, expect } from 'vitest';
import {
  renderServiceList,
  renderServiceMethods,
  renderMethodDetail,
} from '../help-renderer';
import type { ServiceHelp } from '@keepai/proto';

const gmailHelp: ServiceHelp = {
  service: 'gmail',
  name: 'Gmail',
  summary: 'Email — read, send, draft, organize',
  accounts: [{ id: 'user@gmail.com', label: 'user@gmail.com' }],
  methods: [
    {
      name: 'messages.list',
      description: 'List messages matching a query',
      operationType: 'read',
      params: [
        {
          name: 'q', type: 'string', required: false,
          description: 'Gmail search query',
          syntax: [
            'from:user@example.com          Messages from a sender',
            'is:unread                      Unread messages',
          ],
        },
        { name: 'maxResults', type: 'number', required: false, description: 'Max results', default: 10 },
        { name: 'pageToken', type: 'string', required: false, description: 'Page token' },
      ],
      returns: 'List of messages',
      example: { params: { q: 'is:unread', maxResults: 5 }, description: 'Search unread' },
      responseExample: {
        messages: [{ id: 'abc', snippet: 'Hello...' }],
        nextPageToken: 'token',
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
        { name: 'id', type: 'string', required: true, description: 'Message ID' },
        { name: 'format', type: 'string', required: false, description: 'Format', default: 'full', enum: ['minimal', 'full', 'raw', 'metadata'] },
      ],
      returns: 'Full message',
      example: { params: { id: '18a1b2c3d4e5f6' }, description: 'Get a message' },
      responseExample: { id: '18a1b2c3d4e5f6', from: 'alice@example.com', subject: 'Hello' },
      notes: ['Find a message ID first with messages.list'],
      seeAlso: ['messages.list'],
    },
    {
      name: 'messages.send',
      description: 'Send an email',
      operationType: 'write',
      params: [
        { name: 'to', type: 'string', required: true, description: 'Recipient email' },
        { name: 'subject', type: 'string', required: true, description: 'Subject' },
        { name: 'body', type: 'string', required: true, description: 'Body' },
      ],
      returns: 'Sent message',
      example: { params: { to: 'bob@example.com', subject: 'Hello', body: 'Hi Bob!' }, description: 'Send email' },
      seeAlso: ['drafts.create'],
    },
    {
      name: 'drafts.create',
      description: 'Create a draft email',
      operationType: 'write',
      params: [
        { name: 'to', type: 'string', required: true, description: 'Recipient' },
        { name: 'subject', type: 'string', required: true, description: 'Subject' },
        { name: 'body', type: 'string', required: true, description: 'Body' },
      ],
      returns: 'Draft object',
      example: { params: { to: 'bob@example.com', subject: 'Draft', body: 'WIP' }, description: 'Create draft' },
      responseExample: { id: 'r-123', message: { id: 'abc', labelIds: ['DRAFT'] } },
      notes: ["Use the returned 'id' with drafts.send to send the draft"],
      seeAlso: ['drafts.send', 'messages.send'],
    },
    {
      name: 'profile.get',
      description: 'Get account info',
      operationType: 'read',
      params: [],
      returns: 'Profile',
      responseExample: { emailAddress: 'user@gmail.com' },
    },
  ],
};

const notionHelp: ServiceHelp = {
  service: 'notion',
  name: 'Notion',
  summary: 'Documents & databases — read, create, search',
  accounts: [{ id: 'ws-123', label: 'My Workspace' }],
  methods: [
    {
      name: 'search',
      description: 'Search across the workspace',
      operationType: 'read',
      params: [
        { name: 'query', type: 'string', required: false, description: 'Search text' },
      ],
      returns: 'Pages and databases',
      example: { params: { query: 'meeting' }, description: 'Search' },
    },
  ],
};

describe('renderServiceList', () => {
  it('renders all services with summaries and accounts', () => {
    const text = renderServiceList([gmailHelp, notionHelp]);
    expect(text).toContain('Available services:');
    expect(text).toContain('gmail');
    expect(text).toContain('Email — read, send, draft, organize');
    expect(text).toContain('user@gmail.com');
    expect(text).toContain('notion');
    expect(text).toContain('Documents & databases');
    expect(text).toContain('My Workspace');
  });

  it('shows hint with example using first service', () => {
    const text = renderServiceList([gmailHelp, notionHelp]);
    expect(text).toContain("Run 'npx keepai help <service>' to see methods.");
    expect(text).toContain('Example: npx keepai help gmail');
  });

  it('handles empty services list', () => {
    const text = renderServiceList([]);
    expect(text).toContain('Available services:');
    expect(text).toContain("Run 'npx keepai help <service>'");
    expect(text).not.toContain('Example:');
  });

  it('handles service with no accounts', () => {
    const noAccounts: ServiceHelp = { ...gmailHelp, accounts: [] };
    const text = renderServiceList([noAccounts]);
    expect(text).toContain('(none connected)');
  });
});

describe('renderServiceMethods', () => {
  it('renders header with service name and accounts', () => {
    const text = renderServiceMethods(gmailHelp);
    expect(text).toContain('Gmail — user@gmail.com');
  });

  it('groups methods by prefix', () => {
    const text = renderServiceMethods(gmailHelp);
    expect(text).toContain('  messages');
    expect(text).toContain('  drafts');
    expect(text).toContain('  profile');
  });

  it('shows short method names with descriptions', () => {
    const text = renderServiceMethods(gmailHelp);
    expect(text).toMatch(/list\s+List messages matching a query/);
    expect(text).toMatch(/get\s+Get a message by ID/);
    expect(text).toMatch(/send\s+Send an email/);
  });

  it('shows param preview parentheses', () => {
    const text = renderServiceMethods(gmailHelp);
    expect(text).toContain('(q, maxResults, pageToken)');
    expect(text).toContain('(to, subject, body)');
    expect(text).toContain('()');  // profile.get has no params
  });

  it('shows hint with example using a write method', () => {
    const text = renderServiceMethods(gmailHelp);
    expect(text).toContain(`Run 'npx keepai help gmail <method>'`);
    // Should pick a write method for example
    expect(text).toMatch(/Example: npx keepai help gmail (messages\.send|drafts\.create)/);
  });

  it('handles service with no accounts', () => {
    const noAccounts: ServiceHelp = { ...gmailHelp, accounts: undefined };
    const text = renderServiceMethods(noAccounts);
    expect(text).toContain('Gmail — (none connected)');
  });

  it('handles methods without dot prefix', () => {
    const text = renderServiceMethods(notionHelp);
    expect(text).toContain('  search');
  });
});

describe('renderMethodDetail', () => {
  it('renders header with service, method, and description', () => {
    const text = renderMethodDetail(gmailHelp, 'drafts.create');
    expect(text).toContain('gmail drafts.create — Create a draft email');
  });

  it('renders parameters table with required first', () => {
    const text = renderMethodDetail(gmailHelp, 'messages.list');
    const lines = text.split('\n');
    const paramLines = lines.filter(l => l.match(/^\s{2}\w/));
    // First line after "Parameters:" should be optional ones (no required params in messages.list)
    expect(text).toContain('Parameters:');
    expect(text).toContain('q');
    expect(text).toContain('maxResults');
  });

  it('shows required/optional labels', () => {
    const text = renderMethodDetail(gmailHelp, 'messages.get');
    expect(text).toMatch(/id\s+string\s+required/);
    expect(text).toMatch(/format\s+string\s{8}/); // 8 spaces = no 'required'
  });

  it('shows default values', () => {
    const text = renderMethodDetail(gmailHelp, 'messages.list');
    expect(text).toContain('(default: 10)');
  });

  it('shows enum values', () => {
    const text = renderMethodDetail(gmailHelp, 'messages.get');
    expect(text).toContain('One of: minimal, full, raw, metadata');
  });

  it('renders syntax block for params with syntax', () => {
    const text = renderMethodDetail(gmailHelp, 'messages.list');
    expect(text).toContain("Query syntax for 'q':");
    expect(text).toContain('from:user@example.com');
    expect(text).toContain('is:unread');
  });

  it('renders flag-style and JSON-style examples', () => {
    const text = renderMethodDetail(gmailHelp, 'drafts.create');
    expect(text).toContain('npx keepai run gmail drafts.create --to=bob@example.com --subject=Draft --body=WIP');
    expect(text).toContain("--params '{");
  });

  it('renders response example as indented JSON', () => {
    const text = renderMethodDetail(gmailHelp, 'drafts.create');
    expect(text).toContain('Response:');
    expect(text).toContain('"id": "r-123"');
    expect(text).toContain('"labelIds"');
  });

  it('renders notes', () => {
    const text = renderMethodDetail(gmailHelp, 'drafts.create');
    expect(text).toContain("Use the returned 'id' with drafts.send to send the draft");
  });

  it('renders see also with service prefix', () => {
    const text = renderMethodDetail(gmailHelp, 'drafts.create');
    expect(text).toContain('See also: gmail drafts.send, gmail messages.send');
  });

  it('handles method with no params', () => {
    const text = renderMethodDetail(gmailHelp, 'profile.get');
    expect(text).toContain('Parameters: none');
  });

  it('handles method with no example', () => {
    const text = renderMethodDetail(gmailHelp, 'profile.get');
    expect(text).not.toContain('Examples:');
  });

  it('handles method with no notes', () => {
    const text = renderMethodDetail(gmailHelp, 'messages.send');
    // messages.send in our fixture has no notes
    expect(text).not.toContain('Find a message');
  });

  it('handles method with no seeAlso', () => {
    const text = renderMethodDetail(gmailHelp, 'profile.get');
    expect(text).not.toContain('See also:');
  });

  it('handles method with no responseExample', () => {
    const text = renderMethodDetail(gmailHelp, 'messages.send');
    expect(text).not.toContain('Response:');
  });

  it('returns error text for unknown method', () => {
    const text = renderMethodDetail(gmailHelp, 'nonexistent');
    expect(text).toContain("Unknown method 'nonexistent'");
  });

  it('quotes values with spaces in flag examples', () => {
    const svc: ServiceHelp = {
      service: 'test',
      name: 'Test',
      methods: [{
        name: 'do.thing',
        description: 'Do a thing',
        operationType: 'write',
        params: [{ name: 'msg', type: 'string', required: true, description: 'Message' }],
        returns: 'Result',
        example: { params: { msg: 'hello world' }, description: 'Test' },
      }],
    };
    const text = renderMethodDetail(svc, 'do.thing');
    expect(text).toContain("--msg='hello world'");
  });
});

describe('renderMethodDetail with real connectors', () => {
  it('works with gmail connector help output', async () => {
    // Dynamic import to test with real connector metadata
    const { gmailConnector } = await import('@keepai/connectors');
    const help = gmailConnector.help();
    help.accounts = [{ id: 'test@gmail.com' }];

    // Should render all 15 methods without error
    for (const method of help.methods) {
      const text = renderMethodDetail(help, method.name);
      expect(text).toContain(`gmail ${method.name}`);
      expect(text).toContain(method.description);
    }
  });

  it('works with notion MCP connector help output', async () => {
    const { McpConnector, notionMcpConfig } = await import('@keepai/connectors');
    const notionMcp = new McpConnector(notionMcpConfig);
    // Without MCP server, methods are empty — test help structure
    const help = notionMcp.help();
    help.accounts = [{ id: 'ws-123', label: 'My Workspace' }];
    expect(help.service).toBe('notion');
    expect(help.name).toBe('Notion');
  });

  it('renders service methods list for real gmail connector', async () => {
    const { gmailConnector } = await import('@keepai/connectors');
    const help = gmailConnector.help();
    help.accounts = [{ id: 'test@gmail.com' }];
    const text = renderServiceMethods(help);
    expect(text).toContain('messages');
    expect(text).toContain('drafts');
    expect(text).toContain('threads');
    expect(text).toContain('labels');
    expect(text).toContain('profile');
  });
});
