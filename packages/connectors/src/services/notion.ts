import type { ServiceDefinition, TokenResponse } from '../types.js';
import type { McpSession } from '@keepai/mcp-client';

export const notionService: ServiceDefinition = {
  id: 'notion',
  name: 'Notion',
  icon: 'book-open',
  mcpOAuth: {
    serverUrl: 'https://mcp.notion.com',
    clientName: 'KeepAI',
  },
  // Placeholder — MCP OAuth flow uses McpOAuthClient, not OAuthHandler
  oauthConfig: {
    authUrl: '',
    tokenUrl: '',
    scopes: [],
  },
  supportsRefresh: true,
  async extractAccountId(tokenResponse: TokenResponse): Promise<string> {
    // For MCP OAuth, account ID is extracted via mcpExtractAccountId instead
    return tokenResponse.workspace_id as string ?? 'default';
  },
  extractDisplayName(tokenResponse: TokenResponse): string | undefined {
    return (tokenResponse.workspace_name as string) || (tokenResponse.workspace_id as string);
  },
  async mcpExtractAccountId(session: unknown): Promise<{
    accountId: string;
    displayName?: string;
  }> {
    const mcpSession = session as McpSession;
    try {
      const result = await mcpSession.callTool('notion-get-users', { user_id: 'self' });
      const text = result.content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text!)
        .join('\n');
      try {
        const parsed = JSON.parse(text);
        if (parsed?.workspace_id) {
          return {
            accountId: parsed.workspace_id,
            displayName: parsed.workspace_name || parsed.name || parsed.workspace_id,
          };
        }
        if (parsed?.id) {
          return {
            accountId: parsed.id,
            displayName: parsed.name || parsed.id,
          };
        }
      } catch {
        // Not JSON
      }
      return { accountId: 'default', displayName: 'Notion Workspace' };
    } catch {
      return { accountId: 'default', displayName: 'Notion Workspace' };
    }
  },
};
