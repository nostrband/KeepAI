import type { ServiceDefinition, TokenResponse } from '../types.js';
import type { McpSession } from '@keepai/mcp-client';
import { getGitHubCredentials } from '../credentials.js';

export const githubService: ServiceDefinition = {
  id: 'github',
  name: 'GitHub',
  icon: 'github',
  mcpOAuth: {
    serverUrl: 'https://api.githubcopilot.com',
    mcpEndpoint: '/mcp/',
    clientName: 'KeepAI',
    // Pre-registered GitHub OAuth App — no DCR support
    get clientId() {
      return getGitHubCredentials().clientId;
    },
    get clientSecret() {
      return getGitHubCredentials().clientSecret;
    },
    scopes: ['repo', 'read:org', 'read:user', 'user:email', 'notifications'],
  },
  // Placeholder — MCP OAuth flow uses McpOAuthClient, not OAuthHandler
  oauthConfig: {
    authUrl: '',
    tokenUrl: '',
    scopes: [],
  },
  supportsRefresh: true,
  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    // For MCP OAuth, account ID is extracted via mcpExtractAccountId instead
    return 'default';
  },
  async mcpExtractAccountId(session: unknown): Promise<{
    accountId: string;
    displayName?: string;
  }> {
    const mcpSession = session as McpSession;
    try {
      const result = await mcpSession.callTool('get_me', {});
      const text = result.content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text!)
        .join('\n');
      const parsed = JSON.parse(text);

      if (parsed?.login) {
        return {
          accountId: String(parsed.login),
          displayName: parsed.name ? `${parsed.name} (${parsed.login})` : String(parsed.login),
        };
      }

      return { accountId: 'default', displayName: 'GitHub' };
    } catch {
      return { accountId: 'default', displayName: 'GitHub' };
    }
  },
};
