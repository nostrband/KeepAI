/**
 * Connection routes — OAuth flow management.
 *
 * GET    /api/connections                          List all connections
 * GET    /api/connections/services                 List available services
 * POST   /api/connections/:service/connect         Start OAuth flow → { authUrl }
 * GET    /api/connections/:service/callback        OAuth callback
 * DELETE /api/connections/:connectionId            Disconnect
 * POST   /api/connections/:connectionId/pause      Pause
 * POST   /api/connections/:connectionId/unpause    Unpause
 * POST   /api/connections/:connectionId/check      Test connection
 */

import type { FastifyInstance } from 'fastify';
import type { ConnectionManager, ConnectorExecutor, ConnectionId } from '@keepai/connectors';
import { isErrorType } from '@keepai/proto';
import type { SSEBroadcaster } from '../sse.js';
import type { AgentManager } from '../managers/agent-manager.js';
import type { PolicyEngine } from '../managers/policy-engine.js';
import type { ConnectionHealthTracker } from '../health-tracker.js';
import type { BillingManager } from '../managers/billing-manager.js';

export const HEALTH_CHECK_METHODS: Record<string, { method: string; params: Record<string, unknown> }> = {
  gmail: { method: 'profile.get', params: {} },
  notion: { method: 'users.list', params: { user_id: 'self' } },
  github: { method: 'get_me', params: {} },
  airtable: { method: 'whoami', params: {} },
  trello: { method: 'members.me', params: {} },
};

export type HealthCheckResult =
  | { success: true }
  | { success: false; error: string; errorType: 'auth' | 'network' };

/**
 * Run a health check probe on a single connection.
 * Returns a classified result without side effects (caller handles markConnected/markError).
 */
export async function checkConnectionHealth(
  connectionId: ConnectionId,
  connectionManager: ConnectionManager,
  connectorExecutor: ConnectorExecutor
): Promise<HealthCheckResult> {
  try {
    const creds = await connectionManager.getCredentials(connectionId);

    if (!creds.accessToken) {
      return { success: false, error: 'No access token', errorType: 'auth' };
    }

    const probe = HEALTH_CHECK_METHODS[connectionId.service];
    if (probe) {
      await connectorExecutor.execute(connectionId.service, probe.method, probe.params, creds);
    }

    return { success: true };
  } catch (err: any) {
    if (isErrorType(err, 'auth')) {
      return { success: false, error: err.message, errorType: 'auth' };
    }
    if (isErrorType(err, 'network')) {
      return { success: false, error: err.message, errorType: 'network' };
    }
    // Unknown errors treated as transient — only explicitly classified auth errors
    // should mark a connection as permanently broken.
    return { success: false, error: err.message, errorType: 'network' };
  }
}

