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

export function getCredentialsForService(service: string): OAuthAppCredentials {
  switch (service) {
    case 'gmail':
      return getGoogleCredentials();
    case 'github':
      return getGitHubCredentials();
    default:
      throw new Error(`Unknown service or MCP-based service: ${service}`);
  }
}

export function hasCredentialsForService(service: string): boolean {
  try {
    const creds = getCredentialsForService(service);
    return Boolean(creds.clientId && creds.clientSecret);
  } catch {
    // MCP-based services don't need build-time credentials
    return false;
  }
}
