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

function describeNotionRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'pages.create': return `Create page${params.parent ? ` in ${JSON.stringify(params.parent)}` : ''}`;
    case 'pages.retrieve': return `Retrieve page ${params.page_id || '(unknown)'}`;
    case 'pages.update': return `Update page ${params.page_id || '(unknown)'}`;
    case 'pages.move': return `Move page ${params.page_id || '(unknown)'}`;
    case 'pages.retrieveMarkdown': return `Retrieve page markdown ${params.page_id || '(unknown)'}`;
    case 'pages.updateMarkdown': return `Update page markdown ${params.page_id || '(unknown)'}`;
    case 'pages.properties.retrieve': return `Retrieve property ${params.property_id || '(unknown)'} of page ${params.page_id || '(unknown)'}`;
    case 'blocks.retrieve': return `Retrieve block ${params.block_id || '(unknown)'}`;
    case 'blocks.update': return `Update block ${params.block_id || '(unknown)'}`;
    case 'blocks.delete': return `Delete block ${params.block_id || '(unknown)'}`;
    case 'blocks.children.list': return `List children of block ${params.block_id || '(unknown)'}`;
    case 'blocks.children.append': return `Append children to block ${params.block_id || '(unknown)'}`;
    case 'databases.retrieve': return `Retrieve database ${params.database_id || '(unknown)'}`;
    case 'databases.create': return 'Create database';
    case 'databases.update': return `Update database ${params.database_id || '(unknown)'}`;
    case 'dataSources.retrieve': return `Retrieve data source ${params.data_source_id || '(unknown)'}`;
    case 'dataSources.query': return `Query data source ${params.data_source_id || '(unknown)'}`;
    case 'dataSources.create': return 'Create data source';
    case 'dataSources.update': return `Update data source ${params.data_source_id || '(unknown)'}`;
    case 'dataSources.listTemplates': return `List templates for data source ${params.data_source_id || '(unknown)'}`;
    case 'users.retrieve': return `Retrieve user ${params.user_id || '(unknown)'}`;
    case 'users.list': return 'List users';
    case 'users.me': return 'Get bot user info';
    case 'comments.create': return 'Create comment';
    case 'comments.list': return `List comments for ${params.block_id || '(unknown)'}`;
    case 'comments.retrieve': return `Retrieve comment ${params.comment_id || '(unknown)'}`;
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

export const notionConnector: Connector = {
  service: 'notion',
  name: 'Notion',
  methods: allMethods,
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