export async function registerConnectionRoutes(
  app: FastifyInstance,
  connectionManager: ConnectionManager,
  getServerBaseUrl: () => string,
  connectorExecutor?: ConnectorExecutor,
  sse?: SSEBroadcaster,
  agentManager?: AgentManager,
  policyEngine?: PolicyEngine,
  healthTracker?: ConnectionHealthTracker,
  billingManager?: BillingManager
): Promise<void> {
  // List all connections (merge in-memory offline state)
  app.get('/api/connections', async () => {
    const connections = await connectionManager.listConnections();
    const enriched = connections.map((conn) => {
      const offlineState = healthTracker?.getState(conn.service, conn.accountId);
      if (offlineState?.offline) {
        return { ...conn, offline: true, offlineError: offlineState.error, offlineSince: offlineState.since };
      }
      return conn;
    });
    return { connections: enriched };
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
        const { authUrl } = await connectionManager.startOAuthFlow(
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

  // OAuth callback (supports OAuth 2.0 code+state and token-in-fragment flows)
  app.get<{
    Params: { service: string };
    Querystring: { code?: string; state?: string; error?: string; token?: string };
  }>('/api/connections/:service/callback', async (request, reply) => {
    const { service } = request.params;
    const { code, state, error, token } = request.query;
    const serviceName = connectionManager.getService(service)?.name ?? service;

    if (error) {
      sse?.broadcast('connection_updated', { service, serviceName, action: 'failed', error });
      reply.type('text/html');
      return callbackPage(`Failed to connect to ${escapeHtml(serviceName)}`, `${escapeHtml(error)}<br/>You can close this window.`);
    }

    // Token-in-fragment flow (e.g. Trello): state is present but code/token are not yet
    // in query params — the token is in the URL fragment (#token=xxx).
    // Serve a page that extracts it and redirects with token as a query param.
    if (state && !code && !token) {
      reply.type('text/html');
      return tokenExtractorPage(service, state);
    }

    // Accept either `code` (OAuth 2.0) or `token` (fragment-extracted) as the auth code
    const authCode = code ?? token;

    if (!authCode || !state) {
      sse?.broadcast('connection_updated', { service, serviceName, action: 'failed', error: 'Missing code or state parameter' });
      reply.status(400);
      reply.type('text/html');
      return callbackPage(`Failed to connect to ${escapeHtml(serviceName)}`, 'Missing code or state parameter.');
    }

    const result = await connectionManager.completeOAuthFlow(
      service,
      authCode,
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

      sse?.broadcast('connection_updated', { service, serviceName, action: 'connected' });

      // Sync with billing (best-effort, non-blocking)
      if (billingManager && result.connection) {
        billingManager.registerApp({
          id: result.connection.id,
          service: result.connection.service,
          label: result.connection.label,
        }).catch(() => {});
      }

      return callbackPage(`Connected to ${escapeHtml(serviceName)}`, 'You can close this window.', { autoClose: true });
    } else {
      sse?.broadcast('connection_updated', { service, serviceName, action: 'failed', error: result.error || 'Unknown error' });
      return callbackPage(`Failed to connect to ${escapeHtml(serviceName)}`, `${escapeHtml(result.error || 'Unknown error')}<br/>You can close this window.`);
    }
  });

  // Disconnect
  app.delete<{ Params: { connectionId: string } }>(
    '/api/connections/:connectionId',
    async (request, reply) => {
      const connection = await connectionManager.getConnectionById(request.params.connectionId);
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }
      const { service, accountId } = connection;

      try {
        // Delete policies for this connection
        policyEngine?.deleteByConnection(service, accountId);

        // Store connection id before disconnect (soft-delete will keep the row)
        const connectionId = connection.id;

        await connectionManager.disconnect({ service, accountId });

        // If no accounts remain, reset the MCP connector state
        if (connectorExecutor) {
          const remaining = await connectionManager.listConnectionsByService(service);
          if (remaining.length === 0) {
            const connector = connectorExecutor.getConnector(service);
            if (connector && 'reset' in connector && typeof connector.reset === 'function') {
              connector.reset();
            }
          }
        }

        // Sync with billing (best-effort, non-blocking)
        billingManager?.unregisterApp(connectionId).catch(() => {});

        return { success: true };
      } catch (err: any) {
        reply.status(500);
        return { error: err.message };
      }
    }
  );

  // Pause connection
  app.post<{ Params: { connectionId: string } }>(
    '/api/connections/:connectionId/pause',
    async (request, reply) => {
      const connection = await connectionManager.getConnectionById(request.params.connectionId);
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }
      if (connection.status !== 'connected') {
        reply.status(400);
        return { error: `Cannot pause connection with status "${connection.status}"` };
      }
      const { service, accountId } = connection;
      await connectionManager.pauseConnection({ service, accountId });
      sse?.broadcast('connection_updated', { service, accountId, status: 'paused' });
      return { success: true };
    }
  );

  // Unpause connection
  app.post<{ Params: { connectionId: string } }>(
    '/api/connections/:connectionId/unpause',
    async (request, reply) => {
      const connection = await connectionManager.getConnectionById(request.params.connectionId);
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }
      if (connection.status !== 'paused') {
        reply.status(400);
        return { error: `Cannot unpause connection with status "${connection.status}"` };
      }
      const { service, accountId } = connection;
      await connectionManager.unpauseConnection({ service, accountId });
      sse?.broadcast('connection_updated', { service, accountId, status: 'connected' });
      return { success: true };
    }
  );

  // Check connection (test by making a live API call)
  app.post<{ Params: { connectionId: string } }>(
    '/api/connections/:connectionId/check',
    async (request, reply) => {
      const connection = await connectionManager.getConnectionById(request.params.connectionId);
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }
      const { service, accountId } = connection;
      const id = { service, accountId };

      if (!connectorExecutor) {
        return { success: false, error: 'No connector executor', errorType: 'network' as const };
      }

      const result = await checkConnectionHealth(id, connectionManager, connectorExecutor);

      if (result.success) {
        await connectionManager.markConnected(id);
        healthTracker?.markOnline(service, accountId);
        sse?.broadcast('connection_updated', { service, accountId, status: 'connected' });
        sse?.broadcast('connection_health', { service, accountId, offline: false });
      } else if (result.errorType === 'auth') {
        await connectionManager.markError(id, result.error);
        healthTracker?.markOnline(service, accountId);
        sse?.broadcast('connection_updated', { service, accountId, status: 'error', error: result.error });
      }
      // Network errors: don't change DB status (transient)

      return result;
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

/**
 * Serves a small HTML page that extracts the access token from the URL fragment
 * (#token=xxx) and redirects back to the callback with it as a query param.
 * Used for services like Trello that return tokens in the fragment.
 */
function tokenExtractorPage(service: string, state: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>KeepAI – Connecting...</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f9fafb;color:#1a1a1a}
  .card{text-align:center;padding:3rem 2rem}
  p{color:#6b7280;font-size:.875rem}
</style>
</head>
<body>
<div class="card"><p>Completing connection...</p></div>
<script>
(function() {
  var hash = window.location.hash.substring(1);
  var params = new URLSearchParams(hash);
  var token = params.get('token');
  if (token) {
    window.location.href = '/api/connections/${escapeHtml(service)}/callback?state=${escapeHtml(state)}&token=' + encodeURIComponent(token);
  } else {
    document.querySelector('p').textContent = 'Authorization failed — no token received.';
  }
})();
</script>
</body>
</html>`;
}

function callbackPage(title: string, message: string, { autoClose = false }: { autoClose?: boolean } = {}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>KeepAI – ${escapeHtml(title)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f9fafb;color:#1a1a1a}
  .card{text-align:center;padding:3rem 2rem}
  .logo{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:2rem}
  .logo svg{width:28px;height:28px}
  .logo span{font-size:1.25rem;font-weight:600;color:#1a1a1a}
  h2{font-size:1.125rem;font-weight:600;margin-bottom:.5rem}
  p{color:#6b7280;font-size:.875rem;line-height:1.5}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#E5372A"/><g transform="translate(5.5 5) scale(0.875)"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>
    <span>KeepAI</span>
  </div>
  <h2>${title}</h2>
  <p>${message}</p>
</div>${autoClose ? '\n<script>window.close();</script>' : ''}
</body>
</html>`;
}
