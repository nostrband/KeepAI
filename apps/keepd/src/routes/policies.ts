/**
 * Policy routes — per-agent per-service policy management.
 *
 * GET  /api/agents/:agentId/policies               List all policies
 * GET  /api/agents/:agentId/policies/:service       Get policy
 * PUT  /api/agents/:agentId/policies/:service       Update policy
 */

import type { FastifyInstance } from 'fastify';
import type { Policy } from '@keepai/proto';
import type { AgentManager } from '../managers/agent-manager.js';
import type { PolicyEngine } from '../managers/policy-engine.js';
import type { ConnectorExecutor } from '@keepai/connectors';

export async function registerPolicyRoutes(
  app: FastifyInstance,
  agentManager: AgentManager,
  policyEngine: PolicyEngine,
  connectorExecutor: ConnectorExecutor
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

      const services = connectorExecutor.getRegisteredServices();
      const policies: Record<string, Policy> = {};

      for (const service of services) {
        policies[service] = policyEngine.getPolicy(agent.agentPubkey, service);
      }

      return { policies };
    }
  );

  // Get policy for a specific service
  app.get<{ Params: { agentId: string; service: string } }>(
    '/api/agents/:agentId/policies/:service',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      const policy = policyEngine.getPolicy(
        agent.agentPubkey,
        request.params.service
      );
      return { policy };
    }
  );

  // Update policy
  app.put<{
    Params: { agentId: string; service: string };
    Body: Policy;
  }>('/api/agents/:agentId/policies/:service', async (request, reply) => {
    const agent = agentManager.getAgent(request.params.agentId);
    if (!agent) {
      reply.status(404);
      return { error: 'Agent not found' };
    }

    const policy = request.body;

    // Validate policy structure
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
      agent.agentPubkey,
      request.params.service,
      policy
    );

    return { success: true };
  });
}
