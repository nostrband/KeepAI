/**
 * Cloudflare service definition — manual API token entry.
 *
 * Auth flow: user copies their API token from the Cloudflare Dashboard
 * (https://dash.cloudflare.com/profile/api-tokens)
 * and pastes it into KeepAI.
 */

import type { ServiceDefinition, TokenResponse } from '../types.js';

const CF_API = 'https://api.cloudflare.com/client/v4';

export const cloudflareService: ServiceDefinition = {
  id: 'cloudflare',
  name: 'Cloudflare',
  icon: 'cloudflare',

  // No OAuth — manual API token entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Go to your Cloudflare Dashboard → My Profile → API Tokens, then create a token with the permissions you need.',
    consoleUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    fields: [
      {
        key: 'apiToken',
        label: 'API Token',
        placeholder: 'Paste your API token here',
        secret: true,
      },
    ],
    validateCredentials: async (creds) => {
      // Strip smart quotes and other non-ASCII chars that sneak in from copy-paste
      const apiToken = creds.apiToken.replace(/[^\x20-\x7E]/g, '').trim();
      if (!apiToken) throw new Error('API token is empty');
      const headers = { Authorization: `Bearer ${apiToken}` };

      // Fetch accounts list — works for both user-level and account-scoped (cfat_) tokens
      const res = await fetch(`${CF_API}/accounts?per_page=1`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any;
        throw new Error(body?.errors?.[0]?.message || `Invalid API token (${res.status})`);
      }
      const data = await res.json() as { result?: Array<{ id: string; name: string }> };
      const account = data.result?.[0];
      if (!account) throw new Error('Token is valid but has no account access');

      return {
        accountId: account.id,
        displayName: account.name || 'Cloudflare Account',
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('Cloudflare uses manualTokenAuth — extractAccountId should not be called');
  },
};
