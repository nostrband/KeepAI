/**
 * Trello connector — 42 methods covering boards, lists, cards, comments,
 * labels, checklists, check items, attachments, members, search, and webhooks.
 *
 * Authentication: Trello API key + user token passed as query params.
 * The API key comes from build-time credentials; the user token is the OAuth access token.
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';
import { getTrelloCredentials } from '../credentials.js';

const TRELLO_API = 'https://api.trello.com/1';

function trelloAuth(): string {
  const { clientId: apiKey } = getTrelloCredentials();
  return apiKey;
}

async function trelloFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit & { query?: Record<string, string> } = {}
): Promise<unknown> {
  const { query = {}, ...fetchOptions } = options;
  const params = new URLSearchParams({
    key: trelloAuth(),
    token: credentials.accessToken,
    ...query,
  });
  const separator = path.includes('?') ? '&' : '?';
  const url = `${TRELLO_API}${path}${separator}${params.toString()}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Trello API error ${response.status}: ${text}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true };
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Human-readable request descriptions
// ---------------------------------------------------------------------------

function describeTrelloRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'members.me':
      return 'Get current Trello user profile';
    case 'search':
      return params.query ? `Search Trello: "${params.query}"` : 'Search Trello';

    // Boards
    case 'boards.list':
      return 'List your Trello boards';
    case 'boards.get':
      return `Get board ${params.id || '(unknown)'}`;
    case 'boards.create':
      return `Create board "${params.name || '(unnamed)'}"`;
    case 'boards.update':
      return `Update board ${params.id || '(unknown)'}`;
    case 'boards.delete':
      return `Delete board ${params.id || '(unknown)'}`;
    case 'boards.members':
      return `List members of board ${params.id || '(unknown)'}`;

    // Lists
    case 'lists.get':
      return `Get list ${params.id || '(unknown)'}`;
    case 'lists.create':
      return `Create list "${params.name || '(unnamed)'}" on board ${params.idBoard || '(unknown)'}`;
    case 'lists.update':
      return `Update list ${params.id || '(unknown)'}`;
    case 'lists.archive':
      return `Archive list ${params.id || '(unknown)'}`;
    case 'lists.unarchive':
      return `Unarchive list ${params.id || '(unknown)'}`;

    // Cards
    case 'cards.list':
      return `Get cards on board ${params.boardId || '(unknown)'}`;
    case 'cards.listByList':
      return `Get cards in list ${params.listId || '(unknown)'}`;
    case 'cards.get':
      return `Get card ${params.id || '(unknown)'}`;
    case 'cards.create':
      return `Create card "${params.name || '(unnamed)'}" in list ${params.idList || '(unknown)'}`;
    case 'cards.update':
      return `Update card ${params.id || '(unknown)'}`;
    case 'cards.delete':
      return `Delete card ${params.id || '(unknown)'}`;
    case 'cards.addMember':
      return `Assign member to card ${params.id || '(unknown)'}`;
    case 'cards.removeMember':
      return `Remove member from card ${params.id || '(unknown)'}`;
    case 'cards.addLabel':
      return `Add label to card ${params.id || '(unknown)'}`;
    case 'cards.removeLabel':
      return `Remove label from card ${params.id || '(unknown)'}`;

    // Comments
    case 'comments.list':
      return `List comments on card ${params.cardId || '(unknown)'}`;
    case 'comments.create':
      return `Add comment to card ${params.cardId || '(unknown)'}`;
    case 'comments.update':
      return `Update comment ${params.id || '(unknown)'}`;
    case 'comments.delete':
      return `Delete comment ${params.id || '(unknown)'}`;

    // Labels
    case 'labels.list':
      return `List labels on board ${params.boardId || '(unknown)'}`;
    case 'labels.create':
      return `Create label "${params.name || '(unnamed)'}"`;
    case 'labels.update':
      return `Update label ${params.id || '(unknown)'}`;
    case 'labels.delete':
      return `Delete label ${params.id || '(unknown)'}`;

    // Checklists
    case 'checklists.get':
      return `Get checklist ${params.id || '(unknown)'}`;
    case 'checklists.create':
      return `Create checklist "${params.name || '(unnamed)'}" on card ${params.idCard || '(unknown)'}`;
    case 'checklists.delete':
      return `Delete checklist ${params.id || '(unknown)'}`;
    case 'checkItems.create':
      return `Add check item "${params.name || '(unnamed)'}" to checklist ${params.checklistId || '(unknown)'}`;
    case 'checkItems.update':
      return `Update check item ${params.idCheckItem || '(unknown)'}`;
    case 'checkItems.delete':
      return `Delete check item ${params.idCheckItem || '(unknown)'}`;

    // Attachments
    case 'attachments.list':
      return `List attachments on card ${params.cardId || '(unknown)'}`;
    case 'attachments.create':
      return `Add attachment to card ${params.cardId || '(unknown)'}`;
    case 'attachments.delete':
      return `Delete attachment ${params.attachmentId || '(unknown)'}`;

    // Webhooks
    case 'webhooks.create':
      return `Create webhook for model ${params.idModel || '(unknown)'}`;
    case 'webhooks.get':
      return `Get webhook ${params.id || '(unknown)'}`;
    case 'webhooks.delete':
      return `Delete webhook ${params.id || '(unknown)'}`;

    default:
      return `Trello ${method}`;
  }
}

// ---------------------------------------------------------------------------
// Resource type extraction
// ---------------------------------------------------------------------------

function getResourceType(method: string): string | undefined {
  const [resource] = method.split('.');
  switch (resource) {
    case 'boards': return 'board';
    case 'lists': return 'list';
    case 'cards': return 'card';
    case 'comments': return 'comment';
    case 'labels': return 'label';
    case 'checklists': return 'checklist';
    case 'checkItems': return 'checkItem';
    case 'attachments': return 'attachment';
    case 'webhooks': return 'webhook';
    case 'members': return 'member';
    case 'search': return 'search';
    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Search syntax reference
// ---------------------------------------------------------------------------

const TRELLO_SEARCH_SYNTAX: string[] = [
  '@me                            Cards assigned to you',
  '#labelName                     Cards with a label',
  'board:name                     Cards on a specific board',
  'list:name                      Cards in a specific list',
  'is:open / is:archived          Filter by card state',
  'has:attachments                Cards with attachments',
  'has:description                Cards with a description',
  'due:day / due:week / due:month Cards due within timeframe',
  'created:day / created:week     Recently created cards',
  'edited:day / edited:week       Recently edited cards',
  'description:"text"             Search in card descriptions',
  'comment:"text"                 Search in comments',
  'checklist:"text"               Search in checklist items',
  'name:"text"                    Search in card names',
  'Combine terms with spaces (AND). Use OR for alternatives.',
];

const LABEL_COLORS: string[] = [
  'green', 'yellow', 'orange', 'red', 'purple', 'blue',
  'sky', 'lime', 'pink', 'black', 'null (no color)',
];

// ---------------------------------------------------------------------------
// Method definitions
// ---------------------------------------------------------------------------

const methods: ConnectorMethod[] = [
  // ---- Members ----
  {
    name: 'members.me',
    description: 'Get the authenticated user\'s Trello profile',
    operationType: 'read',
    params: [],
    returns: 'Member object with id, username, fullName, email, url',
    example: { params: {}, description: 'Get your Trello profile' },
    responseExample: {
      id: '5a1b2c3d4e5f6a7b8c9d0e1f',
      username: 'johndoe',
      fullName: 'John Doe',
      email: 'john@example.com',
      url: 'https://trello.com/johndoe',
    },
    seeAlso: ['boards.list'],
  },

  // ---- Search ----
  {
    name: 'search',
    description: 'Search across boards, cards, members, and organizations',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query', syntax: TRELLO_SEARCH_SYNTAX },
      { name: 'modelTypes', type: 'string', required: false, description: 'Comma-separated model types to search', default: 'cards', enum: ['actions', 'boards', 'cards', 'members', 'organizations'] },
      { name: 'idBoards', type: 'string', required: false, description: 'Comma-separated board IDs to restrict search to' },
      { name: 'idOrganizations', type: 'string', required: false, description: 'Comma-separated organization IDs to restrict search to' },
      { name: 'cards_limit', type: 'number', required: false, description: 'Max cards to return (max 1000)', default: 10 },
      { name: 'boards_limit', type: 'number', required: false, description: 'Max boards to return (max 1000)', default: 10 },
      { name: 'partial', type: 'boolean', required: false, description: 'Enable partial word matching' },
    ],
    returns: 'Object with arrays of matching cards, boards, members, and organizations',
    example: { params: { query: 'bug fix', modelTypes: 'cards', cards_limit: 5 }, description: 'Search for cards about bug fixes' },
    responseExample: {
      cards: [
        { id: 'card123', name: 'Fix login bug', desc: 'Users cannot log in...', idBoard: 'board456', idList: 'list789' },
      ],
      boards: [],
    },
    notes: [
      'Default model type is "cards" if not specified',
      'Use idBoards to scope the search to specific boards',
    ],
    seeAlso: ['cards.get', 'boards.list'],
  },

  // ---- Boards ----
  {
    name: 'boards.list',
    description: 'List the authenticated user\'s boards',
    operationType: 'read',
    params: [
      { name: 'filter', type: 'string', required: false, description: 'Filter boards', default: 'all', enum: ['all', 'open', 'closed', 'members', 'organization', 'public', 'starred'] },
      { name: 'fields', type: 'string', required: false, description: 'Comma-separated board fields to include', default: 'name,desc,closed,idOrganization,url,shortUrl' },
    ],
    returns: 'Array of board objects',
    example: { params: { filter: 'open' }, description: 'List all open boards' },
    responseExample: [
      { id: 'board123', name: 'Project Alpha', desc: 'Main project board', closed: false, url: 'https://trello.com/b/abc/project-alpha' },
    ],
    seeAlso: ['boards.get', 'boards.create'],
  },
  {
    name: 'boards.get',
    description: 'Get a board by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Board ID' },
      { name: 'fields', type: 'string', required: false, description: 'Comma-separated fields to include', default: 'name,desc,closed,idOrganization,url,shortUrl' },
      { name: 'lists', type: 'string', required: false, description: 'Include lists', enum: ['all', 'closed', 'none', 'open'] },
      { name: 'cards', type: 'string', required: false, description: 'Include cards', enum: ['all', 'closed', 'none', 'open', 'visible'] },
      { name: 'members', type: 'string', required: false, description: 'Include members', enum: ['none', 'all'] },
      { name: 'labels', type: 'string', required: false, description: 'Include labels', enum: ['all', 'none'] },
    ],
    returns: 'Board object with optional nested lists, cards, members, and labels',
    example: { params: { id: 'board123', lists: 'open' }, description: 'Get a board with its open lists' },
    responseExample: {
      id: 'board123',
      name: 'Project Alpha',
      desc: 'Main project board',
      closed: false,
      url: 'https://trello.com/b/abc/project-alpha',
      lists: [
        { id: 'list1', name: 'To Do', closed: false, pos: 1 },
        { id: 'list2', name: 'In Progress', closed: false, pos: 2 },
      ],
    },
    seeAlso: ['boards.list', 'lists.create', 'cards.list'],
  },
  {
    name: 'boards.create',
    description: 'Create a new board',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Board name' },
      { name: 'desc', type: 'string', required: false, description: 'Board description' },
      { name: 'idOrganization', type: 'string', required: false, description: 'Organization (workspace) ID to create the board in' },
      { name: 'defaultLists', type: 'boolean', required: false, description: 'Create default lists (To Do, Doing, Done)', default: true },
      { name: 'prefs_permissionLevel', type: 'string', required: false, description: 'Permission level', default: 'private', enum: ['private', 'org', 'public'] },
    ],
    returns: 'Created board object',
    example: { params: { name: 'Sprint Board', desc: 'Sprint 42 tasks' }, description: 'Create a new board' },
    responseExample: { id: 'newboard123', name: 'Sprint Board', desc: 'Sprint 42 tasks', url: 'https://trello.com/b/xyz/sprint-board' },
    seeAlso: ['boards.list', 'boards.update', 'lists.create'],
  },
  {
    name: 'boards.update',
    description: 'Update a board\'s name, description, or settings',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Board ID' },
      { name: 'name', type: 'string', required: false, description: 'New board name' },
      { name: 'desc', type: 'string', required: false, description: 'New board description' },
      { name: 'closed', type: 'boolean', required: false, description: 'Archive (true) or unarchive (false) the board' },
      { name: 'prefs/permissionLevel', type: 'string', required: false, description: 'Permission level', enum: ['private', 'org', 'public'] },
    ],
    returns: 'Updated board object',
    example: { params: { id: 'board123', name: 'Project Alpha v2' }, description: 'Rename a board' },
    seeAlso: ['boards.get', 'boards.delete'],
  },
  {
    name: 'boards.delete',
    description: 'Permanently delete a board (cannot be undone)',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Board ID to delete' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'board123' }, description: 'Delete a board' },
    notes: [
      'This is irreversible — the board and all its content are permanently deleted',
      'Consider archiving the board instead: boards.update with closed=true',
    ],
    seeAlso: ['boards.update'],
  },
  {
    name: 'boards.members',
    description: 'List members of a board',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Board ID' },
    ],
    returns: 'Array of member objects with id, username, fullName',
    example: { params: { id: 'board123' }, description: 'List board members' },
    responseExample: [
      { id: 'mem1', username: 'alice', fullName: 'Alice Smith' },
      { id: 'mem2', username: 'bob', fullName: 'Bob Jones' },
    ],
    seeAlso: ['boards.get', 'cards.addMember'],
  },

  // ---- Lists ----
  {
    name: 'lists.get',
    description: 'Get a list by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID' },
      { name: 'fields', type: 'string', required: false, description: 'Comma-separated fields', default: 'name,closed,idBoard,pos' },
    ],
    returns: 'List object',
    example: { params: { id: 'list123' }, description: 'Get a list' },
    responseExample: { id: 'list123', name: 'To Do', closed: false, idBoard: 'board123', pos: 1 },
    seeAlso: ['cards.listByList', 'lists.update'],
  },
  {
    name: 'lists.create',
    description: 'Create a new list on a board',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'List name' },
      { name: 'idBoard', type: 'string', required: true, description: 'Board ID to create the list on' },
      { name: 'pos', type: 'string', required: false, description: 'Position: "top", "bottom", or a positive number' },
    ],
    returns: 'Created list object',
    example: { params: { name: 'Code Review', idBoard: 'board123', pos: 'bottom' }, description: 'Add a new list to a board' },
    responseExample: { id: 'newlist123', name: 'Code Review', closed: false, idBoard: 'board123', pos: 65536 },
    seeAlso: ['boards.get', 'lists.update', 'cards.create'],
  },
  {
    name: 'lists.update',
    description: 'Update a list\'s name or position',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID' },
      { name: 'name', type: 'string', required: false, description: 'New list name' },
      { name: 'pos', type: 'string', required: false, description: 'Position: "top", "bottom", or a positive number' },
    ],
    returns: 'Updated list object',
    example: { params: { id: 'list123', name: 'Done' }, description: 'Rename a list' },
    seeAlso: ['lists.get', 'lists.archive'],
  },
  {
    name: 'lists.archive',
    description: 'Archive (close) a list',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID to archive' },
    ],
    returns: 'Updated list object with closed=true',
    example: { params: { id: 'list123' }, description: 'Archive a list' },
    notes: ['Lists cannot be permanently deleted in Trello, only archived'],
    seeAlso: ['lists.unarchive', 'lists.get'],
  },
  {
    name: 'lists.unarchive',
    description: 'Unarchive (reopen) a list',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID to unarchive' },
    ],
    returns: 'Updated list object with closed=false',
    example: { params: { id: 'list123' }, description: 'Unarchive a list' },
    seeAlso: ['lists.archive', 'lists.get'],
  },

  // ---- Cards ----
  {
    name: 'cards.list',
    description: 'Get cards on a board',
    operationType: 'read',
    params: [
      { name: 'boardId', type: 'string', required: true, description: 'Board ID' },
      { name: 'filter', type: 'string', required: false, description: 'Card filter', default: 'open', enum: ['all', 'closed', 'open', 'visible'] },
      { name: 'fields', type: 'string', required: false, description: 'Comma-separated card fields', default: 'name,desc,closed,idList,idMembers,idLabels,due,url,shortUrl' },
    ],
    returns: 'Array of card objects',
    example: { params: { boardId: 'board123', filter: 'open' }, description: 'Get all open cards on a board' },
    responseExample: [
      { id: 'card1', name: 'Fix login bug', desc: 'Users cannot log in', idList: 'list1', due: '2024-03-15T12:00:00.000Z' },
    ],
    seeAlso: ['cards.listByList', 'cards.get', 'cards.create'],
  },
  {
    name: 'cards.listByList',
    description: 'Get cards in a specific list',
    operationType: 'read',
    params: [
      { name: 'listId', type: 'string', required: true, description: 'List ID' },
      { name: 'fields', type: 'string', required: false, description: 'Comma-separated card fields', default: 'name,desc,closed,idList,idMembers,idLabels,due,url,shortUrl' },
    ],
    returns: 'Array of card objects in the list',
    example: { params: { listId: 'list123' }, description: 'Get cards in the "To Do" list' },
    seeAlso: ['cards.list', 'cards.get', 'lists.get'],
  },
  {
    name: 'cards.get',
    description: 'Get a card with full details',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Card ID' },
      { name: 'fields', type: 'string', required: false, description: 'Comma-separated fields', default: 'name,desc,closed,idList,idBoard,idMembers,idLabels,due,dueComplete,url,shortUrl,pos' },
      { name: 'checklists', type: 'string', required: false, description: 'Include checklists', enum: ['all', 'none'] },
      { name: 'members', type: 'boolean', required: false, description: 'Include member objects' },
      { name: 'attachments', type: 'string', required: false, description: 'Include attachments', enum: ['true', 'false', 'cover'] },
    ],
    returns: 'Card object with optional nested checklists, members, and attachments',
    example: { params: { id: 'card123', checklists: 'all', members: true }, description: 'Get full card details' },
    responseExample: {
      id: 'card123',
      name: 'Fix login bug',
      desc: 'Users cannot log in on mobile',
      idList: 'list1',
      idBoard: 'board123',
      due: '2024-03-15T12:00:00.000Z',
      dueComplete: false,
      url: 'https://trello.com/c/abc/1-fix-login-bug',
      checklists: [
        { id: 'cl1', name: 'Steps', checkItems: [{ id: 'ci1', name: 'Reproduce', state: 'complete' }] },
      ],
    },
    seeAlso: ['cards.list', 'cards.update', 'comments.list', 'checklists.get'],
  },
  {
    name: 'cards.create',
    description: 'Create a new card',
    operationType: 'write',
    params: [
      { name: 'idList', type: 'string', required: true, description: 'List ID to create the card in' },
      { name: 'name', type: 'string', required: true, description: 'Card name' },
      { name: 'desc', type: 'string', required: false, description: 'Card description (Markdown supported)' },
      { name: 'pos', type: 'string', required: false, description: 'Position: "top", "bottom", or a positive number' },
      { name: 'due', type: 'string', required: false, description: 'Due date (ISO 8601 format)' },
      { name: 'start', type: 'string', required: false, description: 'Start date (ISO 8601 format)' },
      { name: 'idMembers', type: 'string', required: false, description: 'Comma-separated member IDs to assign' },
      { name: 'idLabels', type: 'string', required: false, description: 'Comma-separated label IDs to apply' },
      { name: 'urlSource', type: 'string', required: false, description: 'URL to attach to the card' },
    ],
    returns: 'Created card object',
    example: { params: { idList: 'list123', name: 'Implement OAuth', desc: 'Add OAuth 2.0 support', due: '2024-04-01T00:00:00.000Z' }, description: 'Create a card with a due date' },
    responseExample: {
      id: 'newcard123',
      name: 'Implement OAuth',
      idList: 'list123',
      url: 'https://trello.com/c/xyz/2-implement-oauth',
    },
    seeAlso: ['cards.list', 'cards.update', 'cards.addLabel', 'cards.addMember'],
  },
  {
    name: 'cards.update',
    description: 'Update a card (name, description, due date, move to different list)',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Card ID' },
      { name: 'name', type: 'string', required: false, description: 'New card name' },
      { name: 'desc', type: 'string', required: false, description: 'New description (Markdown supported)' },
      { name: 'closed', type: 'boolean', required: false, description: 'Archive (true) or unarchive (false) the card' },
      { name: 'idList', type: 'string', required: false, description: 'List ID to move the card to' },
      { name: 'idBoard', type: 'string', required: false, description: 'Board ID to move the card to (cross-board move)' },
      { name: 'pos', type: 'string', required: false, description: 'Position: "top", "bottom", or a positive number' },
      { name: 'due', type: 'string', required: false, description: 'Due date (ISO 8601), or null to remove' },
      { name: 'start', type: 'string', required: false, description: 'Start date (ISO 8601), or null to remove' },
      { name: 'dueComplete', type: 'boolean', required: false, description: 'Mark due date as complete' },
      { name: 'idMembers', type: 'string', required: false, description: 'Comma-separated member IDs (replaces all current members)' },
      { name: 'idLabels', type: 'string', required: false, description: 'Comma-separated label IDs (replaces all current labels)' },
    ],
    returns: 'Updated card object',
    example: { params: { id: 'card123', idList: 'list456', dueComplete: true }, description: 'Move a card to another list and mark it done' },
    notes: [
      'To move a card between lists, set idList to the target list ID',
      'To move between boards, set both idBoard and idList',
      'Setting idMembers or idLabels replaces all current values — use cards.addMember/cards.addLabel to add without replacing',
    ],
    seeAlso: ['cards.get', 'cards.addMember', 'cards.addLabel'],
  },
  {
    name: 'cards.delete',
    description: 'Permanently delete a card (cannot be undone)',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Card ID to delete' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'card123' }, description: 'Delete a card' },
    notes: [
      'This is irreversible — consider archiving instead: cards.update with closed=true',
    ],
    seeAlso: ['cards.update'],
  },
  {
    name: 'cards.addMember',
    description: 'Assign a member to a card',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Card ID' },
      { name: 'value', type: 'string', required: true, description: 'Member ID to assign' },
    ],
    returns: 'Array of member IDs on the card',
    example: { params: { id: 'card123', value: 'mem456' }, description: 'Assign a member to a card' },
    notes: ['Use boards.members to find member IDs'],
    seeAlso: ['cards.removeMember', 'boards.members'],
  },
  {
    name: 'cards.removeMember',
    description: 'Remove a member from a card',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Card ID' },
      { name: 'idMember', type: 'string', required: true, description: 'Member ID to remove' },
    ],
    returns: 'Updated card object',
    example: { params: { id: 'card123', idMember: 'mem456' }, description: 'Remove a member from a card' },
    seeAlso: ['cards.addMember'],
  },
  {
    name: 'cards.addLabel',
    description: 'Add a label to a card',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Card ID' },
      { name: 'value', type: 'string', required: true, description: 'Label ID to add' },
    ],
    returns: 'Array of label IDs on the card',
    example: { params: { id: 'card123', value: 'label789' }, description: 'Add a label to a card' },
    notes: ['Use labels.list to find available label IDs for the board'],
    seeAlso: ['cards.removeLabel', 'labels.list', 'labels.create'],
  },
  {
    name: 'cards.removeLabel',
    description: 'Remove a label from a card',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Card ID' },
      { name: 'idLabel', type: 'string', required: true, description: 'Label ID to remove' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'card123', idLabel: 'label789' }, description: 'Remove a label from a card' },
    seeAlso: ['cards.addLabel', 'labels.list'],
  },

  // ---- Comments ----
  {
    name: 'comments.list',
    description: 'List comments and activity on a card',
    operationType: 'read',
    params: [
      { name: 'cardId', type: 'string', required: true, description: 'Card ID' },
      { name: 'filter', type: 'string', required: false, description: 'Action type filter', default: 'commentCard' },
    ],
    returns: 'Array of action objects with comment text, author, and date',
    example: { params: { cardId: 'card123' }, description: 'Get comments on a card' },
    responseExample: [
      {
        id: 'action1',
        type: 'commentCard',
        date: '2024-03-10T14:30:00.000Z',
        memberCreator: { id: 'mem1', username: 'alice', fullName: 'Alice Smith' },
        data: { text: 'Looks good, ready for review!' },
      },
    ],
    seeAlso: ['comments.create', 'cards.get'],
  },
  {
    name: 'comments.create',
    description: 'Add a comment to a card',
    operationType: 'write',
    params: [
      { name: 'cardId', type: 'string', required: true, description: 'Card ID' },
      { name: 'text', type: 'string', required: true, description: 'Comment text' },
    ],
    returns: 'Created action object',
    example: { params: { cardId: 'card123', text: 'Started working on this.' }, description: 'Add a comment' },
    responseExample: {
      id: 'action2',
      type: 'commentCard',
      date: '2024-03-10T15:00:00.000Z',
      data: { text: 'Started working on this.' },
    },
    seeAlso: ['comments.list', 'comments.update'],
  },
  {
    name: 'comments.update',
    description: 'Update a comment\'s text',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Action (comment) ID' },
      { name: 'text', type: 'string', required: true, description: 'New comment text' },
    ],
    returns: 'Updated action object',
    example: { params: { id: 'action1', text: 'Updated: Ready for review!' }, description: 'Edit a comment' },
    seeAlso: ['comments.list', 'comments.delete'],
  },
  {
    name: 'comments.delete',
    description: 'Delete a comment',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Action (comment) ID' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'action1' }, description: 'Delete a comment' },
    seeAlso: ['comments.list', 'comments.create'],
  },

  // ---- Labels ----
  {
    name: 'labels.list',
    description: 'List labels on a board',
    operationType: 'read',
    params: [
      { name: 'boardId', type: 'string', required: true, description: 'Board ID' },
    ],
    returns: 'Array of label objects with id, name, color',
    example: { params: { boardId: 'board123' }, description: 'List labels on a board' },
    responseExample: [
      { id: 'label1', name: 'Bug', color: 'red' },
      { id: 'label2', name: 'Feature', color: 'green' },
    ],
    seeAlso: ['labels.create', 'cards.addLabel'],
  },
  {
    name: 'labels.create',
    description: 'Create a label on a board',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Label name' },
      { name: 'color', type: 'string', required: true, description: 'Label color', enum: LABEL_COLORS },
      { name: 'idBoard', type: 'string', required: true, description: 'Board ID' },
    ],
    returns: 'Created label object',
    example: { params: { name: 'Urgent', color: 'red', idBoard: 'board123' }, description: 'Create a red "Urgent" label' },
    responseExample: { id: 'newlabel123', name: 'Urgent', color: 'red', idBoard: 'board123' },
    seeAlso: ['labels.list', 'cards.addLabel'],
  },
  {
    name: 'labels.update',
    description: 'Update a label\'s name or color',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Label ID' },
      { name: 'name', type: 'string', required: false, description: 'New label name' },
      { name: 'color', type: 'string', required: false, description: 'New label color', enum: LABEL_COLORS },
    ],
    returns: 'Updated label object',
    example: { params: { id: 'label1', name: 'Critical', color: 'orange' }, description: 'Rename and recolor a label' },
    seeAlso: ['labels.list', 'labels.delete'],
  },
  {
    name: 'labels.delete',
    description: 'Delete a label',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Label ID to delete' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'label1' }, description: 'Delete a label' },
    notes: ['This removes the label from all cards that use it'],
    seeAlso: ['labels.list', 'labels.create'],
  },

  // ---- Checklists ----
  {
    name: 'checklists.get',
    description: 'Get a checklist by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Checklist ID' },
      { name: 'fields', type: 'string', required: false, description: 'Comma-separated fields', default: 'name,idBoard,idCard,pos' },
      { name: 'checkItems', type: 'string', required: false, description: 'Include check items', default: 'all', enum: ['all', 'none'] },
    ],
    returns: 'Checklist object with check items',
    example: { params: { id: 'cl123' }, description: 'Get a checklist with its items' },
    responseExample: {
      id: 'cl123',
      name: 'Deployment Steps',
      idCard: 'card123',
      checkItems: [
        { id: 'ci1', name: 'Run tests', state: 'complete', pos: 1 },
        { id: 'ci2', name: 'Deploy to staging', state: 'incomplete', pos: 2 },
      ],
    },
    seeAlso: ['checklists.create', 'checkItems.create', 'checkItems.update'],
  },
  {
    name: 'checklists.create',
    description: 'Create a checklist on a card',
    operationType: 'write',
    params: [
      { name: 'idCard', type: 'string', required: true, description: 'Card ID to add the checklist to' },
      { name: 'name', type: 'string', required: true, description: 'Checklist name' },
      { name: 'pos', type: 'string', required: false, description: 'Position: "top", "bottom", or a positive number' },
    ],
    returns: 'Created checklist object',
    example: { params: { idCard: 'card123', name: 'QA Checklist' }, description: 'Add a checklist to a card' },
    responseExample: { id: 'newcl123', name: 'QA Checklist', idCard: 'card123', checkItems: [] },
    seeAlso: ['checklists.get', 'checkItems.create', 'checklists.delete'],
  },
  {
    name: 'checklists.delete',
    description: 'Delete a checklist',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Checklist ID to delete' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'cl123' }, description: 'Delete a checklist' },
    notes: ['This also deletes all check items in the checklist'],
    seeAlso: ['checklists.create', 'checklists.get'],
  },

  // ---- Check Items ----
  {
    name: 'checkItems.create',
    description: 'Add an item to a checklist',
    operationType: 'write',
    params: [
      { name: 'checklistId', type: 'string', required: true, description: 'Checklist ID' },
      { name: 'name', type: 'string', required: true, description: 'Check item name' },
      { name: 'pos', type: 'string', required: false, description: 'Position: "top", "bottom", or a positive number' },
      { name: 'checked', type: 'boolean', required: false, description: 'Initial checked state', default: false },
    ],
    returns: 'Created check item object',
    example: { params: { checklistId: 'cl123', name: 'Write unit tests' }, description: 'Add an item to a checklist' },
    responseExample: { id: 'newci123', name: 'Write unit tests', state: 'incomplete', pos: 3 },
    seeAlso: ['checklists.get', 'checkItems.update', 'checkItems.delete'],
  },
  {
    name: 'checkItems.update',
    description: 'Update a check item (name, state, or position)',
    operationType: 'write',
    params: [
      { name: 'cardId', type: 'string', required: true, description: 'Card ID containing the check item' },
      { name: 'idCheckItem', type: 'string', required: true, description: 'Check item ID' },
      { name: 'name', type: 'string', required: false, description: 'New name' },
      { name: 'state', type: 'string', required: false, description: 'New state', enum: ['complete', 'incomplete'] },
      { name: 'pos', type: 'string', required: false, description: 'Position: "top", "bottom", or a positive number' },
    ],
    returns: 'Updated check item object',
    example: { params: { cardId: 'card123', idCheckItem: 'ci1', state: 'complete' }, description: 'Mark a check item as done' },
    notes: ['Use state "complete" / "incomplete" to toggle check items'],
    seeAlso: ['checklists.get', 'checkItems.create', 'checkItems.delete'],
  },
  {
    name: 'checkItems.delete',
    description: 'Delete a check item',
    operationType: 'delete',
    params: [
      { name: 'cardId', type: 'string', required: true, description: 'Card ID containing the check item' },
      { name: 'idCheckItem', type: 'string', required: true, description: 'Check item ID to delete' },
    ],
    returns: 'Empty success response',
    example: { params: { cardId: 'card123', idCheckItem: 'ci1' }, description: 'Delete a check item' },
    seeAlso: ['checkItems.create', 'checklists.get'],
  },

  // ---- Attachments ----
  {
    name: 'attachments.list',
    description: 'List attachments on a card',
    operationType: 'read',
    params: [
      { name: 'cardId', type: 'string', required: true, description: 'Card ID' },
    ],
    returns: 'Array of attachment objects',
    example: { params: { cardId: 'card123' }, description: 'List card attachments' },
    responseExample: [
      { id: 'att1', name: 'screenshot.png', url: 'https://trello.com/...', bytes: 45678, date: '2024-03-10T12:00:00.000Z' },
    ],
    seeAlso: ['attachments.create', 'attachments.delete'],
  },
  {
    name: 'attachments.create',
    description: 'Add a URL attachment to a card',
    operationType: 'write',
    params: [
      { name: 'cardId', type: 'string', required: true, description: 'Card ID' },
      { name: 'url', type: 'string', required: true, description: 'URL to attach' },
      { name: 'name', type: 'string', required: false, description: 'Attachment name (defaults to URL)' },
    ],
    returns: 'Created attachment object',
    example: { params: { cardId: 'card123', url: 'https://github.com/org/repo/pull/42', name: 'PR #42' }, description: 'Attach a PR link to a card' },
    responseExample: { id: 'newatt123', name: 'PR #42', url: 'https://github.com/org/repo/pull/42' },
    notes: ['Only URL attachments are supported via the API; file uploads require multipart form data'],
    seeAlso: ['attachments.list', 'attachments.delete'],
  },
  {
    name: 'attachments.delete',
    description: 'Delete an attachment from a card',
    operationType: 'delete',
    params: [
      { name: 'cardId', type: 'string', required: true, description: 'Card ID' },
      { name: 'attachmentId', type: 'string', required: true, description: 'Attachment ID' },
    ],
    returns: 'Empty success response',
    example: { params: { cardId: 'card123', attachmentId: 'att1' }, description: 'Delete an attachment' },
    seeAlso: ['attachments.list', 'attachments.create'],
  },

  // ---- Webhooks ----
  {
    name: 'webhooks.create',
    description: 'Create a webhook to receive notifications for a model (board, card, list, etc.)',
    operationType: 'write',
    params: [
      { name: 'idModel', type: 'string', required: true, description: 'ID of the model (board, card, list, etc.) to watch' },
      { name: 'callbackURL', type: 'string', required: true, description: 'URL that Trello will POST events to' },
      { name: 'description', type: 'string', required: false, description: 'Webhook description' },
      { name: 'active', type: 'boolean', required: false, description: 'Whether the webhook is active', default: true },
    ],
    returns: 'Created webhook object',
    example: { params: { idModel: 'board123', callbackURL: 'https://example.com/webhook', description: 'Board changes' }, description: 'Watch a board for changes' },
    responseExample: { id: 'wh123', idModel: 'board123', callbackURL: 'https://example.com/webhook', active: true },
    notes: [
      'Trello sends a HEAD request to the callbackURL to verify it before creating the webhook',
      'Your callback must respond to HEAD with 200 OK',
    ],
    seeAlso: ['webhooks.get', 'webhooks.delete'],
  },
  {
    name: 'webhooks.get',
    description: 'Get a webhook by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Webhook ID' },
    ],
    returns: 'Webhook object',
    example: { params: { id: 'wh123' }, description: 'Get webhook details' },
    responseExample: { id: 'wh123', idModel: 'board123', callbackURL: 'https://example.com/webhook', active: true, description: 'Board changes' },
    seeAlso: ['webhooks.create', 'webhooks.delete'],
  },
  {
    name: 'webhooks.delete',
    description: 'Delete a webhook',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Webhook ID to delete' },
    ],
    returns: 'Empty success response',
    example: { params: { id: 'wh123' }, description: 'Delete a webhook' },
    seeAlso: ['webhooks.create', 'webhooks.get'],
  },
];

// ---------------------------------------------------------------------------
// Execution dispatcher
// ---------------------------------------------------------------------------

async function executeTrello(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials
): Promise<unknown> {
  switch (method) {
    // ---- Members ----
    case 'members.me':
      return trelloFetch('/members/me', credentials, {
        query: { fields: 'id,username,fullName,email,url' },
      });

    // ---- Search ----
    case 'search': {
      const query: Record<string, string> = { query: String(params.query) };
      if (params.modelTypes) query.modelTypes = String(params.modelTypes);
      if (params.idBoards) query.idBoards = String(params.idBoards);
      if (params.idOrganizations) query.idOrganizations = String(params.idOrganizations);
      if (params.cards_limit) query.cards_limit = String(params.cards_limit);
      if (params.boards_limit) query.boards_limit = String(params.boards_limit);
      if (params.partial !== undefined) query.partial = String(params.partial);
      return trelloFetch('/search', credentials, { query });
    }

    // ---- Boards ----
    case 'boards.list': {
      const query: Record<string, string> = {};
      if (params.filter) query.filter = String(params.filter);
      if (params.fields) query.fields = String(params.fields);
      return trelloFetch('/members/me/boards', credentials, { query });
    }
    case 'boards.get': {
      const query: Record<string, string> = {};
      if (params.fields) query.fields = String(params.fields);
      if (params.lists) query.lists = String(params.lists);
      if (params.cards) query.cards = String(params.cards);
      if (params.members) query.members = String(params.members);
      if (params.labels) query.labels = String(params.labels);
      return trelloFetch(`/boards/${params.id}`, credentials, { query });
    }
    case 'boards.create':
      return trelloFetch('/boards', credentials, {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          desc: params.desc,
          idOrganization: params.idOrganization,
          defaultLists: params.defaultLists,
          prefs_permissionLevel: params.prefs_permissionLevel,
        }),
      });
    case 'boards.update': {
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.desc !== undefined) body.desc = params.desc;
      if (params.closed !== undefined) body.closed = params.closed;
      if (params['prefs/permissionLevel'] !== undefined) body['prefs/permissionLevel'] = params['prefs/permissionLevel'];
      return trelloFetch(`/boards/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    case 'boards.delete':
      return trelloFetch(`/boards/${params.id}`, credentials, { method: 'DELETE' });
    case 'boards.members':
      return trelloFetch(`/boards/${params.id}/members`, credentials);

    // ---- Lists ----
    case 'lists.get': {
      const query: Record<string, string> = {};
      if (params.fields) query.fields = String(params.fields);
      return trelloFetch(`/lists/${params.id}`, credentials, { query });
    }
    case 'lists.create':
      return trelloFetch('/lists', credentials, {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          idBoard: params.idBoard,
          pos: params.pos,
        }),
      });
    case 'lists.update': {
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.pos !== undefined) body.pos = params.pos;
      return trelloFetch(`/lists/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    case 'lists.archive':
      return trelloFetch(`/lists/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify({ closed: true }),
      });
    case 'lists.unarchive':
      return trelloFetch(`/lists/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify({ closed: false }),
      });

    // ---- Cards ----
    case 'cards.list': {
      const query: Record<string, string> = {};
      if (params.filter) query.filter = String(params.filter);
      if (params.fields) query.fields = String(params.fields);
      return trelloFetch(`/boards/${params.boardId}/cards/${params.filter || 'open'}`, credentials, { query });
    }
    case 'cards.listByList': {
      const query: Record<string, string> = {};
      if (params.fields) query.fields = String(params.fields);
      return trelloFetch(`/lists/${params.listId}/cards`, credentials, { query });
    }
    case 'cards.get': {
      const query: Record<string, string> = {};
      if (params.fields) query.fields = String(params.fields);
      if (params.checklists) query.checklists = String(params.checklists);
      if (params.members !== undefined) query.members = String(params.members);
      if (params.attachments) query.attachments = String(params.attachments);
      return trelloFetch(`/cards/${params.id}`, credentials, { query });
    }
    case 'cards.create':
      return trelloFetch('/cards', credentials, {
        method: 'POST',
        body: JSON.stringify({
          idList: params.idList,
          name: params.name,
          desc: params.desc,
          pos: params.pos,
          due: params.due,
          start: params.start,
          idMembers: params.idMembers,
          idLabels: params.idLabels,
          urlSource: params.urlSource,
        }),
      });
    case 'cards.update': {
      const body: Record<string, unknown> = {};
      for (const key of ['name', 'desc', 'closed', 'idList', 'idBoard', 'pos', 'due', 'start', 'dueComplete', 'idMembers', 'idLabels']) {
        if (params[key] !== undefined) body[key] = params[key];
      }
      return trelloFetch(`/cards/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    case 'cards.delete':
      return trelloFetch(`/cards/${params.id}`, credentials, { method: 'DELETE' });
    case 'cards.addMember':
      return trelloFetch(`/cards/${params.id}/idMembers`, credentials, {
        method: 'POST',
        body: JSON.stringify({ value: params.value }),
      });
    case 'cards.removeMember':
      return trelloFetch(`/cards/${params.id}/idMembers/${params.idMember}`, credentials, { method: 'DELETE' });
    case 'cards.addLabel':
      return trelloFetch(`/cards/${params.id}/idLabels`, credentials, {
        method: 'POST',
        body: JSON.stringify({ value: params.value }),
      });
    case 'cards.removeLabel':
      return trelloFetch(`/cards/${params.id}/idLabels/${params.idLabel}`, credentials, { method: 'DELETE' });

    // ---- Comments ----
    case 'comments.list':
      return trelloFetch(`/cards/${params.cardId}/actions`, credentials, {
        query: { filter: String(params.filter || 'commentCard') },
      });
    case 'comments.create':
      return trelloFetch(`/cards/${params.cardId}/actions/comments`, credentials, {
        method: 'POST',
        body: JSON.stringify({ text: params.text }),
      });
    case 'comments.update':
      return trelloFetch(`/actions/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify({ text: params.text }),
      });
    case 'comments.delete':
      return trelloFetch(`/actions/${params.id}`, credentials, { method: 'DELETE' });

    // ---- Labels ----
    case 'labels.list':
      return trelloFetch(`/boards/${params.boardId}/labels`, credentials);
    case 'labels.create':
      return trelloFetch('/labels', credentials, {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          color: params.color,
          idBoard: params.idBoard,
        }),
      });
    case 'labels.update': {
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.color !== undefined) body.color = params.color;
      return trelloFetch(`/labels/${params.id}`, credentials, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    case 'labels.delete':
      return trelloFetch(`/labels/${params.id}`, credentials, { method: 'DELETE' });

    // ---- Checklists ----
    case 'checklists.get': {
      const query: Record<string, string> = {};
      if (params.fields) query.fields = String(params.fields);
      if (params.checkItems) query.checkItems = String(params.checkItems);
      return trelloFetch(`/checklists/${params.id}`, credentials, { query });
    }
    case 'checklists.create':
      return trelloFetch('/checklists', credentials, {
        method: 'POST',
        body: JSON.stringify({
          idCard: params.idCard,
          name: params.name,
          pos: params.pos,
        }),
      });
    case 'checklists.delete':
      return trelloFetch(`/checklists/${params.id}`, credentials, { method: 'DELETE' });

    // ---- Check Items ----
    case 'checkItems.create':
      return trelloFetch(`/checklists/${params.checklistId}/checkItems`, credentials, {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          pos: params.pos,
          checked: params.checked,
        }),
      });
    case 'checkItems.update': {
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.state !== undefined) body.state = params.state;
      if (params.pos !== undefined) body.pos = params.pos;
      return trelloFetch(`/cards/${params.cardId}/checkItem/${params.idCheckItem}`, credentials, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    case 'checkItems.delete':
      return trelloFetch(`/cards/${params.cardId}/checkItem/${params.idCheckItem}`, credentials, { method: 'DELETE' });

    // ---- Attachments ----
    case 'attachments.list':
      return trelloFetch(`/cards/${params.cardId}/attachments`, credentials);
    case 'attachments.create':
      return trelloFetch(`/cards/${params.cardId}/attachments`, credentials, {
        method: 'POST',
        body: JSON.stringify({
          url: params.url,
          name: params.name,
        }),
      });
    case 'attachments.delete':
      return trelloFetch(`/cards/${params.cardId}/attachments/${params.attachmentId}`, credentials, { method: 'DELETE' });

    // ---- Webhooks ----
    case 'webhooks.create':
      return trelloFetch('/webhooks', credentials, {
        method: 'POST',
        body: JSON.stringify({
          idModel: params.idModel,
          callbackURL: params.callbackURL,
          description: params.description,
          active: params.active,
        }),
      });
    case 'webhooks.get':
      return trelloFetch(`/webhooks/${params.id}`, credentials);
    case 'webhooks.delete':
      return trelloFetch(`/webhooks/${params.id}`, credentials, { method: 'DELETE' });

    default:
      throw new Error(`Unknown Trello method: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

export const trelloConnector: Connector = {
  service: 'trello',
  name: 'Trello',
  methods,

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata {
    const methodDef = methods.find((m) => m.name === method);
    if (!methodDef) throw new Error(`Unknown Trello method: ${method}`);
    return {
      service: 'trello',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeTrelloRequest(method, params),
    };
  },

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown> {
    return executeTrello(method, params, credentials);
  },

  help(method?: string): ServiceHelp {
    if (method) {
      const m = methods.find((md) => md.name === method);
      return {
        service: 'trello',
        name: 'Trello',
        summary: 'Project management — boards, lists, cards, checklists',
        methods: m ? [m] : [],
      };
    }
    return {
      service: 'trello',
      name: 'Trello',
      summary: 'Project management — boards, lists, cards, checklists',
      methods,
    };
  },
};
