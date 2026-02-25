/**
 * Generic OAuth2 flow handler.
 * Supports both standard OAuth2 (Google) and Basic auth token exchange (Notion).
 */

import {
  AuthError,
  InternalError,
  NetworkError,
  classifyHttpError,
  type ClassifiedError,
} from '@keepai/proto';
import type { OAuthConfig, OAuthCredentials, TokenResponse } from './types.js';

export type RevokeResult = {
  success: boolean;
  reason: 'revoked' | 'not_supported' | 'failed';
};

function classifyOAuthError(
  statusCode: number,
  errorCode: string | undefined,
  userMessage: string,
  options: { source: string; cause: Error }
): ClassifiedError {
  switch (errorCode) {
    case 'invalid_grant':
    case 'access_denied':
    case 'login_required':
    case 'consent_required':
    case 'interaction_required':
      return new AuthError(userMessage, { ...options, serviceId: '', accountId: '', errorCode });

    case 'invalid_client':
    case 'unauthorized_client':
    case 'unsupported_grant_type':
    case 'invalid_scope':
      return new InternalError(userMessage, options);

    case 'server_error':
    case 'temporarily_unavailable':
      return new NetworkError(userMessage, { ...options, statusCode });
  }

  if (statusCode === 401) {
    return new AuthError(userMessage, { ...options, serviceId: '', accountId: '' });
  }

  return classifyHttpError(statusCode, userMessage, options);
}

export class OAuthHandler {
  constructor(
    private config: OAuthConfig,
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
    });

    if (this.config.scopes.length > 0) {
      params.set('scope', this.config.scopes.join(' '));
    }

    if (state) {
      params.set('state', state);
    }

    if (this.config.extraAuthParams) {
      for (const [key, value] of Object.entries(this.config.extraAuthParams)) {
        params.set(key, value);
      }
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.config.useBasicAuth) {
      const basicAuth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    } else {
      body.set('client_id', this.clientId);
      body.set('client_secret', this.clientSecret);
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorCode = parseOAuthErrorCode(errorText);
      const userMessage = getOAuthUserMessage(errorCode);
      throw classifyOAuthError(response.status, errorCode, userMessage, {
        source: 'oauth.exchangeCode',
        cause: new Error(`Token exchange failed: ${response.status} - ${errorText}`),
      });
    }

    return (await response.json()) as TokenResponse;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.config.useBasicAuth) {
      const basicAuth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    } else {
      body.set('client_id', this.clientId);
      body.set('client_secret', this.clientSecret);
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorCode = parseOAuthErrorCode(errorText);
      const userMessage = getOAuthUserMessage(errorCode);
      throw classifyOAuthError(response.status, errorCode, userMessage, {
        source: 'oauth.refreshToken',
        cause: new Error(`Token refresh failed: ${response.status} - ${errorText}`),
      });
    }

    return (await response.json()) as TokenResponse;
  }

  async revokeToken(accessToken: string): Promise<RevokeResult> {
    if (!this.config.revokeUrl) {
      return { success: true, reason: 'not_supported' };
    }

    try {
      const body = new URLSearchParams({ token: accessToken });

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (this.config.useBasicAuth) {
        const basicAuth = Buffer.from(
          `${this.clientId}:${this.clientSecret}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
      } else {
        body.set('client_id', this.clientId);
        body.set('client_secret', this.clientSecret);
      }

      const response = await fetch(this.config.revokeUrl, {
        method: 'POST',
        headers,
        body: body.toString(),
      });

      if (response.ok) {
        return { success: true, reason: 'revoked' };
      }

      return { success: false, reason: 'failed' };
    } catch {
      return { success: false, reason: 'failed' };
    }
  }
}

export function tokenResponseToCredentials(
  response: TokenResponse
): OAuthCredentials {
  const credentials: OAuthCredentials = {
    accessToken: response.access_token,
    tokenType: response.token_type,
    scope: response.scope,
  };

  if (response.refresh_token) {
    credentials.refreshToken = response.refresh_token;
  }

  if (response.expires_in) {
    credentials.expiresAt = Date.now() + response.expires_in * 1000;
  }

  const metadata: Record<string, unknown> = {};

  if (response.workspace_id) metadata.workspace_id = response.workspace_id;
  if (response.workspace_name) metadata.workspace_name = response.workspace_name;
  if (response.workspace_icon) metadata.workspace_icon = response.workspace_icon;
  if (response.bot_id) metadata.bot_id = response.bot_id;
  if (response.owner) metadata.owner = response.owner;

  if (Object.keys(metadata).length > 0) {
    credentials.metadata = metadata;
  }

  return credentials;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_grant: 'Authorization expired or invalid. Please try connecting again.',
  invalid_client: 'OAuth configuration error. Please contact support.',
  access_denied: 'Access was denied. Please try again and approve all permissions.',
  invalid_request: 'Invalid request. Please try connecting again.',
  unauthorized_client: 'This app is not authorized. Please contact support.',
  unsupported_grant_type: 'OAuth configuration error. Please contact support.',
  invalid_scope: 'The requested permissions are not available. Please contact support.',
  server_error: 'The service is temporarily unavailable. Please try again later.',
  temporarily_unavailable: 'The service is temporarily unavailable. Please try again later.',
  interaction_required: 'Please complete the sign-in process in the browser.',
  login_required: 'Please sign in to continue.',
  consent_required: 'Please approve the requested permissions to continue.',
};

const DEFAULT_OAUTH_ERROR_MESSAGE = 'An authentication error occurred. Please try connecting again.';

function parseOAuthErrorCode(responseBody: string): string | undefined {
  try {
    const data = JSON.parse(responseBody);
    return data.error;
  } catch {
    return undefined;
  }
}

function getOAuthUserMessage(errorCode: string | undefined): string {
  if (errorCode && OAUTH_ERROR_MESSAGES[errorCode]) {
    return OAUTH_ERROR_MESSAGES[errorCode];
  }
  return DEFAULT_OAUTH_ERROR_MESSAGE;
}
