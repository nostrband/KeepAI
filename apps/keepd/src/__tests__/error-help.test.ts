import { describe, it, expect } from 'vitest';
import {
  renderMissingParams,
  renderUnknownService,
  renderUnknownMethod,
  renderInvalidParam,
  renderMultipleAccounts,
  fuzzyMatch,
} from '../error-help.js';
import type { ConnectorMethod, ParamSchema } from '@keepai/proto';

// --- fuzzyMatch ---

describe('fuzzyMatch', () => {
  const candidates = ['gmail', 'notion', 'slack', 'calendar'];

  it('matches exact input', () => {
    expect(fuzzyMatch('gmail', candidates)).toContain('gmail');
  });

  it('matches close typos', () => {
    expect(fuzzyMatch('gmal', candidates)).toContain('gmail');
    expect(fuzzyMatch('notin', candidates)).toContain('notion');
  });

  it('returns empty for distant input', () => {
    expect(fuzzyMatch('xxxxxxxx', candidates)).toEqual([]);
  });

  it('returns at most maxResults', () => {
    const result = fuzzyMatch('a', ['ab', 'ac', 'ad', 'ae'], 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('is case insensitive', () => {
    expect(fuzzyMatch('GMAIL', candidates)).toContain('gmail');
  });

  it('sorts by distance', () => {
    const result = fuzzyMatch('gmil', ['gmail', 'notion']);
    expect(result[0]).toBe('gmail');
  });
});

// --- renderMissingParams ---

describe('renderMissingParams', () => {
  const allParams: ParamSchema[] = [
    { name: 'to', type: 'string', required: true, description: 'Recipient' },
    { name: 'subject', type: 'string', required: true, description: 'Subject line' },
    { name: 'body', type: 'string', required: true, description: 'Email body' },
    { name: 'cc', type: 'string', required: false, description: 'CC recipients' },
  ];

  it('lists missing params', () => {
    const text = renderMissingParams('gmail', 'drafts.create', ['to', 'subject'], allParams);
    expect(text).toContain('missing required parameters: to, subject');
  });

  it('includes usage line with all required params', () => {
    const text = renderMissingParams('gmail', 'drafts.create', ['to'], allParams);
    expect(text).toContain('npx keepai run gmail drafts.create');
    expect(text).toContain('--to=<string>');
    expect(text).toContain('--subject=<string>');
    expect(text).toContain('--body=<string>');
    // Should NOT include optional params
    expect(text).not.toContain('--cc');
  });

  it('includes help hint', () => {
    const text = renderMissingParams('gmail', 'drafts.create', ['to'], allParams);
    expect(text).toContain("npx keepai help gmail drafts.create");
  });
});

// --- renderUnknownService ---

describe('renderUnknownService', () => {
  const available = [
    { service: 'gmail', summary: 'Email — read, send, draft, organize' },
    { service: 'notion', summary: 'Documents & databases' },
  ];

  it('shows the unknown service name', () => {
    const text = renderUnknownService('gmal', available);
    expect(text).toContain("unknown service 'gmal'");
  });

  it('shows fuzzy suggestions', () => {
    const text = renderUnknownService('gmal', available);
    expect(text).toContain('Did you mean?');
    expect(text).toContain('gmail');
  });

  it('shows summary alongside suggestion', () => {
    const text = renderUnknownService('gmal', available);
    expect(text).toContain('Email — read, send, draft, organize');
  });

  it('falls back to listing all services when no match', () => {
    const text = renderUnknownService('xxxxxxxxxxx', available);
    expect(text).toContain('Available services: gmail, notion');
  });

  it('includes help hint', () => {
    const text = renderUnknownService('gmal', available);
    expect(text).toContain("npx keepai help");
  });
});

// --- renderUnknownMethod ---

describe('renderUnknownMethod', () => {
  const methods: ConnectorMethod[] = [
    {
      name: 'drafts.create',
      description: 'Create a draft email',
      operationType: 'write',
      params: [],
      returns: 'Draft',
    },
    {
      name: 'drafts.list',
      description: 'List email drafts',
      operationType: 'read',
      params: [],
      returns: 'DraftList',
    },
    {
      name: 'messages.list',
      description: 'List messages',
      operationType: 'read',
      params: [],
      returns: 'MessageList',
    },
  ];

  it('shows the unknown method', () => {
    const text = renderUnknownMethod('gmail', 'draft.create', methods);
    expect(text).toContain("unknown method 'draft.create' on gmail");
  });

  it('shows fuzzy suggestions with descriptions', () => {
    const text = renderUnknownMethod('gmail', 'draft.create', methods);
    expect(text).toContain('Did you mean?');
    expect(text).toContain('drafts.create');
    expect(text).toContain('Create a draft email');
  });

  it('includes help hint', () => {
    const text = renderUnknownMethod('gmail', 'draft.create', methods);
    expect(text).toContain("npx keepai help gmail");
  });
});

// --- renderInvalidParam ---

describe('renderInvalidParam', () => {
  it('shows param name and expected type with string value', () => {
    const text = renderInvalidParam('gmail', 'messages.list', 'maxResults', 'number', 'abc');
    expect(text).toContain("'maxResults' must be a number, got 'abc'");
  });

  it('shows non-string values without quotes', () => {
    const text = renderInvalidParam('gmail', 'messages.list', 'maxResults', 'number', true);
    expect(text).toContain("got true");
  });

  it('includes help hint', () => {
    const text = renderInvalidParam('gmail', 'messages.list', 'maxResults', 'number', 'abc');
    expect(text).toContain("npx keepai help gmail messages.list");
  });
});

// --- renderMultipleAccounts ---

describe('renderMultipleAccounts', () => {
  const accounts = [
    { id: 'user@gmail.com' },
    { id: 'work@gmail.com', label: 'Work Account' },
  ];

  it('mentions the service name', () => {
    const text = renderMultipleAccounts('gmail', 'Gmail', 'messages.list', accounts);
    expect(text).toContain('multiple Gmail accounts available');
  });

  it('lists accounts with labels', () => {
    const text = renderMultipleAccounts('gmail', 'Gmail', 'messages.list', accounts);
    expect(text).toContain('user@gmail.com');
    expect(text).toContain('Work Account');
  });

  it('includes example with first account ID', () => {
    const text = renderMultipleAccounts('gmail', 'Gmail', 'messages.list', accounts);
    expect(text).toContain('--account=user@gmail.com');
  });

  it('includes service and method in example', () => {
    const text = renderMultipleAccounts('gmail', 'Gmail', 'messages.list', accounts);
    expect(text).toContain('npx keepai run gmail messages.list');
  });
});
