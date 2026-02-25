import type { ServiceDefinition, TokenResponse } from '../types.js';

export const notionService: ServiceDefinition = {
  id: 'notion',
  name: 'Notion',
  icon: 'book-open',
  oauthConfig: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    extraAuthParams: {
      owner: 'user',
    },
    useBasicAuth: true,
  },
  supportsRefresh: false,
  async extractAccountId(tokenResponse: TokenResponse): Promise<string> {
    if (!tokenResponse.workspace_id) {
      throw new Error('Could not extract workspace_id from Notion token response');
    }
    return tokenResponse.workspace_id;
  },
  extractDisplayName(tokenResponse: TokenResponse): string | undefined {
    return (tokenResponse.workspace_name as string) || (tokenResponse.workspace_id as string);
  },
};
