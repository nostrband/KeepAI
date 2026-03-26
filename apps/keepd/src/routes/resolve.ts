/**
 * ID resolution routes.
 *
 * GET /api/resolve/:service/:accountId/:type/:id  Resolve an ID to title + URL
 * GET /api/resolvable-types                       List resolvable types per service
 */

import type { FastifyInstance } from 'fastify';
import type { ConnectorExecutor } from '@keepai/connectors';
import type { ConnectionManager } from '@keepai/connectors';

interface CacheEntry {
  result: { title: string; url?: string } | null;
  expiresAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 1000;

export async function registerResolveRoutes(
  app: FastifyInstance,
  executor: ConnectorExecutor,
  connectionManager: ConnectionManager
): Promise<void> {
  const cache = new Map<string, CacheEntry>();

  function evictExpired() {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(key);
    }
  }

  // Resolve a single ID
  app.get<{
    Params: { service: string; accountId: string; type: string; id: string };
  }>('/api/resolve/:service/:accountId/:type/:id', async (request, reply) => {
    const { service, accountId, type, id } = request.params;

    const connector = executor.getConnector(service);
    if (!connector?.resolveId || !connector.resolvableTypes?.[type]) {
      reply.status(404);
      return { error: 'Unsupported service or type' };
    }

    // Check cache
    const cacheKey = `${service}:${accountId}:${type}:${id}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { result: cached.result };
    }

    let credentials;
    try {
      credentials = await connectionManager.getCredentials({ service, accountId });
    } catch {
      reply.status(404);
      return { error: 'No credentials for this account' };
    }

    const result = await connector.resolveId(type, id, credentials);

    // Store in cache
    if (cache.size >= CACHE_MAX) evictExpired();
    if (cache.size < CACHE_MAX) {
      cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL });
    }

    return { result };
  });

  // List resolvable types for all registered connectors
  app.get('/api/resolvable-types', async () => {
    const services = executor.getRegisteredServices();
    const types: Record<string, Record<string, { label: string; params?: Record<string, string> }>> = {};
    for (const service of services) {
      const connector = executor.getConnector(service);
      if (connector?.resolvableTypes) {
        types[service] = connector.resolvableTypes;
      }
    }
    return { types };
  });
}
