/**
 * ConnectionManager - Central class for OAuth connection orchestration.
 */

import { randomUUID } from 'crypto';
import { AuthError, isClassifiedError } from '@keepai/proto';
import { McpOAuthClient, McpSession } from '@keepai/mcp-client';
import { OAuthHandler, tokenResponseToCredentials } from './oauth.js';
import { getCredentialsForService } from './credentials.js';
import type {
  Connection,
  ConnectionDb,
  ConnectionId,
  OAuthCallbackResult,
  OAuthCredentials,
  ServiceDefinition,
} from './types.js';

const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const STATE_TTL_MS = 5 * 60 * 1000;
const MAX_PENDING_STATES = 100;
const STATE_CLEANUP_INTERVAL_MS = 60 * 1000;
const ALLOWED_REDIRECT_HOSTS = ['127.0.0.1', 'localhost'];

interface PendingState {
  service: string;
  redirectUri: string;
  timestamp: number;
  // MCP OAuth fields
  codeVerifier?: string;
  mcpClientId?: string;
  mcpTokenUrl?: string;
  mcpServerUrl?: string;
  /** Token auth flow: the "code" is the access token itself (no exchange needed). */
  tokenAuthDirect?: boolean;
}

export class ConnectionManager {
  private services = new Map<string, ServiceDefinition>();
  private pendingStates = new Map<string, PendingState>();
  private refreshPromises = new Map<string, Promise<OAuthCredentials>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private db: ConnectionDb
  ) {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredStates();
    }, STATE_CLEANUP_INTERVAL_MS);
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  registerService(service: ServiceDefinition): void {
    this.services.set(service.id, service);
  }

  getServices(): ServiceDefinition[] {
    return Array.from(this.services.values());
  }

  getService(serviceId: string): ServiceDefinition | undefined {
    return this.services.get(serviceId);
  }

  private isAllowedRedirectUri(redirectUri: string): boolean {
    try {
      const url = new URL(redirectUri);
      return ALLOWED_REDIRECT_HOSTS.includes(url.hostname);
    } catch {
      return false;
    }
  }

  async startOAuthFlow(
    serviceId: string,
    redirectUri: string
  ): Promise<{ authUrl: string; state: string }> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Unknown service: ${serviceId}`);
    }

    if (!this.isAllowedRedirectUri(redirectUri)) {
      throw new Error(`Invalid redirect URI: ${redirectUri}`);
    }

    this.cleanupExpiredStates();

    if (this.pendingStates.size >= MAX_PENDING_STATES) {
      let oldestState: string | null = null;
      let oldestTimestamp = Infinity;
      for (const [state, data] of this.pendingStates) {
        if (data.timestamp < oldestTimestamp) {
          oldestTimestamp = data.timestamp;
          oldestState = state;
        }
      }
      if (oldestState) {
        this.pendingStates.delete(oldestState);
      }
    }

    const state = randomUUID();

    // MCP OAuth path
    if (service.mcpOAuth) {
      const mcpEndpoint = service.mcpOAuth.mcpEndpoint ?? '/mcp';
      const discovery = await McpOAuthClient.discover(service.mcpOAuth.serverUrl, mcpEndpoint);
      const metadata = discovery.metadata;

      let mcpClientId: string;

      if (service.mcpOAuth.clientId) {
        // Pre-registered client (e.g. GitHub — no DCR)
        mcpClientId = service.mcpOAuth.clientId;
      } else if (metadata.registration_endpoint) {
        // Dynamic client registration
        const registration = await McpOAuthClient.register(
          metadata.registration_endpoint,
          redirectUri,
          service.mcpOAuth.clientName
        );
        mcpClientId = registration.client_id;
      } else {
        throw new Error(`MCP server at ${service.mcpOAuth.serverUrl} does not support dynamic registration and no client_id configured`);
      }

      const scopes = service.mcpOAuth.scopes ?? metadata.scopes_supported;

      const { url: authUrl, codeVerifier } = McpOAuthClient.buildAuthUrl(
        metadata.authorization_endpoint,
        mcpClientId,
        redirectUri,
        state,
        scopes,
        service.mcpOAuth.extraAuthParams
      );

      this.pendingStates.set(state, {
        service: serviceId,
        redirectUri,
        timestamp: Date.now(),
        codeVerifier,
        mcpClientId,
        mcpTokenUrl: metadata.token_endpoint,
        mcpServerUrl: service.mcpOAuth.serverUrl,
      });

      return { authUrl, state };
    }

    // Token auth path (e.g. Trello) — token returned directly in URL fragment
    if (service.tokenAuth) {
      const { clientId: apiKey } = getCredentialsForService(serviceId);
      if (!apiKey) {
        throw new Error(
          `OAuth credentials not configured for ${serviceId}. ` +
            'Check secrets.build.json or environment variables.'
        );
      }

      const params = new URLSearchParams({
        response_type: 'token',
        key: apiKey,
        callback_method: 'fragment',
        return_url: `${redirectUri}?state=${state}`,
        ...service.tokenAuth.authorizeParams,
      });

      const authUrl = `${service.tokenAuth.authorizeUrl}?${params.toString()}`;

      this.pendingStates.set(state, {
        service: serviceId,
        redirectUri,
        timestamp: Date.now(),
        tokenAuthDirect: true,
      });

      return { authUrl, state };
    }

    // Standard OAuth 2.0 path
    const { clientId, clientSecret } = getCredentialsForService(serviceId);
    if (!clientId) {
      throw new Error(
        `OAuth credentials not configured for ${serviceId}. ` +
          'Check secrets.build.json or environment variables.'
      );
    }

    const handler = new OAuthHandler(
      service.oauthConfig,
      clientId,
      clientSecret,
      redirectUri
    );

    const { url: authUrl, codeVerifier } = handler.getAuthUrl(state);

    this.pendingStates.set(state, {
      service: serviceId,
      redirectUri,
      timestamp: Date.now(),
      codeVerifier,
    });

    return { authUrl, state };
  }

  async completeOAuthFlow(
    serviceId: string,
    code: string,
    state: string
  ): Promise<OAuthCallbackResult> {
    const pending = this.pendingStates.get(state);
    this.pendingStates.delete(state);

    if (!pending) {
      return { success: false, error: 'Invalid or expired state' };
    }

    if (Date.now() - pending.timestamp > STATE_TTL_MS) {
      return { success: false, error: 'OAuth flow expired, please try again' };
    }

    if (pending.service !== serviceId) {
      return { success: false, error: 'State mismatch' };
    }

    if (!this.isAllowedRedirectUri(pending.redirectUri)) {
      return { success: false, error: 'Invalid redirect URI' };
    }

    const service = this.services.get(serviceId);
    if (!service) {
      return { success: false, error: `Unknown service: ${serviceId}` };
    }

    try {
      let credentials: OAuthCredentials;
      let accountId: string;
      let metadata: Record<string, unknown> = {};

      if (pending.tokenAuthDirect) {
        // Token auth path (e.g. Trello) — `code` is the access token itself
        credentials = {
          accessToken: code,
        };

        let profile: unknown;
        if (service.fetchProfile) {
          try {
            profile = await service.fetchProfile(credentials.accessToken);
          } catch {
            // Profile fetch is optional
          }
        }

        const tokenShim = { access_token: code } as import('./types.js').TokenResponse;
        accountId = await service.extractAccountId(tokenShim, profile);

        if (service.extractDisplayName) {
          const displayName = service.extractDisplayName(tokenShim, profile);
          if (displayName) {
            metadata.displayName = displayName;
          }
        }
        credentials.metadata = metadata;
      } else if (pending.codeVerifier && pending.mcpClientId && pending.mcpTokenUrl) {
        // MCP OAuth path
        const mcpTokens = await McpOAuthClient.exchangeCode(
          pending.mcpTokenUrl,
          pending.mcpClientId,
          code,
          pending.redirectUri,
          pending.codeVerifier,
          service.mcpOAuth?.clientSecret
        );

        credentials = {
          accessToken: mcpTokens.access_token,
          tokenType: mcpTokens.token_type,
        };
        if (mcpTokens.refresh_token) {
          credentials.refreshToken = mcpTokens.refresh_token;
        }
        if (mcpTokens.expires_in) {
          credentials.expiresAt = Date.now() + mcpTokens.expires_in * 1000;
        }

        metadata.mcpClientId = pending.mcpClientId;
        metadata.mcpServerUrl = pending.mcpServerUrl;
        metadata.mcpTokenUrl = pending.mcpTokenUrl;

        // Extract account ID via MCP session
        if (service.mcpExtractAccountId) {
          const mcpEndpoint = service.mcpOAuth?.mcpEndpoint ?? '/mcp';
          const tempSession = new McpSession(
            pending.mcpServerUrl!,
            mcpEndpoint,
            () => credentials.accessToken
          );
          await tempSession.initialize();
          const accountInfo = await service.mcpExtractAccountId(tempSession);
          accountId = accountInfo.accountId;
          if (accountInfo.displayName) {
            metadata.displayName = accountInfo.displayName;
          }
        } else {
          accountId = 'default';
        }

        credentials.metadata = metadata;
      } else {
        // Standard OAuth path
        const { clientId, clientSecret } = getCredentialsForService(serviceId);

        const handler = new OAuthHandler(
          service.oauthConfig,
          clientId,
          clientSecret,
          pending.redirectUri
        );

        const tokenResponse = await handler.exchangeCode(code, pending.codeVerifier);
        credentials = tokenResponseToCredentials(tokenResponse);

        let profile: unknown;
        if (service.fetchProfile) {
          try {
            profile = await service.fetchProfile(credentials.accessToken);
          } catch {
            // Profile fetch is optional
          }
        }

        accountId = await service.extractAccountId(tokenResponse, profile);

        metadata = { ...credentials.metadata };
        if (service.extractDisplayName) {
          const displayName = service.extractDisplayName(tokenResponse, profile);
          if (displayName) {
            metadata.displayName = displayName;
          }
        }
        credentials.metadata = metadata;
      }

      // Reuse existing UUID if re-authenticating, otherwise generate new one
      const existing = await this.db.getConnectionByServiceAccount(serviceId, accountId);
      const now = Date.now();
      const connection: Connection = {
        id: existing?.id ?? randomUUID(),
        service: serviceId,
        accountId,
        status: 'connected',
        label: existing?.label,
        error: undefined,
        createdAt: existing?.createdAt ?? now,
        lastUsedAt: existing?.lastUsedAt,
        metadata,
      };

      await this.db.upsertConnection(connection);
      await this.db.saveCredentials(serviceId, accountId, credentials);

      return { success: true, connection };
    } catch (err) {
      let userMessage: string;
      if (isClassifiedError(err)) {
        userMessage = err.message;
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        userMessage = `Authentication error: ${detail}`;
      }

      return { success: false, error: userMessage };
    }
  }

  /**
   * Connect a service using manually-entered credentials (e.g. X OAuth 1.0a keys).
   * Validates credentials via the service's manualTokenAuth config, then stores them.
   */
  async connectManualToken(
    serviceId: string,
    credentials: Record<string, string>
  ): Promise<OAuthCallbackResult> {
    const service = this.services.get(serviceId);
    if (!service) {
      return { success: false, error: `Unknown service: ${serviceId}` };
    }

    if (!service.manualTokenAuth) {
      return { success: false, error: `Service ${serviceId} does not support manual token auth` };
    }

    // Validate all required fields are present
    for (const field of service.manualTokenAuth.fields) {
      if (!credentials[field.key]) {
        return { success: false, error: `Missing required field: ${field.label}` };
      }
    }

    try {
      const { accountId, displayName } = await service.manualTokenAuth.validateCredentials(credentials);

      // Store credentials: accessToken is the main token, rest go in metadata
      const oauthCreds: OAuthCredentials = {
        accessToken: credentials.accessToken,
        metadata: {
          ...credentials,
          displayName,
        },
      };
      // Remove accessToken from metadata to avoid duplication
      delete (oauthCreds.metadata as Record<string, unknown>).accessToken;

      const existing = await this.db.getConnectionByServiceAccount(serviceId, accountId);
      const now = Date.now();
      const connection: Connection = {
        id: existing?.id ?? randomUUID(),
        service: serviceId,
        accountId,
        status: 'connected',
        label: existing?.label ?? displayName,
        error: undefined,
        createdAt: existing?.createdAt ?? now,
        lastUsedAt: existing?.lastUsedAt,
        metadata: { displayName },
      };

      await this.db.upsertConnection(connection);
      await this.db.saveCredentials(serviceId, accountId, oauthCreds);

      return { success: true, connection };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Credential validation failed: ${detail}` };
    }
  }

  async listConnections(): Promise<Connection[]> {
    return this.db.listConnections();
  }

  async listConnectionsByService(service: string): Promise<Connection[]> {
    return this.db.listConnections(service);
  }

  async getConnection(id: ConnectionId): Promise<Connection | null> {
    return this.db.getConnectionByServiceAccount(id.service, id.accountId);
  }

  async getConnectionById(id: string): Promise<Connection | null> {
    return this.db.getConnection(id);
  }

  async disconnect(id: ConnectionId, revokeToken = true): Promise<void> {
    const connection = await this.db.getConnectionByServiceAccount(id.service, id.accountId);

    if (revokeToken) {
      const service = this.services.get(id.service);
      if (service?.oauthConfig.revokeUrl) {
        try {
          const creds = await this.db.loadCredentials(id.service, id.accountId);
          if (creds?.accessToken) {
            const { clientId, clientSecret } = getCredentialsForService(id.service);
            const handler = new OAuthHandler(
              service.oauthConfig,
              clientId,
              clientSecret,
              ''
            );
            await handler.revokeToken(creds.accessToken);
          }
        } catch {
          // Log but don't fail
        }
      }
    }

    if (connection) {
      await this.db.deleteConnection(connection.id);
    }
  }

  async pauseConnection(id: ConnectionId): Promise<void> {
    const connection = await this.db.getConnectionByServiceAccount(id.service, id.accountId);
    if (connection && connection.status === 'connected') {
      await this.db.upsertConnection({ ...connection, status: 'paused' });
    }
  }

  async unpauseConnection(id: ConnectionId): Promise<void> {
    const connection = await this.db.getConnectionByServiceAccount(id.service, id.accountId);
    if (connection && connection.status === 'paused') {
      await this.db.upsertConnection({ ...connection, status: 'connected' });
    }
  }

  async updateLabel(id: ConnectionId, label: string): Promise<void> {
    const connection = await this.db.getConnectionByServiceAccount(id.service, id.accountId);
    if (connection) {
      await this.db.upsertConnection({ ...connection, label });
    }
  }

  async getCredentials(id: ConnectionId): Promise<OAuthCredentials> {
    const refreshKey = `${id.service}:${id.accountId}`;

    const creds = await this.db.loadCredentials(id.service, id.accountId);
    if (!creds) {
      throw new AuthError(`No credentials for ${id.service}:${id.accountId}`, {
        source: 'ConnectionManager.getCredentials',
        serviceId: id.service,
        accountId: id.accountId,
      });
    }

    const service = this.services.get(id.service);
    const supportsRefresh = service?.supportsRefresh !== false;

    if (creds.expiresAt && supportsRefresh) {
      const needsRefresh = creds.expiresAt < Date.now() + REFRESH_BUFFER_MS;

      if (needsRefresh) {
        if (!creds.refreshToken) {
          await this.markError(id, 'Token expired, no refresh token');
          throw new AuthError(`Token expired for ${id.service}:${id.accountId}`, {
            source: 'ConnectionManager.getCredentials',
            serviceId: id.service,
            accountId: id.accountId,
          });
        }

        const existingRefresh = this.refreshPromises.get(refreshKey);
        if (existingRefresh) {
          return existingRefresh;
        }

        const refreshPromise = this.refreshTokenInternal(id, creds)
          .then((refreshed) => {
            this.refreshPromises.delete(refreshKey);
            return refreshed;
          })
          .catch((err) => {
            this.refreshPromises.delete(refreshKey);
            throw err;
          });

        this.refreshPromises.set(refreshKey, refreshPromise);

        try {
          return await refreshPromise;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Token refresh failed';
          await this.markError(id, message);
          if (isClassifiedError(err)) {
            if (err instanceof AuthError) {
              throw new AuthError(err.message, {
                cause: err.cause instanceof Error ? err.cause : undefined,
                source: err.source,
                serviceId: id.service,
                accountId: id.accountId,
                errorCode: err.errorCode,
              });
            }
            throw err;
          }
          throw new AuthError(message, {
            source: 'ConnectionManager.getCredentials',
            serviceId: id.service,
            accountId: id.accountId,
            cause: err instanceof Error ? err : undefined,
          });
        }
      }
    }

    const connection = await this.db.getConnectionByServiceAccount(id.service, id.accountId);
    if (connection) {
      await this.db.updateLastUsed(connection.id, Date.now());
    }
    return creds;
  }

  private async refreshTokenInternal(
    id: ConnectionId,
    currentCreds: OAuthCredentials
  ): Promise<OAuthCredentials> {
    const service = this.services.get(id.service);
    if (!service) {
      throw new Error(`Unknown service: ${id.service}`);
    }

    // MCP OAuth refresh path
    const mcpClientId = currentCreds.metadata?.mcpClientId as string | undefined;
    const mcpTokenUrl = currentCreds.metadata?.mcpTokenUrl as string | undefined;

    if (mcpClientId && mcpTokenUrl) {
      // Get client_secret from service config (static, not stored per-connection)
      const mcpClientSecret = service.mcpOAuth?.clientSecret;

      const mcpTokens = await McpOAuthClient.refreshToken(
        mcpTokenUrl,
        mcpClientId,
        currentCreds.refreshToken!,
        mcpClientSecret
      );

      const newCreds: OAuthCredentials = {
        accessToken: mcpTokens.access_token,
        tokenType: mcpTokens.token_type,
        refreshToken: mcpTokens.refresh_token ?? currentCreds.refreshToken,
        metadata: currentCreds.metadata,
      };
      if (mcpTokens.expires_in) {
        newCreds.expiresAt = Date.now() + mcpTokens.expires_in * 1000;
      }

      await this.db.saveCredentials(id.service, id.accountId, newCreds);
      return newCreds;
    }

    // Standard OAuth refresh path
    const { clientId, clientSecret } = getCredentialsForService(id.service);
    const handler = new OAuthHandler(
      service.oauthConfig,
      clientId,
      clientSecret,
      ''
    );

    const tokenResponse = await handler.refreshToken(currentCreds.refreshToken!);
    const newCreds = tokenResponseToCredentials(tokenResponse);

    if (!newCreds.refreshToken && currentCreds.refreshToken) {
      newCreds.refreshToken = currentCreds.refreshToken;
    }

    newCreds.metadata = currentCreds.metadata;

    await this.db.saveCredentials(id.service, id.accountId, newCreds);
    return newCreds;
  }

  async markConnected(id: ConnectionId): Promise<void> {
    const connection = await this.db.getConnectionByServiceAccount(id.service, id.accountId);
    if (connection) {
      await this.db.updateStatus(connection.id, 'connected');
    }
  }

  async markError(id: ConnectionId, error: string): Promise<void> {
    const connection = await this.db.getConnectionByServiceAccount(id.service, id.accountId);
    if (connection) {
      await this.db.updateStatus(connection.id, 'error', error);
    }
  }

  /**
   * Migrate credentials from legacy file-based storage into the database.
   * Called once at startup. After migration, credential files can be removed.
   */
  async migrateFileCredentials(fileStore: {
    listAll(): Promise<ConnectionId[]>;
    load(id: ConnectionId): Promise<OAuthCredentials | null>;
    delete(id: ConnectionId): Promise<void>;
  }): Promise<void> {
    const fileConnections = await fileStore.listAll();

    for (const fileConn of fileConnections) {
      // Ensure DB record exists
      let connection = await this.db.getConnectionByServiceAccount(fileConn.service, fileConn.accountId);
      if (!connection) {
        const creds = await fileStore.load(fileConn);
        connection = {
          id: randomUUID(),
          service: fileConn.service,
          accountId: fileConn.accountId,
          status: 'connected',
          label: undefined,
          error: undefined,
          createdAt: Date.now(),
          lastUsedAt: undefined,
          metadata: creds?.metadata,
        };
        await this.db.upsertConnection(connection);
      }

      // Migrate credentials if not already in DB
      const dbCreds = await this.db.loadCredentials(fileConn.service, fileConn.accountId);
      if (!dbCreds) {
        const fileCreds = await fileStore.load(fileConn);
        if (fileCreds) {
          await this.db.saveCredentials(fileConn.service, fileConn.accountId, fileCreds);
        }
      }

      // Delete the file after successful migration
      await fileStore.delete(fileConn);
    }
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.pendingStates) {
      if (now - data.timestamp > STATE_TTL_MS) {
        this.pendingStates.delete(state);
      }
    }
  }
}

export { AuthError } from '@keepai/proto';
