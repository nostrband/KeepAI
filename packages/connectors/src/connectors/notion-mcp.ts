/**
 * Notion MCP connector config — ~60 lines replacing ~380 lines of hand-written connector.
 */

import type { McpConnectorConfig } from '../mcp-connector.js';

export const notionMcpConfig: McpConnectorConfig = {
  service: 'notion',
  name: 'Notion',
  serverUrl: 'https://mcp.notion.com',
  mcpEndpoint: '/mcp',

  // Override destructiveHint for update tools (they're writes, not deletes)
  toolTypes: {
    'notion-update-page': 'write',
    'notion-update-data-source': 'write',
  },

  // Shorter names for CLI ergonomics
  methodNames: {
    'notion-search': 'search',
    'notion-fetch': 'fetch',
    'notion-create-pages': 'pages.create',
    'notion-update-page': 'pages.update',
    'notion-move-pages': 'pages.move',
    'notion-duplicate-page': 'pages.duplicate',
    'notion-create-database': 'databases.create',
    'notion-update-data-source': 'data-sources.update',
    'notion-create-comment': 'comments.create',
    'notion-get-comments': 'comments.list',
    'notion-get-teams': 'teams.list',
    'notion-get-users': 'users.list',
  },

  describeRequest(method, params) {
    switch (method) {
      case 'search':
        return params.query ? `Search: "${params.query}"` : 'Search workspace';
      case 'fetch':
        return `Fetch ${params.id || '(unknown)'}`;
      case 'pages.create':
        return `Create ${(params.pages as unknown[])?.length ?? 1} page(s)`;
      case 'pages.update':
        return `Update page ${params.page_id || '(unknown)'}`;
      default:
        return `Notion ${method}`;
    }
  },

  async extractAccountId(session) {
    try {
      const result = await session.callTool('notion-get-users', { user_id: 'self' });
      const text = result.content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text!)
        .join('\n');
      // Try to extract workspace/user info from the response
      const parsed = tryParseJson(text);
      if (parsed?.workspace_id) {
        return {
          accountId: String(parsed.workspace_id),
          displayName: String(parsed.workspace_name || parsed.name || parsed.workspace_id),
        };
      }
      if (parsed?.id) {
        return {
          accountId: String(parsed.id),
          displayName: String(parsed.name || parsed.id),
        };
      }
      // Fallback
      return { accountId: 'default', displayName: 'Notion Workspace' };
    } catch {
      return { accountId: 'default', displayName: 'Notion Workspace' };
    }
  },
};

function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
