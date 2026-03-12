/**
 * Bridge between @keepai/db ConnectionStore (sync, snake_case) and
 * @keepai/connectors DbConnectionStore (async, snake_case).
 *
 * The @keepai/db ConnectionStore uses better-sqlite3 (sync API).
 * The @keepai/connectors ConnectionManager expects an async DbConnectionStore.
 * This module wraps the sync store in async calls and handles JSON
 * serialization for the metadata field.
 */

import type { ConnectionStore } from '@keepai/db';
import type { DbConnectionStore, DbConnection } from '@keepai/connectors';

export function createDbBridge(store: ConnectionStore): DbConnectionStore {
  return {
    async getConnection(id: string): Promise<DbConnection | null> {
      const row = store.getById(id);
      if (!row) return null;
      return {
        id: row.id,
        service: row.service,
        account_id: row.accountId,
        status: row.status as DbConnection['status'],
        label: row.label,
        error: row.error,
        created_at: row.createdAt,
        last_used_at: row.lastUsedAt,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      };
    },

    async getConnectionByServiceAccount(service: string, accountId: string): Promise<DbConnection | null> {
      const row = store.getByServiceAndAccount(service, accountId);
      if (!row) return null;
      return {
        id: row.id,
        service: row.service,
        account_id: row.accountId,
        status: row.status as DbConnection['status'],
        label: row.label,
        error: row.error,
        created_at: row.createdAt,
        last_used_at: row.lastUsedAt,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      };
    },

    async listConnections(): Promise<DbConnection[]> {
      return store.listAll().map((row) => ({
        id: row.id,
        service: row.service,
        account_id: row.accountId,
        status: row.status as DbConnection['status'],
        label: row.label,
        error: row.error,
        created_at: row.createdAt,
        last_used_at: row.lastUsedAt,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));
    },

    async listByService(service: string): Promise<DbConnection[]> {
      return store.listByService(service).map((row) => ({
        id: row.id,
        service: row.service,
        account_id: row.accountId,
        status: row.status as DbConnection['status'],
        label: row.label,
        error: row.error,
        created_at: row.createdAt,
        last_used_at: row.lastUsedAt,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));
    },

    async upsertConnection(
      conn: Omit<DbConnection, 'metadata'> & { metadata?: Record<string, unknown> }
    ): Promise<void> {
      store.upsert({
        id: conn.id,
        service: conn.service,
        accountId: conn.account_id,
        status: conn.status,
        label: conn.label ?? undefined,
        metadata: conn.metadata ? JSON.stringify(conn.metadata) : undefined,
      });
    },

    async updateStatus(
      id: string,
      status: 'connected' | 'expired' | 'error',
      error?: string
    ): Promise<void> {
      store.updateStatus(id, status, error);
    },

    async updateLastUsed(id: string): Promise<void> {
      store.updateLastUsed(id);
    },

    async deleteConnection(id: string): Promise<void> {
      store.delete(id);
    },

    async saveCredentials(service: string, accountId: string, credentials: string): Promise<void> {
      const conn = store.getByServiceAndAccount(service, accountId);
      if (conn) {
        store.saveCredentials(conn.id, credentials);
      }
    },

    async loadCredentials(service: string, accountId: string): Promise<string | null> {
      return store.loadCredentialsByServiceAccount(service, accountId);
    },
  };
}
