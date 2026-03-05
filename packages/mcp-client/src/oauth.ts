// MCP OAuth Client — discovery, dynamic registration, PKCE auth, token exchange/refresh

import { randomBytes, createHash } from 'crypto';
import type { OAuthMetadata, OAuthRegistration, McpTokens } from './types.js';

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64url(createHash('sha256').update(verifier).digest());
}

export class McpOAuthClient {
  static async discover(serverUrl: string): Promise<OAuthMetadata> {
    const url = `${serverUrl}/.well-known/oauth-authorization-server`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OAuth discovery failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as OAuthMetadata;
  }

  static async register(
    registrationEndpoint: string,
    redirectUri: string,
    clientName: string
  ): Promise<OAuthRegistration> {
    const res = await fetch(registrationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: clientName,
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });

    if (!res.ok) {
      throw new Error(`OAuth registration failed: ${res.status} ${await res.text()}`);
    }

    return (await res.json()) as OAuthRegistration;
  }

  static buildAuthUrl(
    authorizationEndpoint: string,
    clientId: string,
    redirectUri: string,
    state: string,
    scopes?: string[]
  ): { url: string; codeVerifier: string } {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (scopes && scopes.length > 0) {
      params.set('scope', scopes.join(' '));
    }

    return {
      url: `${authorizationEndpoint}?${params.toString()}`,
      codeVerifier,
    };
  }

  static async exchangeCode(
    tokenUrl: string,
    clientId: string,
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<McpTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
    }

    return (await res.json()) as McpTokens;
  }

  static async refreshToken(
    tokenUrl: string,
    clientId: string,
    refreshToken: string
  ): Promise<McpTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    }

    return (await res.json()) as McpTokens;
  }
}
