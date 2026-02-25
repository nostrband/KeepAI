/**
 * Adapter between @keepai/db ConnectionStore (snake_case) and ConnectionDb interface (camelCase).
 */

import type { Connection, ConnectionDb } from './types.js';

export interface DbConnection {
  id: string;
  service: string;
  account_id: string;
  status: 'connected' | 'expired' | 'error';
  label: string | null;
  error: string | null;
  created_at: number;
  last_used_at: number | null;
  metadata: Record<string, unknown> | null;
}

export interface DbConnectionStore {
  getConnection(id: string): Promise<DbConnection | null>;
  listConnections(): Promise<DbConnection[]>;
  listByService(service: string): Promise<DbConnection[]>;
  upsertConnection(
    conn: Omit<DbConnection, 'metadata'> & { metadata?: Record<string, unknown> }
  ): Promise<void>;
  updateStatus(
    id: string,
    status: 'connected' | 'expired' | 'error',
    error?: string
  ): Promise<void>;
  updateLastUsed(id: string, timestamp?: number): Promise<void>;
  deleteConnection(id: string): Promise<void>;
}

function dbToApi(db: DbConnection): Connection {
  return {
    id: db.id,
    service: db.service,
    accountId: db.account_id,
    status: db.status,
    label: db.label ?? undefined,
    error: db.error ?? undefined,
    createdAt: db.created_at,
    lastUsedAt: db.last_used_at ?? undefined,
    metadata: db.metadata ?? undefined,
  };
}

function apiToDb(
  api: Connection
): Omit<DbConnection, 'metadata'> & { metadata?: Record<string, unknown> } {
  return {
    id: api.id,
    service: api.service,
    account_id: api.accountId,
    status: api.status as 'connected' | 'expired' | 'error',
    label: api.label ?? null,
    error: api.error ?? null,
    created_at: api.createdAt,
    last_used_at: api.lastUsedAt ?? null,
    metadata: api.metadata,
  };
}

export class ConnectionDbAdapter implements ConnectionDb {
  constructor(private store: DbConnectionStore) {}

  async getConnection(id: string): Promise<Connection | null> {
    const dbConn = await this.store.getConnection(id);
    return dbConn ? dbToApi(dbConn) : null;
  }

  async listConnections(service?: string): Promise<Connection[]> {
    const dbConns = service
      ? await this.store.listByService(service)
      : await this.store.listConnections();
    return dbConns.map(dbToApi);
  }

  async upsertConnection(connection: Connection): Promise<void> {
    await this.store.upsertConnection(apiToDb(connection));
  }

  async deleteConnection(id: string): Promise<void> {
    await this.store.deleteConnection(id);
  }

  async updateLastUsed(id: string, timestamp: number): Promise<void> {
    await this.store.updateLastUsed(id, timestamp);
  }
}

export function createConnectionDbAdapter(
  store: DbConnectionStore
): ConnectionDb {
  return new ConnectionDbAdapter(store);
}
