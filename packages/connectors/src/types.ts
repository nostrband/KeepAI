/**
 * Types for the connectors package.
 * Handles OAuth2 authentication for external services (Gmail, Notion).
 */

export interface ConnectionId {
  service: string;
  accountId: string;
}

export function parseConnectionId(id: string): ConnectionId {
  const colonIndex = id.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Invalid connection ID format: ${id}`);
  }
  return {
    service: id.slice(0, colonIndex),
    accountId: id.slice(colonIndex + 1),
  };
}

export function formatConnectionId(id: ConnectionId): string {
  return `${id.service}:${id.accountId}`;
}

export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  extraAuthParams?: Record<string, string>;
  useBasicAuth?: boolean;
  revokeUrl?: string;
}

export interface OAuthAppCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
  metadata?: Record<string, unknown>;
}

export type ConnectionStatus = 'connected' | 'expired' | 'error' | 'disconnected';

export interface Connection {
  id: string;
  service: string;
  accountId: string;
  status: ConnectionStatus;
  label?: string;
  error?: string;
  createdAt: number;
  lastUsedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface OAuthCallbackResult {
  success: boolean;
  connection?: Connection;
  error?: string;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  icon?: string;
  oauthConfig: OAuthConfig;
  extractAccountId: (
    tokenResponse: TokenResponse,
    profile?: unknown
  ) => Promise<string>;
  extractDisplayName?: (
    tokenResponse: TokenResponse,
    profile?: unknown
  ) => string | undefined;
  fetchProfile?: (accessToken: string) => Promise<unknown>;
  supportsRefresh?: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string;
  bot_id?: string;
  owner?: unknown;
  [key: string]: unknown;
}

export interface ConnectionDb {
  getConnection(id: string): Promise<Connection | null>;
  listConnections(service?: string): Promise<Connection[]>;
  upsertConnection(connection: Connection): Promise<void>;
  deleteConnection(id: string): Promise<void>;
  updateLastUsed(id: string, timestamp: number): Promise<void>;
}
