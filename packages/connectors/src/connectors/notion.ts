/**
 * Notion connector — 8 methods covering databases, pages, blocks, and search.
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {}
): Promise<unknown> {
  const url = `${NOTION_API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API error ${response.status}: ${text}`);
  }

  return response.json();
}

function describeNotionRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'databases.query':
      return `Query database ${params.database_id || '(unknown)'}`;
    case 'databases.retrieve':
      return `Get database schema ${params.database_id || '(unknown)'}`;
    case 'pages.create': {
      const parent = params.parent as Record<string, unknown> | undefined;
      return `Create page in ${parent?.database_id ? `database ${parent.database_id}` : 'workspace'}`;
    }
    case 'pages.retrieve':
      return `Get page ${params.page_id || '(unknown)'}`;
    case 'pages.update':
      return `Update page ${params.page_id || '(unknown)'}`;
    case 'blocks.children.list':
      return `List blocks in ${params.block_id || '(unknown)'}`;
    case 'blocks.children.append':
      return `Append blocks to ${params.block_id || '(unknown)'}`;
    case 'search':
      return params.query ? `Search: "${params.query}"` : 'Search workspace';
    default:
      return `Notion ${method}`;
  }
}

const methods: ConnectorMethod[] = [
  {
    name: 'databases.query',
    description: 'Query a database with optional filters and sorts',
    operationType: 'read',
    params: [
      { name: 'database_id', type: 'string', required: true, description: 'Database ID to query' },
      { name: 'filter', type: 'object', required: false, description: 'Filter conditions (Notion filter object)' },
      { name: 'sorts', type: 'array', required: false, description: 'Sort conditions' },
      { name: 'page_size', type: 'number', required: false, description: 'Results per page', default: 100 },
      { name: 'start_cursor', type: 'string', required: false, description: 'Pagination cursor' },
    ],
    returns: 'List of page objects matching the query',
    example: { params: { database_id: 'abc123', page_size: 10 }, description: 'Query first 10 items from a database' },
  },
  {
    name: 'databases.retrieve',
    description: 'Get database schema and properties',
    operationType: 'read',
    params: [
      { name: 'database_id', type: 'string', required: true, description: 'Database ID' },
    ],
    returns: 'Database object with properties schema',
    example: { params: { database_id: 'abc123' }, description: 'Get database schema' },
  },
  {
    name: 'pages.create',
    description: 'Create a new page in a database or as a child of another page',
    operationType: 'write',
    params: [
      { name: 'parent', type: 'object', required: true, description: 'Parent reference: { database_id: "..." } or { page_id: "..." }' },
      { name: 'properties', type: 'object', required: true, description: 'Page properties matching the database schema' },
      { name: 'children', type: 'array', required: false, description: 'Page content as block objects' },
    ],
    returns: 'Created page object',
    example: {
      params: {
        parent: { database_id: 'abc123' },
        properties: { Name: { title: [{ text: { content: 'New Page' } }] } },
      },
      description: 'Create a page in a database',
    },
  },
  {
    name: 'pages.retrieve',
    description: 'Get a page by ID',
    operationType: 'read',
    params: [
      { name: 'page_id', type: 'string', required: true, description: 'Page ID' },
    ],
    returns: 'Page object with properties',
  },
  {
    name: 'pages.update',
    description: 'Update page properties',
    operationType: 'write',
    params: [
      { name: 'page_id', type: 'string', required: true, description: 'Page ID' },
      { name: 'properties', type: 'object', required: true, description: 'Properties to update' },
      { name: 'archived', type: 'boolean', required: false, description: 'Set to true to archive the page' },
    ],
    returns: 'Updated page object',
  },
  {
    name: 'blocks.children.list',
    description: 'List child blocks of a block or page',
    operationType: 'read',
    params: [
      { name: 'block_id', type: 'string', required: true, description: 'Block or page ID' },
      { name: 'page_size', type: 'number', required: false, description: 'Results per page', default: 100 },
      { name: 'start_cursor', type: 'string', required: false, description: 'Pagination cursor' },
    ],
    returns: 'List of block objects',
  },
  {
    name: 'blocks.children.append',
    description: 'Append blocks to a page or block',
    operationType: 'write',
    params: [
      { name: 'block_id', type: 'string', required: true, description: 'Block or page ID to append to' },
      { name: 'children', type: 'array', required: true, description: 'Block objects to append' },
    ],
    returns: 'Appended block objects',
    example: {
      params: {
        block_id: 'abc123',
        children: [{ type: 'paragraph', paragraph: { rich_text: [{ text: { content: 'Hello' } }] } }],
      },
      description: 'Append a paragraph to a page',
    },
  },
  {
    name: 'search',
    description: 'Search across the workspace',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: false, description: 'Search query text' },
      { name: 'filter', type: 'object', required: false, description: 'Filter by object type: { value: "page" } or { value: "database" }' },
      { name: 'sort', type: 'object', required: false, description: 'Sort: { direction: "ascending"|"descending", timestamp: "last_edited_time" }' },
      { name: 'page_size', type: 'number', required: false, description: 'Results per page', default: 100 },
      { name: 'start_cursor', type: 'string', required: false, description: 'Pagination cursor' },
    ],
    returns: 'List of page and database objects',
    example: { params: { query: 'meeting notes', page_size: 10 }, description: 'Search for meeting notes' },
  },
];

async function executeNotion(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials
): Promise<unknown> {
  switch (method) {
    case 'databases.query': {
      const body: Record<string, unknown> = {};
      if (params.filter) body.filter = params.filter;
      if (params.sorts) body.sorts = params.sorts;
      if (params.page_size) body.page_size = params.page_size;
      if (params.start_cursor) body.start_cursor = params.start_cursor;
      return notionFetch(`/databases/${params.database_id}/query`, credentials, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    case 'databases.retrieve':
      return notionFetch(`/databases/${params.database_id}`, credentials);

    case 'pages.create':
      return notionFetch('/pages', credentials, {
        method: 'POST',
        body: JSON.stringify({
          parent: params.parent,
          properties: params.properties,
          children: params.children,
        }),
      });

    case 'pages.retrieve':
      return notionFetch(`/pages/${params.page_id}`, credentials);

    case 'pages.update': {
      const body: Record<string, unknown> = {
        properties: params.properties,
      };
      if (params.archived !== undefined) body.archived = params.archived;
      return notionFetch(`/pages/${params.page_id}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    }

    case 'blocks.children.list': {
      const query = new URLSearchParams();
      if (params.page_size) query.set('page_size', String(params.page_size));
      if (params.start_cursor) query.set('start_cursor', String(params.start_cursor));
      const qs = query.toString();
      return notionFetch(`/blocks/${params.block_id}/children${qs ? `?${qs}` : ''}`, credentials);
    }

    case 'blocks.children.append':
      return notionFetch(`/blocks/${params.block_id}/children`, credentials, {
        method: 'PATCH',
        body: JSON.stringify({ children: params.children }),
      });

    case 'search': {
      const body: Record<string, unknown> = {};
      if (params.query) body.query = params.query;
      if (params.filter) body.filter = params.filter;
      if (params.sort) body.sort = params.sort;
      if (params.page_size) body.page_size = params.page_size;
      if (params.start_cursor) body.start_cursor = params.start_cursor;
      return notionFetch('/search', credentials, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    default:
      throw new Error(`Unknown Notion method: ${method}`);
  }
}

function getResourceType(method: string): string | undefined {
  if (method.startsWith('databases.')) return 'database';
  if (method.startsWith('pages.')) return 'page';
  if (method.startsWith('blocks.')) return 'block';
  if (method === 'search') return undefined;
  return undefined;
}

export const notionConnector: Connector = {
  service: 'notion',
  name: 'Notion',
  methods,

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata {
    const methodDef = methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown Notion method: ${method}`);
    }
    return {
      service: 'notion',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeNotionRequest(method, params),
    };
  },

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown> {
    return executeNotion(method, params, credentials);
  },

  help(method?: string): ServiceHelp {
    if (method) {
      const m = methods.find((md) => md.name === method);
      return {
        service: 'notion',
        name: 'Notion',
        methods: m ? [m] : [],
      };
    }
    return {
      service: 'notion',
      name: 'Notion',
      methods,
    };
  },
};
