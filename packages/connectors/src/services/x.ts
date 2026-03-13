/**
 * X (Twitter) service definition — manual OAuth 1.0a credential entry.
 *
 * Auth flow: user creates an API project at console.x.com, generates
 * OAuth 1.0a credentials (API Key, API Key Secret, Access Token,
 * Access Token Secret), and pastes them into KeepAI.
 */

import { Client, OAuth1 } from '@xdevplatform/xdk';
import type { ServiceDefinition, TokenResponse } from '../types.js';

export const xService: ServiceDefinition = {
  id: 'x',
  name: 'X',
  icon: 'x',

  // Placeholder — manual token auth, not OAuth managed by KeepAI
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Create an API project at console.x.com, then go to Keys and Tokens to generate all 4 values below.',
    consoleUrl: 'https://console.x.com/',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Consumer Key' },
      {
        key: 'apiSecret',
        label: 'API Key Secret',
        placeholder: 'Consumer Secret',
        secret: true,
      },
      {
        key: 'accessToken',
        label: 'Access Token',
        placeholder: 'User access token',
      },
      {
        key: 'accessTokenSecret',
        label: 'Access Token Secret',
        placeholder: 'User access token secret',
        secret: true,
      },
    ],
    validateCredentials: async (creds) => {
      const client = new Client({
        oauth1: new OAuth1({
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          accessToken: creds.accessToken,
          accessTokenSecret: creds.accessTokenSecret,
          callback: 'oob',
        }),
      });
      const me = await client.users.getMe();
      if (!me?.data) {
        throw new Error('Failed to validate X credentials: no user data returned');
      }
      return {
        accountId: me.data.username,
        displayName: `${me.data.name} (@${me.data.username})`,
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('X uses manualTokenAuth — extractAccountId should not be called');
  },
};
