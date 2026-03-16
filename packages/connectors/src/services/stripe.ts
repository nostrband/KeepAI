/**
 * Stripe service definition — manual API key entry.
 *
 * Auth flow: user copies their Secret Key from the Stripe Dashboard
 * (https://dashboard.stripe.com/apikeys) and pastes it into KeepAI.
 * Optionally, a Connected Account ID can be provided for Connect platforms.
 */

import Stripe from 'stripe';
import type { ServiceDefinition, TokenResponse } from '../types.js';

export const stripeService: ServiceDefinition = {
  id: 'stripe',
  name: 'Stripe',
  icon: 'stripe',

  // No OAuth — manual API key entry
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions:
      'Go to your Stripe Dashboard → Developers → API keys, then copy your Secret key below.',
    consoleUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      {
        key: 'apiKey',
        label: 'Secret Key',
        placeholder: 'sk_live_... or sk_test_...',
        secret: true,
      },
      {
        key: 'accountId',
        label: 'Connected Account ID (optional)',
        placeholder: 'acct_... (for Connect platforms)',
        required: false,
      },
    ],
    validateCredentials: async (creds) => {
      const stripe = new Stripe(creds.apiKey);
      const account = creds.accountId
        ? await stripe.accounts.retrieve(creds.accountId)
        : await stripe.accounts.retrieve();
      const name =
        account.settings?.dashboard?.display_name ||
        account.business_profile?.name ||
        account.email ||
        account.id;
      return {
        accountId: account.id,
        displayName: `${name} (${account.id})`,
      };
    },
  },

  async extractAccountId(_tokenResponse: TokenResponse): Promise<string> {
    throw new Error('Stripe uses manualTokenAuth — extractAccountId should not be called');
  },
};
