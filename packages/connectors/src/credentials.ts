/**
 * OAuth app credentials bundled at build time.
 * Values are replaced by tsup's define option from secrets.build.json or env vars.
 */

import type { OAuthAppCredentials } from './types.js';

export function getGoogleCredentials(): OAuthAppCredentials {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  };
}

export function getGitHubCredentials(): OAuthAppCredentials {
  return {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  };
}

export function getAirtableCredentials(): OAuthAppCredentials {
  return {
    clientId: process.env.AIRTABLE_CLIENT_ID || '',
    clientSecret: '', // Public client — no secret for desktop apps
  };
}

export function getTrelloCredentials(): OAuthAppCredentials {
  return {
    clientId: process.env.TRELLO_API_KEY || '',
    clientSecret: '', // Not needed — Trello uses token-based auth, no secret required
  };
}

export function getCredentialsForService(service: string): OAuthAppCredentials {
  switch (service) {
    case 'gmail':
      return getGoogleCredentials();
    case 'github':
      return getGitHubCredentials();
    case 'airtable':
      return getAirtableCredentials();
    case 'trello':
      return getTrelloCredentials();
    default:
      throw new Error(`Unknown service or MCP-based service: ${service}`);
  }
}

export function hasCredentialsForService(service: string): boolean {
  try {
    const creds = getCredentialsForService(service);
    return Boolean(creds.clientId);
  } catch {
    // MCP-based services don't need build-time credentials
    return false;
  }
}
