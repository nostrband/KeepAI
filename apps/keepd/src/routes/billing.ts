/**
 * Billing routes — plan status, device auth sign-in, sign-out.
 *
 * GET  /api/billing/status       Plan info + auth state + limits
 * POST /api/billing/signin       Initiate device auth flow
 * POST /api/billing/signin/poll  Poll for sign-in completion
 * POST /api/billing/signout      Sign out
 */

import type { FastifyInstance } from 'fastify';
import type { BillingManager } from '../managers/billing-manager.js';
import type { AgentManager } from '../managers/agent-manager.js';
import type { ConnectionManager } from '@keepai/connectors';

export async function registerBillingRoutes(
  app: FastifyInstance,
  billingManager: BillingManager,
  agentManager: AgentManager,
  connectionManager: ConnectionManager
): Promise<void> {
  app.get('/api/billing/status', async () => {
    const activeAgents = agentManager.listAgents().filter(
      (a) => a.status === 'paired' || a.status === 'paused'
    );
    const activeApps = await connectionManager.listConnections();
    return billingManager.getStatus(activeAgents.length, activeApps.length);
  });

  app.post('/api/billing/signin', async (_request, reply) => {
    try {
      const result = await billingManager.initiateSignIn();
      return result;
    } catch (err: any) {
      reply.status(500);
      return { error: err.message };
    }
  });

  app.post<{ Body: { device_code: string } }>(
    '/api/billing/signin/poll',
    async (request, reply) => {
      const { device_code } = request.body ?? {};
      if (!device_code) {
        reply.status(400);
        return { error: 'device_code is required' };
      }

      try {
        const result = await billingManager.pollSignIn(device_code);
        if (result.status === 'success') {
          // Trigger full sync in the background
          const agents = agentManager.listAgents().filter(
            (a) => a.status === 'paired' || a.status === 'paused'
          );
          const apps = await connectionManager.listConnections();
          billingManager.fullSync(
            agents.map((a) => ({ agent_pubkey: a.agentPubkey, name: a.name })),
            apps.map((c) => ({ id: c.id, service: c.service, label: c.label }))
          ).catch(() => {});
        }
        return result;
      } catch (err: any) {
        reply.status(500);
        return { error: err.message };
      }
    }
  );

  app.post('/api/billing/signout', async (_request, reply) => {
    try {
      await billingManager.signOut();
      return { success: true };
    } catch (err: any) {
      reply.status(500);
      return { error: err.message };
    }
  });
}
