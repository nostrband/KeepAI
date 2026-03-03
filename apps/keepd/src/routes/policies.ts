/**
 * Policy routes — per-agent per-service per-account policy management.
 *
 * GET  /api/agents/:agentId/policies                           List all policies for agent
 * GET  /api/agents/:agentId/policies/:service/:accountId       Get policy
 * PUT  /api/agents/:agentId/policies/:service/:accountId       Update policy
 * GET  /api/connections/:service/:accountId/policies            List policies for connection
 */

import type { FastifyInstance } from 'fastify';
import type { Policy } from '@keepai/proto';
import type { AgentManager } from '../managers/agent-manager.js';
import type { PolicyEngine } from '../managers/policy-engine.js';

export async function registerPolicyRoutes(
  app: FastifyInstance,
  agentManager: AgentManager,
  policyEngine: PolicyEngine
): Promise<void> {
  // List all policies for an agent
  app.get<{ Params: { agentId: string } }>(
    '/api/agents/:agentId/policies',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      const policies = policyEngine.listByAgent(agent.id);
      return { policies };
    }
  );

  // Get policy for a specific service+account
  app.get<{ Params: { agentId: string; service: string; accountId: string } }>(
    '/api/agents/:agentId/policies/:service/:accountId',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      const policy = policyEngine.getPolicy(
        request.params.service,
        decodeURIComponent(request.params.accountId),
        agent.id
      );
      return { policy };
    }
  );

  // Update policy
  app.put<{
    Params: { agentId: string; service: string; accountId: string };
    Body: Policy;
  }>('/api/agents/:agentId/policies/:service/:accountId', async (request, reply) => {
    const agent = agentManager.getAgent(request.params.agentId);
    if (!agent) {
      reply.status(404);
      return { error: 'Agent not found' };
    }

    const policy = request.body;

    if (!policy || !policy.default || !Array.isArray(policy.rules)) {
      reply.status(400);
      return { error: 'Invalid policy format: requires default and rules' };
    }

    const validActions = ['allow', 'deny', 'ask'];
    if (!validActions.includes(policy.default)) {
      reply.status(400);
      return { error: `Invalid default action: ${policy.default}` };
    }

    for (const rule of policy.rules) {
      if (
        !Array.isArray(rule.operations) ||
        !validActions.includes(rule.action)
      ) {
        reply.status(400);
        return { error: 'Invalid rule format' };
      }
    }

    policyEngine.savePolicy(
      request.params.service,
      decodeURIComponent(request.params.accountId),
      agent.id,
      policy
    );

    return { success: true };
  });

  // List policies for a connection
  app.get<{ Params: { service: string; accountId: string } }>(
    '/api/connections/:service/:accountId/policies',
    async (request) => {
      const policies = policyEngine.listByConnection(
        request.params.service,
        decodeURIComponent(request.params.accountId)
      );
      return { policies };
    }
  );
}
