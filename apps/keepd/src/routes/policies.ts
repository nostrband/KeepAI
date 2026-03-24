/**
 * Policy routes — per-agent per-service per-account policy management.
 *
 * GET  /api/agents/:agentId/policies                       List all policies for agent
 * GET  /api/agents/:agentId/policies/:connectionId         Get policy
 * PUT  /api/agents/:agentId/policies/:connectionId         Update policy
 * GET  /api/connections/:connectionId/policies              List policies for connection
 * GET  /api/services/:service/methods                       List methods grouped by prefix
 */

import type { FastifyInstance } from 'fastify';
import type { Policy, PolicyV2, CategoryAction, PolicyDecision } from '@keepai/proto';
import type { ConnectionManager, ConnectorExecutor } from '@keepai/connectors';
import type { AgentManager } from '../managers/agent-manager.js';
import type { PolicyEngine } from '../managers/policy-engine.js';

const VALID_ACTIONS: string[] = ['allow', 'deny', 'ask'];
const VALID_CATEGORY_ACTIONS: string[] = ['allow', 'deny', 'ask', 'custom'];

function validatePolicyV2(policy: PolicyV2): string | null {
  if (!policy.categories) return 'Missing categories';
  for (const cat of ['read', 'write', 'delete'] as const) {
    const cp = policy.categories[cat];
    if (!cp || !VALID_CATEGORY_ACTIONS.includes(cp.action)) {
      return `Invalid action for category "${cat}"`;
    }
    if (cp.action === 'custom' && cp.groups) {
      for (const [groupName, gp] of Object.entries(cp.groups)) {
        if (!VALID_CATEGORY_ACTIONS.includes(gp.action)) {
          return `Invalid action for group "${groupName}"`;
        }
        if (gp.action === 'custom' && gp.methods) {
          for (const [methodName, mp] of Object.entries(gp.methods)) {
            if (!VALID_ACTIONS.includes(mp.action)) {
              return `Invalid action for method "${methodName}"`;
            }
          }
        }
      }
    }
  }
  return null;
}

function validatePolicyV1(policy: Policy): string | null {
  if (!policy.default || !Array.isArray(policy.rules)) {
    return 'Invalid policy format: requires default and rules';
  }
  if (!VALID_ACTIONS.includes(policy.default)) {
    return `Invalid default action: ${policy.default}`;
  }
  for (const rule of policy.rules) {
    if (!Array.isArray(rule.operations) || !VALID_ACTIONS.includes(rule.action)) {
      return 'Invalid rule format';
    }
  }
  return null;
}

export async function registerPolicyRoutes(
  app: FastifyInstance,
  agentManager: AgentManager,
  policyEngine: PolicyEngine,
  connectionManager: ConnectionManager,
  connectorExecutor?: ConnectorExecutor
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

  // Get policy for a specific connection
  app.get<{ Params: { agentId: string; connectionId: string } }>(
    '/api/agents/:agentId/policies/:connectionId',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      const connection = await connectionManager.getConnectionById(request.params.connectionId);
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }

      const policy = policyEngine.getPolicy(
        connection.service,
        connection.accountId,
        agent.id
      );
      return { policy };
    }
  );

  // Update policy (accepts V1 or V2)
  app.put<{
    Params: { agentId: string; connectionId: string };
    Body: Policy | PolicyV2;
  }>('/api/agents/:agentId/policies/:connectionId', async (request, reply) => {
    const agent = agentManager.getAgent(request.params.agentId);
    if (!agent) {
      reply.status(404);
      return { error: 'Agent not found' };
    }

    const connection = await connectionManager.getConnectionById(request.params.connectionId);
    if (!connection) {
      reply.status(404);
      return { error: 'Connection not found' };
    }

    const policy = request.body;
    if (!policy) {
      reply.status(400);
      return { error: 'Missing policy body' };
    }

    // Validate based on version
    const isV2 = 'version' in policy && policy.version === 2;
    const error = isV2
      ? validatePolicyV2(policy as PolicyV2)
      : validatePolicyV1(policy as Policy);

    if (error) {
      reply.status(400);
      return { error };
    }

    policyEngine.savePolicy(
      connection.service,
      connection.accountId,
      agent.id,
      policy
    );

    return { success: true };
  });

  // List policies for a connection
  app.get<{ Params: { connectionId: string } }>(
    '/api/connections/:connectionId/policies',
    async (request, reply) => {
      const connection = await connectionManager.getConnectionById(request.params.connectionId);
      if (!connection) {
        reply.status(404);
        return { error: 'Connection not found' };
      }

      const policies = policyEngine.listByConnection(
        connection.service,
        connection.accountId
      );
      return { policies };
    }
  );

  // List methods for a service, grouped by prefix
  app.get<{ Params: { service: string } }>(
    '/api/services/:service/methods',
    async (request, reply) => {
      if (!connectorExecutor) {
        reply.status(503);
        return { error: 'Connector executor not available' };
      }

      const connector = connectorExecutor.getConnector(request.params.service);
      if (!connector) {
        reply.status(404);
        return { error: `Unknown service: ${request.params.service}` };
      }

      const groups: Record<string, {
        description?: string;
        methods: Array<{ name: string; description: string; operationType: string }>;
      }> = {};

      for (const m of connector.methods) {
        const dot = m.name.indexOf('.');
        const groupName = dot === -1 ? m.name : m.name.slice(0, dot);
        if (!groups[groupName]) {
          groups[groupName] = {
            description: connector.groupDescriptions?.[groupName],
            methods: [],
          };
        }
        groups[groupName].methods.push({
          name: m.name,
          description: m.description,
          operationType: m.operationType,
        });
      }

      return { service: request.params.service, groups };
    }
  );
}
