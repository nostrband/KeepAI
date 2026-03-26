/**
 * Notion connector — pages, blocks, databases, data sources, users,
 * comments, search, views, and file uploads.
 *
 * Uses the official `@notionhq/client` npm package. Auth is via OAuth2.
 */

import { Client as NotionClient, isNotionClientError, isHTTPResponseError, APIErrorCode, RequestTimeoutError } from '@notionhq/client';
import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
  ResolveResult,
  ResolvableType,
} from '@keepai/proto';
import { AuthError, NetworkError, PermissionError, LogicError } from '@keepai/proto';

import { pagesMethods } from './methods-pages.js';
import { blocksMethods } from './methods-blocks.js';
import { databasesMethods } from './methods-databases.js';
import { dataSourcesMethods } from './methods-datasources.js';
import { usersMethods } from './methods-users.js';
import { commentsMethods } from './methods-comments.js';
import { searchMethods } from './methods-search.js';
import { viewsMethods } from './methods-views.js';
import { fileUploadsMethods } from './methods-files.js';

// ---------------------------------------------------------------------------
// SDK client helper
// ---------------------------------------------------------------------------

function getClient(credentials: OAuthCredentials): NotionClient {
  return new NotionClient({ auth: credentials.accessToken });
}

// ---------------------------------------------------------------------------
// All methods combined
// ---------------------------------------------------------------------------

const allMethods: ConnectorMethod[] = [
  ...pagesMethods,
  ...blocksMethods,
  ...databasesMethods,
  ...dataSourcesMethods,
  ...usersMethods,
  ...commentsMethods,
  ...searchMethods,
  ...viewsMethods,
  ...fileUploadsMethods,
];

// ---------------------------------------------------------------------------
// Human-readable request descriptions
// ---------------------------------------------------------------------------

/** Wrap an ID as a resolvable [type:id] reference, or return '(unknown)'. */
function ref(type: string, id: unknown): string {
  return id ? `[${type}:${id}]` : '(unknown)';
}

function describeNotionRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'pages.create': {
      const parent = params.parent as Record<string, unknown> | undefined;
      if (parent?.page_id) return `Create page in ${ref('page_id', parent.page_id)}`;
      if (parent?.database_id) return `Create page in ${ref('database_id', parent.database_id)}`;
      return 'Create page';
    }
    case 'pages.retrieve': return `Retrieve page ${ref('page_id', params.page_id)}`;
    case 'pages.update': return `Update page ${ref('page_id', params.page_id)}`;
    case 'pages.move': return `Move page ${ref('page_id', params.page_id)}`;
    case 'pages.retrieveMarkdown': return `Retrieve markdown of ${ref('page_id', params.page_id)}`;
    case 'pages.updateMarkdown': return `Update markdown of ${ref('page_id', params.page_id)}`;
    case 'pages.properties.retrieve': return `Retrieve property of ${ref('page_id', params.page_id)}`;
    case 'blocks.retrieve': return `Retrieve ${ref('block_id', params.block_id)}`;
    case 'blocks.update': return `Update ${ref('block_id', params.block_id)}`;
    case 'blocks.delete': return `Delete ${ref('block_id', params.block_id)}`;
    case 'blocks.children.list': return `List children of ${ref('block_id', params.block_id)}`;
    case 'blocks.children.append': return `Append children to ${ref('block_id', params.block_id)}`;
    case 'databases.retrieve': return `Retrieve ${ref('database_id', params.database_id)}`;
    case 'databases.create': return 'Create database';
    case 'databases.update': return `Update ${ref('database_id', params.database_id)}`;
    case 'dataSources.retrieve': return `Retrieve ${ref('data_source_id', params.data_source_id)}`;
    case 'dataSources.query': return `Query ${ref('data_source_id', params.data_source_id)}`;
    case 'dataSources.create': return 'Create data source';
    case 'dataSources.update': return `Update ${ref('data_source_id', params.data_source_id)}`;
    case 'dataSources.listTemplates': return `List templates for ${ref('data_source_id', params.data_source_id)}`;
    case 'users.retrieve': return `Retrieve ${ref('user_id', params.user_id)}`;
    case 'users.list': return 'List users';
    case 'users.me': return 'Get bot user info';
    case 'comments.create': return 'Create comment';
    case 'comments.list': return `List comments for ${ref('block_id', params.block_id)}`;
    case 'comments.retrieve': return `Retrieve ${ref('comment_id', params.comment_id)}`;
    case 'search': return params.query ? `Search: "${params.query}"` : 'Search workspace';
    case 'views.create': return 'Create view';
    case 'views.retrieve': return `Retrieve view ${params.view_id || '(unknown)'}`;
    case 'views.update': return `Update view ${params.view_id || '(unknown)'}`;
    case 'views.delete': return `Delete view ${params.view_id || '(unknown)'}`;
    case 'views.list': return 'List views';
    case 'views.queries.create': return `Create query for view ${params.view_id || '(unknown)'}`;
    case 'views.queries.results': return `Get query results for view ${params.view_id || '(unknown)'}`;
    case 'views.queries.delete': return `Delete query from view ${params.view_id || '(unknown)'}`;
    case 'fileUploads.create': return `Create file upload${params.filename ? ` "${params.filename}"` : ''}`;
    case 'fileUploads.retrieve': return `Retrieve file upload ${params.file_upload_id || '(unknown)'}`;
    case 'fileUploads.list': return 'List file uploads';
    case 'fileUploads.send': return `Send file upload ${params.file_upload_id || '(unknown)'}`;
    case 'fileUploads.complete': return `Complete file upload ${params.file_upload_id || '(unknown)'}`;
    default: {
      const parts = method.split('.');
      const action = parts[parts.length - 1];
      const resource = parts.slice(0, -1).join('.');
      return `${action} ${resource}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Resource type extraction
// ---------------------------------------------------------------------------

function getResourceType(method: string): string | undefined {
  const parts = method.split('.');
  return parts.length > 2 ? parts.slice(0, -1).join('.') : parts[0];
}

// ---------------------------------------------------------------------------
// Execute — generic dispatcher using Notion SDK
// ---------------------------------------------------------------------------

/**
 * Navigate the Notion SDK object tree and call the method.
 * Method names like 'pages.create' map to client.pages.create().
 * Nested names like 'blocks.children.append' map to client.blocks.children.append().
 * Top-level 'search' maps to client.search().
 */
async function execute(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials,
): Promise<unknown> {
  const client = getClient(credentials);
  const parts = method.split('.');
  const action = parts.pop()!;

  let target: any = client;
  for (const part of parts) {
    target = target[part];
    if (!target) throw new Error(`Unknown Notion resource: ${parts.join('.')}`);
  }

  const fn = target[action];
  if (typeof fn !== 'function') throw new Error(`Unknown Notion method: ${method}`);

  // Notion SDK takes a single params object for all methods
  try {
    return await fn.call(target, params);
  } catch (err) {
    throw classifyNotionError(err);
  }
}

/**
 * Classify Notion SDK errors into KeepAI ClassifiedError types.
 * - 401 (unauthorized) → AuthError (permanent, connection must be reconnected)
 * - 403 (restricted_resource) → PermissionError
 * - 429, 408, 5xx, timeouts → NetworkError (transient)
 * - Everything else → LogicError
 */
function classifyNotionError(err: unknown): Error {
  if (RequestTimeoutError.isRequestTimeoutError(err)) {
    return new NetworkError(err.message, { cause: err as Error, source: 'notion' });
  }

  if (isHTTPResponseError(err)) {
    const status = err.status;
    const code = 'code' in err ? (err as any).code : undefined;

    if (status === 401 || code === APIErrorCode.Unauthorized) {
      return new AuthError('Notion token is invalid or expired', {
        cause: err as Error,
        source: 'notion',
        serviceId: 'notion',
        accountId: '',
      });
    }

    if (status === 403 || code === APIErrorCode.RestrictedResource) {
      return new PermissionError(err.message, { cause: err as Error, source: 'notion' });
    }

    if (status === 429 || status === 408 || status >= 500) {
      return new NetworkError(err.message, { cause: err as Error, source: 'notion', statusCode: status });
    }

    return new LogicError(err.message, { cause: err as Error, source: 'notion' });
  }

  // Not a Notion SDK error — return as-is
  return err instanceof Error ? err : new Error(String(err));
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resolvable ID types & resolver
// ---------------------------------------------------------------------------

const notionResolvableTypes: Record<string, ResolvableType> = {
  page_id: { label: 'Page' },
  database_id: { label: 'Database' },
  block_id: { label: 'Block' },
  user_id: { label: 'User' },
  comment_id: { label: 'Comment' },
  data_source_id: { label: 'Data Source' },
};

function extractPageTitle(page: any): string {
  const props = page.properties || {};
  for (const prop of Object.values(props) as any[]) {
    if (prop.type === 'title' && prop.title?.length) {
      return prop.title.map((t: any) => t.plain_text).join('');
    }
  }
  return '';
}

function extractDbTitle(db: any): string {
  return db.title?.map((t: any) => t.plain_text).join('') || '';
}

function notionUrl(id: string): string {
  return `https://notion.so/${id.replace(/-/g, '')}`;
}

