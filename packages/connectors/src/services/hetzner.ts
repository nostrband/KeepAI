/**
 * Hetzner Cloud service definition — manual API token entry.
 *
 * Auth flow: user copies their API token from the Hetzner Cloud Console
 * (https://console.hetzner.cloud → project → Security → API Tokens)
 * and pastes it into KeepAI.
 */

import type { ServiceDefinition, TokenResponse } from '../types.js';

const HETZNER_API = 'https://api.hetzner.cloud/v1';

export const hetznerService: ServiceDefinition = {
  id: 'hetzner',
  name: 'Hetzner Cloud',
  icon: 'hetzner',

  // No OAuth — manual API token entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Go to your Hetzner Cloud Console → your project → Security → API Tokens, then generate a Read & Write token.',
    consoleUrl: 'https://console.hetzner.cloud',
    fields: [
      {
        key: 'apiToken',
        label: 'API Token',
        placeholder: 'Paste your API token here',
        secret: true,
      },
      {
        key: 'projectName',
        label: 'Project Name',
        placeholder: 'e.g. my-production-cluster',
        secret: false,
        required: false,
      },
    ],
    validateCredentials: async (creds) => {
      const res = await fetch(`${HETZNER_API}/servers?per_page=1`, {
        headers: { Authorization: `Bearer ${creds.apiToken}` },
      });
      if (!res.ok) {
        throw new Error(`Invalid token: ${res.status} ${res.statusText}`);
      }
      const projectName = creds.projectName?.trim();
      return {
        accountId: projectName
          ? projectName.toLowerCase().replace(/\s+/g, '-')
          : 'hetzner-project',
        displayName: projectName || 'Hetzner Cloud Project',
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('Hetzner uses manualTokenAuth — extractAccountId should not be called');
  },
};
