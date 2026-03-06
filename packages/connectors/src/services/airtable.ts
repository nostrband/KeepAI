import type { ServiceDefinition, TokenResponse } from '../types.js';

export interface AirtableProfile {
  id: string;
  email?: string;
  scopes: string[];
}

export async function fetchAirtableProfile(
  accessToken: string
): Promise<AirtableProfile> {
  const response = await fetch('https://api.airtable.com/v0/meta/whoami', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Airtable profile: ${response.status}`);
  }

  return response.json();
}

export const airtableService: ServiceDefinition = {
  id: 'airtable',
  name: 'Airtable',
  icon: 'table',
  oauthConfig: {
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    scopes: [
      'data.records:read',
      'data.records:write',
      'data.recordComments:read',
      'data.recordComments:write',
      'schema.bases:read',
      'schema.bases:write',
      'webhook:manage',
      'user.email:read',
    ],
    pkce: true,
  },
  supportsRefresh: true,
  fetchProfile: fetchAirtableProfile,
  async extractAccountId(
    _tokenResponse: TokenResponse,
    profile?: unknown
  ): Promise<string> {
    const p = profile as AirtableProfile | undefined;
    if (!p?.id) {
      throw new Error('Could not extract user ID from Airtable profile');
    }
    // Prefer email (human-readable, stable) — same pattern as Gmail
    return p.email || p.id;
  },
  extractDisplayName(
    _tokenResponse: TokenResponse,
    profile?: unknown
  ): string | undefined {
    const p = profile as AirtableProfile | undefined;
    return p?.email || p?.id;
  },
};
