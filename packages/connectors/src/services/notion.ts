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
      const parsed = JSON.parse(text);

      // Response is { results: [{ type, id, name, email }], has_more }
      const user = parsed?.results?.[0];
      if (user) {
        // Use email as account ID (stable, human-readable), fall back to user ID
        const accountId = user.email || user.id;
        const displayName = user.name || user.email || user.id;
        return { accountId: String(accountId), displayName: String(displayName) };
      }

      // Fallback: top-level fields
      if (parsed?.id) {
        return {
          accountId: String(parsed.id),
          displayName: String(parsed.name || parsed.id),
        };
      }

      return { accountId: 'default', displayName: 'Notion Workspace' };
    } catch {
      return { accountId: 'default', displayName: 'Notion Workspace' };
    }
  },
};
