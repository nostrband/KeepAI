/**
 * Agent routes — agent pairing and management.
 *
 * GET    /api/agents               List paired agents
 * POST   /api/agents/new           Generate pairing code
 * DELETE /api/agents/pairings/:pairingId  Cancel pending pairing
 * GET    /api/agents/:agentId      Get agent details
 * DELETE /api/agents/:agentId      Revoke agent
 */

import type { FastifyInstance } from 'fastify';
import type { AgentManager } from '../managers/agent-manager.js';
import type { PolicyEngine } from '../managers/policy-engine.js';
import type { SSEBroadcaster } from '../sse.js';

export async function registerAgentRoutes(
  app: FastifyInstance,
  agentManager: AgentManager,
  policyEngine: PolicyEngine,
  onSubscriptionChange: () => void,
  sse?: SSEBroadcaster
): Promise<void> {
  // List agents
  app.get('/api/agents', async () => {
    const agents = agentManager.listAgents().map((a) => ({
      id: a.id,
      name: a.name,
      agentPubkey: a.agentPubkey,
      status: a.status,
      pairedAt: a.pairedAt,
      lastSeenAt: a.lastSeenAt,
    }));
    return { agents };
  });

  // Create new pairing
  app.post<{ Querystring: { name?: string } }>(
    '/api/agents/new',
    async (request, reply) => {
      const name = request.query.name;
      if (!name) {
        reply.status(400);
        return { error: 'Agent name is required (use ?name=...)' };
      }

      try {
        const { code, id } = agentManager.createPairing(name);
        // Update nostr subscription to include the new pending pairing pubkey
        onSubscriptionChange();
        return { code, id };
      } catch (err: any) {
        reply.status(400);
        return { error: err.message };
      }
    }
  );

  // Cancel pending pairing
  app.delete<{ Params: { pairingId: string } }>(
    '/api/agents/pairings/:pairingId',
    async (request, reply) => {
      const deleted = agentManager.cancelPairing(request.params.pairingId);
      if (!deleted) {
        reply.status(404);
        return { error: 'Pairing not found or already completed' };
      }
      onSubscriptionChange();
      return { success: true };
    }
  );

  // Get agent details
  app.get<{ Params: { agentId: string } }>(
    '/api/agents/:agentId',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      return {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
        status: agent.status,
        pairedAt: agent.pairedAt,
        lastSeenAt: agent.lastSeenAt,
      };
    }
  );

  // Revoke agent
  app.delete<{ Params: { agentId: string } }>(
    '/api/agents/:agentId',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      // Revoke in DB
      agentManager.revokeAgent(agent.id);

      // Delete policies
      policyEngine.deleteAgentPolicies(agent.agentPubkey);

      // Emit agent_disconnected SSE event
      sse?.broadcast('agent_disconnected', {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
      });

      // Update nostr subscription
      onSubscriptionChange();

      return { success: true };
    }
  );
}
