/**
 * Notion service definition — OAuth2 with basic auth for token exchange.
 *
 * Auth flow: user authorizes via Notion's OAuth page, which redirects back
 * to KeepAI with an authorization code. Token exchange uses basic auth
 * (client_id:client_secret) per Notion's requirements.
 */

import type { ServiceDefinition, TokenResponse } from '../types.js';

export interface NotionProfile {
  id: string;
  name: string;
  type: string;
  avatar_url?: string;
  bot?: {
    owner?: {
      type: string;
      user?: { name?: string; person?: { email?: string } };
    };
    workspace_name?: string;
  };
}

export async function fetchNotionProfile(
  accessToken: string
): Promise<NotionProfile> {
  const response = await fetch('https://api.notion.com/v1/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Notion profile: ${response.status}`);
  }

  return response.json();
}

export const notionService: ServiceDefinition = {
  id: 'notion',
  name: 'Notion',
  icon: 'book-open',
  oauthConfig: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    useBasicAuth: true,
    revokeUrl: 'https://api.notion.com/v1/oauth/revoke',
    extraAuthParams: { owner: 'user' },
  },
  supportsRefresh: true,
  fetchProfile: fetchNotionProfile,

  async extractAccountId(tokenResponse: TokenResponse): Promise<string> {
    // Use workspace_id (stable UUID) — workspace names can be renamed
    return (tokenResponse.workspace_id as string) ?? 'default';
  },

  extractDisplayName(
    tokenResponse: TokenResponse,
    profile?: unknown,
  ): string | undefined {
    const p = profile as NotionProfile | undefined;
    const workspaceName = (tokenResponse.workspace_name as string)
      || p?.bot?.workspace_name;
    const ownerName = p?.bot?.owner?.user?.name;
    const ownerEmail = p?.bot?.owner?.user?.person?.email;

    if (workspaceName && ownerEmail) return `${workspaceName} (${ownerEmail})`;
    if (workspaceName && ownerName) return `${workspaceName} (${ownerName})`;
    if (workspaceName) return workspaceName;
    return (tokenResponse.workspace_id as string);
  },
};
