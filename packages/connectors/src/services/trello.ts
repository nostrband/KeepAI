/**
 * Trello service definition — token-based auth (no API secret needed).
 *
 * Auth flow: user visits Trello's authorize page, approves, and gets redirected
 * back with the token in the URL fragment (#token=xxx). API calls use simple
 * key+token query params: ?key={apiKey}&token={accessToken}
 */

import type { ServiceDefinition, TokenResponse } from '../types.js';
import { getTrelloCredentials } from '../credentials.js';

export interface TrelloProfile {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  url: string;
}

export async function fetchTrelloProfile(accessToken: string): Promise<TrelloProfile> {
  const { clientId: apiKey } = getTrelloCredentials();
  const response = await fetch(
    `https://api.trello.com/1/members/me?key=${apiKey}&token=${accessToken}&fields=id,username,fullName,email,url`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Trello profile: ${response.status}`);
  }
  return response.json() as Promise<TrelloProfile>;
}

export const trelloService: ServiceDefinition = {
  id: 'trello',
  name: 'Trello',
  icon: 'trello',

  // Placeholder — token auth uses tokenAuth config below, not standard OAuth2.
  oauthConfig: {
    authUrl: '',
    tokenUrl: '',
    scopes: [],
  },

  tokenAuth: {
    authorizeUrl: 'https://trello.com/1/authorize',
    authorizeParams: {
      name: 'KeepAI',
      scope: 'read,write,account',
      expiration: 'never',
    },
  },

  /** Trello tokens with expiration=never do not expire and cannot be refreshed. */
  supportsRefresh: false,

  fetchProfile: fetchTrelloProfile,

  async extractAccountId(_tokenResponse: TokenResponse, profile?: unknown): Promise<string> {
    const p = profile as TrelloProfile | undefined;
    if (!p?.username) {
      throw new Error('Could not extract username from Trello profile');
    }
    return p.username;
  },

  extractDisplayName(_tokenResponse: TokenResponse, profile?: unknown): string | undefined {
    const p = profile as TrelloProfile | undefined;
    if (!p) return undefined;
    return p.fullName ? `${p.fullName} (${p.username})` : p.username;
  },
};
