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

export function getNotionCredentials(): OAuthAppCredentials {
  return {
    clientId: process.env.NOTION_CLIENT_ID || '',
    clientSecret: process.env.NOTION_CLIENT_SECRET || '',
  };
}

export function getCredentialsForService(service: string): OAuthAppCredentials {
  switch (service) {
    case 'gmail':
      return getGoogleCredentials();
    case 'notion':
      return getNotionCredentials();
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

export function hasCredentialsForService(service: string): boolean {
  const creds = getCredentialsForService(service);
  return Boolean(creds.clientId && creds.clientSecret);
}
