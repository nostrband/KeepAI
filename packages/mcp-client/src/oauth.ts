// MCP OAuth Client — discovery, dynamic registration, PKCE auth, token exchange/refresh
// Supports RFC 9728 (Protected Resource Metadata) and RFC 8414 (Authorization Server Metadata)

import { randomBytes, createHash } from 'crypto';
import type { OAuthMetadata, OAuthRegistration, McpTokens, ProtectedResourceMetadata } from './types.js';

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64url(createHash('sha256').update(verifier).digest());
}

export interface McpDiscoveryResult {
  metadata: OAuthMetadata;
  resourceMetadata?: ProtectedResourceMetadata;
}

export class McpOAuthClient {
  /**
   * Discover OAuth metadata for an MCP server.
   *
   * Tries three strategies in order:
   * 1. RFC 9728: Probe the MCP endpoint for a `resource_metadata` URL in the
   *    WWW-Authenticate header, then follow to the authorization server via
   *    path-aware RFC 8414.
   * 2. Direct: `{serverUrl}/.well-known/oauth-authorization-server` (Notion-style).
   * 3. Fallback: RFC 8414 from the authorization server URL found in resource metadata.
   */
  static async discover(serverUrl: string, mcpEndpoint = '/mcp'): Promise<McpDiscoveryResult> {
    // Strategy 1: RFC 9728 — probe the MCP endpoint for resource metadata
    const resourceMeta = await this.discoverProtectedResource(serverUrl, mcpEndpoint);
    if (resourceMeta?.authorization_servers?.[0]) {
      const authServerUrl = resourceMeta.authorization_servers[0];
      const metadata = await this.discoverAuthServer(authServerUrl);
      if (metadata) {
        // Merge scopes from resource metadata if the auth server doesn't list them
        if (!metadata.scopes_supported && resourceMeta.scopes_supported) {
          metadata.scopes_supported = resourceMeta.scopes_supported;
        }
        return { metadata, resourceMetadata: resourceMeta };
      }
    }

    // Strategy 2: Direct well-known on the MCP server itself (Notion-style)
    const directUrl = `${serverUrl}/.well-known/oauth-authorization-server`;
    const directRes = await fetch(directUrl);
    if (directRes.ok) {
      const metadata = (await directRes.json()) as OAuthMetadata;
      return { metadata };
    }

    throw new Error(
      `OAuth discovery failed for ${serverUrl}: no resource metadata or authorization server found`
    );
  }

  /**
   * RFC 9728: Fetch protected resource metadata by probing the MCP endpoint.
   * Looks for `resource_metadata` in the WWW-Authenticate header of a 401 response.
   */
  static async discoverProtectedResource(
    serverUrl: string,
    mcpEndpoint: string
  ): Promise<ProtectedResourceMetadata | null> {
    try {
      const probeRes = await fetch(`${serverUrl}${mcpEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (probeRes.status === 401) {
        const wwwAuth = probeRes.headers.get('www-authenticate') ?? '';
        const match = wwwAuth.match(/resource_metadata="([^"]+)"/);
        if (match) {
          const metaRes = await fetch(match[1]);
          if (metaRes.ok) {
            return (await metaRes.json()) as ProtectedResourceMetadata;
          }
        }
      }
    } catch {
      // Probe failed — fall through to other strategies
    }
    return null;
  }

  /**
   * RFC 8414: Discover authorization server metadata.
   * Supports path-aware discovery (e.g. `https://github.com/login/oauth`
   * → `https://github.com/.well-known/oauth-authorization-server/login/oauth`).
   */
  static async discoverAuthServer(authServerUrl: string): Promise<OAuthMetadata | null> {
    const parsed = new URL(authServerUrl);
    const pathSuffix = parsed.pathname === '/' ? '' : parsed.pathname;

    // Path-aware: /.well-known/oauth-authorization-server{path}
    const pathAwareUrl = `${parsed.origin}/.well-known/oauth-authorization-server${pathSuffix}`;
    try {
      const res = await fetch(pathAwareUrl);
      if (res.ok) {
        return (await res.json()) as OAuthMetadata;
      }
    } catch {
      // Fall through
    }

    // Root-level fallback (only if there was a path)
    if (pathSuffix) {
      const rootUrl = `${parsed.origin}/.well-known/oauth-authorization-server`;
      try {
        const res = await fetch(rootUrl);
        if (res.ok) {
          return (await res.json()) as OAuthMetadata;
        }
      } catch {
        // Fall through
      }
    }

    return null;
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
    scopes?: string[],
    extraParams?: Record<string, string>
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

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
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
    codeVerifier: string,
    clientSecret?: string
  ): Promise<McpTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as McpTokens & { error?: string; error_description?: string };

    // Some providers (GitHub) return HTTP 200 with an error body
    if (data.error) {
      throw new Error(`Token exchange failed: ${data.error} — ${data.error_description ?? ''}`);
    }

    return data;
  }

  static async refreshToken(
    tokenUrl: string,
    clientId: string,
    refreshToken: string,
    clientSecret?: string
  ): Promise<McpTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as McpTokens & { error?: string; error_description?: string };

    if (data.error) {
      throw new Error(`Token refresh failed: ${data.error} — ${data.error_description ?? ''}`);
    }

    return data;
  }
}
