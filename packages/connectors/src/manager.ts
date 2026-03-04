/**
 * ConnectionManager - Central class for OAuth connection orchestration.
 */

import { randomUUID } from 'crypto';
import { AuthError, isClassifiedError } from '@keepai/proto';
import { OAuthHandler, tokenResponseToCredentials } from './oauth.js';
import { CredentialStore } from './store.js';
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
}

export class ConnectionManager {
  private services = new Map<string, ServiceDefinition>();
  private pendingStates = new Map<string, PendingState>();
  private refreshPromises = new Map<string, Promise<OAuthCredentials>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private store: CredentialStore,
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

  startOAuthFlow(
    serviceId: string,
    redirectUri: string
  ): { authUrl: string; state: string } {
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
    this.pendingStates.set(state, {
      service: serviceId,
      redirectUri,
      timestamp: Date.now(),
    });

    const { clientId, clientSecret } = getCredentialsForService(serviceId);
    if (!clientId || !clientSecret) {
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

    const authUrl = handler.getAuthUrl(state);
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
      const { clientId, clientSecret } = getCredentialsForService(serviceId);

      const handler = new OAuthHandler(
        service.oauthConfig,
        clientId,
        clientSecret,
        pending.redirectUri
      );

      const tokenResponse = await handler.exchangeCode(code);
      const credentials = tokenResponseToCredentials(tokenResponse);

      let profile: unknown;
      if (service.fetchProfile) {
        try {
          profile = await service.fetchProfile(credentials.accessToken);
        } catch {
          // Profile fetch is optional
        }
      }

      const accountId = await service.extractAccountId(tokenResponse, profile);
      const connectionId: ConnectionId = { service: serviceId, accountId };

      const metadata: Record<string, unknown> = { ...credentials.metadata };
      if (service.extractDisplayName) {
        const displayName = service.extractDisplayName(tokenResponse, profile);
        if (displayName) {
          metadata.displayName = displayName;
        }
      }
      credentials.metadata = metadata;

      await this.store.save(connectionId, credentials);

      const now = Date.now();
      const connection: Connection = {
        id: `${serviceId}:${accountId}`,
        service: serviceId,
        accountId,
        status: 'connected',
        label: undefined,
        error: undefined,
        createdAt: now,
        lastUsedAt: undefined,
        metadata,
      };

      await this.db.upsertConnection(connection);

      return { success: true, connection };
    } catch (err) {
      let userMessage: string;
      if (isClassifiedError(err)) {
        userMessage = err.message;
      } else {
        userMessage = 'An authentication error occurred. Please try connecting again.';
      }

      return { success: false, error: userMessage };
    }
  }

  async listConnections(): Promise<Connection[]> {
    return this.db.listConnections();
  }

  async listConnectionsByService(service: string): Promise<Connection[]> {
    return this.db.listConnections(service);
  }

  async getConnection(id: ConnectionId): Promise<Connection | null> {
    return this.db.getConnection(`${id.service}:${id.accountId}`);
  }

  async disconnect(id: ConnectionId, revokeToken = true): Promise<void> {
    const connectionId = `${id.service}:${id.accountId}`;

    if (revokeToken) {
      const service = this.services.get(id.service);
      if (service?.oauthConfig.revokeUrl) {
        try {
          const creds = await this.store.load(id);
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

    await this.store.delete(id);
    await this.db.deleteConnection(connectionId);
  }

  async pauseConnection(id: ConnectionId): Promise<void> {
    const connectionId = `${id.service}:${id.accountId}`;
    const connection = await this.db.getConnection(connectionId);
    if (connection && connection.status === 'connected') {
      await this.db.upsertConnection({ ...connection, status: 'paused' });
    }
  }

  async unpauseConnection(id: ConnectionId): Promise<void> {
    const connectionId = `${id.service}:${id.accountId}`;
    const connection = await this.db.getConnection(connectionId);
    if (connection && connection.status === 'paused') {
      await this.db.upsertConnection({ ...connection, status: 'connected' });
    }
  }

  async updateLabel(id: ConnectionId, label: string): Promise<void> {
    const connection = await this.db.getConnection(
      `${id.service}:${id.accountId}`
    );
    if (connection) {
      await this.db.upsertConnection({ ...connection, label });
    }
  }

  async getCredentials(id: ConnectionId): Promise<OAuthCredentials> {
    const connectionId = `${id.service}:${id.accountId}`;

    const creds = await this.store.load(id);
    if (!creds) {
      throw new AuthError(`No credentials for ${connectionId}`, {
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
          throw new AuthError(`Token expired for ${connectionId}`, {
            source: 'ConnectionManager.getCredentials',
            serviceId: id.service,
            accountId: id.accountId,
          });
        }

        const existingRefresh = this.refreshPromises.get(connectionId);
        if (existingRefresh) {
          return existingRefresh;
        }

        const refreshPromise = this.refreshTokenInternal(id, creds)
          .then((refreshed) => {
            this.refreshPromises.delete(connectionId);
            return refreshed;
          })
          .catch((err) => {
            this.refreshPromises.delete(connectionId);
            throw err;
          });

        this.refreshPromises.set(connectionId, refreshPromise);

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

    await this.db.updateLastUsed(connectionId, Date.now());
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

    await this.store.save(id, newCreds);
    return newCreds;
  }

  async markConnected(id: ConnectionId): Promise<void> {
    const connectionId = `${id.service}:${id.accountId}`;
    await this.db.updateStatus(connectionId, 'connected');
  }

  async markError(id: ConnectionId, error: string): Promise<void> {
    const connectionId = `${id.service}:${id.accountId}`;
    await this.db.updateStatus(connectionId, 'error', error);
  }

  async reconcile(): Promise<void> {
    const fileConnections = await this.store.listAll();
    const fileIds = new Set(
      fileConnections.map((c) => `${c.service}:${c.accountId}`)
    );

    const dbConnections = await this.db.listConnections();
    const dbIds = new Set(dbConnections.map((c) => c.id));

    for (const fileConn of fileConnections) {
      const id = `${fileConn.service}:${fileConn.accountId}`;
      if (!dbIds.has(id)) {
        const creds = await this.store.load(fileConn);
        const connection: Connection = {
          id,
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
    }

    for (const dbConn of dbConnections) {
      if (!fileIds.has(dbConn.id)) {
        await this.db.upsertConnection({
          ...dbConn,
          status: 'error',
          error: 'Credentials file missing',
        });
      }
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
