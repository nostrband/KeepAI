/**
 * Connection routes — OAuth flow management.
 *
 * GET    /api/connections                     List all connections
 * GET    /api/connections/services            List available services
 * POST   /api/connections/:service/connect    Start OAuth flow → { authUrl }
 * GET    /api/connections/:service/callback   OAuth callback
 * DELETE /api/connections/:service/:accountId Disconnect
 * POST   /api/connections/:service/:accountId/check  Test connection
 */

import type { FastifyInstance } from 'fastify';
import type { ConnectionManager, ConnectorExecutor } from '@keepai/connectors';
import type { SSEBroadcaster } from '../sse.js';
import type { AgentManager } from '../managers/agent-manager.js';
import type { PolicyEngine } from '../managers/policy-engine.js';

const HEALTH_CHECK_METHODS: Record<string, { method: string; params: Record<string, unknown> }> = {
  gmail: { method: 'profile.get', params: {} },
  notion: { method: 'search', params: { query: '', page_size: 1 } },
};

export async function registerConnectionRoutes(
  app: FastifyInstance,
  connectionManager: ConnectionManager,
  getServerBaseUrl: () => string,
  connectorExecutor?: ConnectorExecutor,
  sse?: SSEBroadcaster,
  agentManager?: AgentManager,
  policyEngine?: PolicyEngine
): Promise<void> {
  // List all connections
  app.get('/api/connections', async () => {
    const connections = await connectionManager.listConnections();
    return { connections };
  });

  // List available services
  app.get('/api/connections/services', async () => {
    const services = connectionManager.getServices().map((s) => ({
      id: s.id,
      name: s.name,
      supportsRefresh: s.supportsRefresh,
    }));
    return { services };
  });

  // Start OAuth flow
  app.post<{ Params: { service: string } }>(
    '/api/connections/:service/connect',
    async (request, reply) => {
      const { service } = request.params;
      const baseUrl = getServerBaseUrl();
      const redirectUri = `${baseUrl}/api/connections/${service}/callback`;

      try {
        const { authUrl } = connectionManager.startOAuthFlow(
          service,
          redirectUri
        );
        return { authUrl };
      } catch (err: any) {
        reply.status(400);
        return { error: err.message };
      }
    }
  );

  // OAuth callback
  app.get<{
    Params: { service: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>('/api/connections/:service/callback', async (request, reply) => {
    const { service } = request.params;
    const { code, state, error } = request.query;

    if (error) {
      reply.type('text/html');
      return `<html><body><h2>Connection Failed</h2><p>${escapeHtml(error)}</p><p>You can close this window.</p></body></html>`;
    }

    if (!code || !state) {
      reply.status(400);
      reply.type('text/html');
      return '<html><body><h2>Invalid Request</h2><p>Missing code or state parameter.</p></body></html>';
    }

    const result = await connectionManager.completeOAuthFlow(
      service,
      code,
      state
    );

    reply.type('text/html');
    if (result.success) {
      // Auto-create default policies for all paired agents
      if (agentManager && policyEngine && result.connection?.accountId) {
        const agents = agentManager.listAgents().filter((a) => a.status === 'paired');
        const agentIds = agents.map((a) => a.id);
        policyEngine.createDefaultsForConnection(service, result.connection.accountId, agentIds);
      }

      sse?.broadcast('connection_updated', { service, action: 'connected' });
      return `<html><body><h2>Connected!</h2><p>${escapeHtml(service)} account connected successfully.</p><p>You can close this window.</p><script>window.close();</script></body></html>`;
    } else {
      return `<html><body><h2>Connection Failed</h2><p>${escapeHtml(result.error || 'Unknown error')}</p><p>You can close this window.</p></body></html>`;
    }
  });

  // Disconnect
  app.delete<{ Params: { service: string; accountId: string } }>(
    '/api/connections/:service/:accountId',
    async (request, reply) => {
      const { service, accountId } = request.params;

      try {
        // Delete policies for this connection
        policyEngine?.deleteByConnection(service, accountId);

        await connectionManager.disconnect({ service, accountId });
        return { success: true };
      } catch (err: any) {
        reply.status(500);
        return { error: err.message };
      }
    }
  );

  // Pause connection
  app.post<{ Params: { service: string; accountId: string } }>(
    '/api/connections/:service/:accountId/pause',
    async (request, reply) => {
      const { service, accountId } = request.params;
      const connection = await connectionManager.getConnection({ service, accountId });
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }
      if (connection.status !== 'connected') {
        reply.status(400);
        return { error: `Cannot pause connection with status "${connection.status}"` };
      }
      await connectionManager.pauseConnection({ service, accountId });
      sse?.broadcast('connection_updated', { service, accountId, status: 'paused' });
      return { success: true };
    }
  );

  // Unpause connection
  app.post<{ Params: { service: string; accountId: string } }>(
    '/api/connections/:service/:accountId/unpause',
    async (request, reply) => {
      const { service, accountId } = request.params;
      const connection = await connectionManager.getConnection({ service, accountId });
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }
      if (connection.status !== 'paused') {
        reply.status(400);
        return { error: `Cannot unpause connection with status "${connection.status}"` };
      }
      await connectionManager.unpauseConnection({ service, accountId });
      sse?.broadcast('connection_updated', { service, accountId, status: 'connected' });
      return { success: true };
    }
  );

  // Check connection (test by making a live API call)
  app.post<{ Params: { service: string; accountId: string } }>(
    '/api/connections/:service/:accountId/check',
    async (request, reply) => {
      const { service, accountId } = request.params;

      try {
        const creds = await connectionManager.getCredentials({
          service,
          accountId,
        });

        if (!creds.accessToken) {
          return { success: false, error: 'No access token' };
        }

        // Make a live API probe if connector executor is available
        const probe = HEALTH_CHECK_METHODS[service];
        if (connectorExecutor && probe) {
          await connectorExecutor.execute(service, probe.method, probe.params, creds);
        }

        return { success: true };
      } catch (err: any) {
        reply.status(500);
        return { success: false, error: err.message };
      }
    }
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
