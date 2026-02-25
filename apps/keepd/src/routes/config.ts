/**
 * Config and status routes.
 *
 * GET  /api/config   Get daemon configuration
 * PUT  /api/config   Update daemon configuration
 * GET  /api/status   Health check and summary stats
 */

import type { FastifyInstance } from 'fastify';
import type { KeepDBApi } from '@keepai/db';
import type { SSEBroadcaster } from '../sse.js';

export async function registerConfigRoutes(
  app: FastifyInstance,
  db: KeepDBApi,
  sse: SSEBroadcaster,
  getPort: () => number
): Promise<void> {
  // Get config
  app.get('/api/config', async () => {
    const settings = db.settings.getAll();
    return { settings };
  });

  // Update config
  app.put<{ Body: Record<string, string> }>(
    '/api/config',
    async (request) => {
      const updates = request.body;
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'string') {
          db.settings.set(key, value);
        }
      }
      return { success: true };
    }
  );

  // Status
  app.get('/api/status', async () => {
    const agents = db.agents.list();
    const connections = db.connections.listAll();
    const pendingApprovals = db.approvals.listPending();

    return {
      status: 'ok',
      port: getPort(),
      sseClients: sse.clientCount,
      agents: {
        total: agents.length,
        paired: agents.filter((a) => a.status === 'paired').length,
      },
      connections: {
        total: connections.length,
        connected: connections.filter((c) => c.status === 'connected').length,
      },
      pendingApprovals: pendingApprovals.length,
    };
  });
}
