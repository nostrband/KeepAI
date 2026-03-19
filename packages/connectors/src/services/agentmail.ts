/**
 * AgentMail service definition — manual API key entry.
 *
 * Auth flow: user copies their API key from the AgentMail dashboard
 * and pastes it into KeepAI. Keys can be scoped to org, pod, or inbox.
 */

import type { ServiceDefinition, TokenResponse } from '../types.js';

const AGENTMAIL_API = 'https://api.agentmail.to/v0';

export const agentmailService: ServiceDefinition = {
  id: 'agentmail',
  name: 'AgentMail',
  icon: 'agentmail',

  // No OAuth — manual API key entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Go to your AgentMail dashboard → API Keys, then create a new key.',
    consoleUrl: 'https://app.agentmail.to',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        placeholder: 'Paste your API key here',
        secret: true,
      },
    ],
    validateCredentials: async (creds) => {
      const res = await fetch(`${AGENTMAIL_API}/organizations`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (!res.ok) {
        throw new Error(`Invalid API key: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as {
        organization_id: string;
      };
      return {
        accountId: data.organization_id,
        displayName: `AgentMail (${data.organization_id})`,
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('AgentMail uses manualTokenAuth — extractAccountId should not be called');
  },
};