function truncateText(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

async function resolveNotionId(
  type: string,
  id: string,
  credentials: OAuthCredentials,
): Promise<ResolveResult | null> {
  const client = getClient(credentials);
  try {
    switch (type) {
      case 'page_id': {
        const page = await client.pages.retrieve({ page_id: id });
        return {
          title: extractPageTitle(page) || 'Untitled',
          url: notionUrl(id),
        };
      }
      case 'database_id': {
        const db = await client.databases.retrieve({ database_id: id });
        return {
          title: extractDbTitle(db) || 'Untitled database',
          url: notionUrl(id),
        };
      }
      case 'block_id': {
        const block: any = await client.blocks.retrieve({ block_id: id });
        const blockType = (block.type || 'unknown').replace(/_/g, ' ');
        return {
          title: `${blockType.charAt(0).toUpperCase()}${blockType.slice(1)} block`,
          url: notionUrl(id),
        };
      }
      case 'user_id': {
        const user: any = await client.users.retrieve({ user_id: id });
        return { title: user.name || 'Unknown user' };
      }
      case 'comment_id': {
        const comment: any = await (client.comments as any).retrieve({ comment_id: id });
        const text = comment.rich_text?.map((t: any) => t.plain_text).join('') || '';
        return { title: text ? truncateText(text, 50) : 'Comment' };
      }
      case 'data_source_id': {
        const ds: any = await (client as any).dataSources.retrieve({ data_source_id: id });
        // title can be a rich text array like pages/databases
        const title = Array.isArray(ds.title)
          ? ds.title.map((t: any) => t.plain_text).join('')
          : typeof ds.title === 'string' ? ds.title : '';
        // data source ID != page/database ID — use the url field from the response
        return {
          title: title || ds.name || 'Data source',
          url: ds.url || undefined,
        };
      }
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

export const notionConnector: Connector = {
  service: 'notion',
  name: 'Notion',
  methods: allMethods,
  resolvableTypes: notionResolvableTypes,
  groupDescriptions: {
    pages: 'Page management — create, retrieve, update, move, markdown read/write, properties',
    blocks: 'Block management — retrieve, update, delete, append/list children',
    databases: 'Database management — retrieve, create, update',
    dataSources: 'Data sources — retrieve, query, create, update, templates',
    users: 'User info — retrieve, list, bot details',
    comments: 'Comment management — create, list, retrieve',
    search: 'Search across workspace content',
    views: 'Database views — CRUD, queries',
    fileUploads: 'File uploads — create, send, complete, list',
  },

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string,
  ): PermissionMetadata {
    const methodDef = allMethods.find((m) => m.name === method);
    if (!methodDef) throw new Error(`Unknown Notion method: ${method}`);
    return {
      service: 'notion',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeNotionRequest(method, params),
    };
  },

  execute,
  resolveId: resolveNotionId,

  help(method?: string): ServiceHelp {
    if (method) {
      const m = allMethods.find((md) => md.name === method);
      return { service: 'notion', name: 'Notion', methods: m ? [m] : [] };
    }
    return {
      service: 'notion',
      name: 'Notion',
      summary: 'Workspace — pages, blocks, databases, data sources, comments, search, views, and file uploads',
      methods: allMethods,
    };
  },
};
