/**
 * Agent routes — agent pairing and management.
 *
 * GET    /api/agents               List paired agents
 * POST   /api/agents/new           Generate pairing code
 * DELETE /api/agents/pairings/:pairingId  Cancel pending pairing
 * GET    /api/agents/:agentId      Get agent details
 * GET    /api/agents/:agentId/icon Get agent avatar icon
 * POST   /api/agents/:agentId/icon Upload agent avatar icon
 * POST   /api/agents/:agentId/icon/refresh  Refresh avatar from robohash
 * DELETE /api/agents/:agentId      Revoke agent
 */

import * as fs from 'fs';
import type { FastifyInstance } from 'fastify';
import type { AgentManager } from '../managers/agent-manager.js';
import { detectImageType, findAgentIcon, deleteAgentIcon, getIconsDir } from '../managers/agent-manager.js';
import type { PolicyEngine } from '../managers/policy-engine.js';
import type { SSEBroadcaster } from '../sse.js';
import type { BillingManager } from '../managers/billing-manager.js';

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export async function registerAgentRoutes(
  app: FastifyInstance,
  agentManager: AgentManager,
  policyEngine: PolicyEngine,
  onSubscriptionChange: () => void,
  sse?: SSEBroadcaster,
  billingManager?: BillingManager
): Promise<void> {
  // List agents
  app.get('/api/agents', async () => {
    const agents = agentManager.listAgents().map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      agentPubkey: a.agentPubkey,
      status: a.status,
      pairedAt: a.pairedAt,
      lastSeenAt: a.lastSeenAt,
    }));
    return { agents };
  });

  // Create new pairing
  app.post<{ Querystring: { name?: string; type?: string } }>(
    '/api/agents/new',
    async (request, reply) => {
      const name = request.query.name;
      if (!name) {
        reply.status(400);
        return { error: 'Agent name is required (use ?name=...)' };
      }

      const type = request.query.type ?? '';

      try {
        const { code, id } = agentManager.createPairing(name, type);
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
        type: agent.type,
        agentPubkey: agent.agentPubkey,
        status: agent.status,
        pairedAt: agent.pairedAt,
        lastSeenAt: agent.lastSeenAt,
      };
    }
  );

  // Rename agent
  app.put<{ Params: { agentId: string }; Body: { name: string } }>(
    '/api/agents/:agentId/name',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      const { name } = request.body as { name?: string };
      if (!name) {
        reply.status(400);
        return { error: 'Name is required' };
      }

      try {
        agentManager.renameAgent(agent.id, name);
        return { success: true };
      } catch (err: any) {
        reply.status(400);
        return { error: err.message };
      }
    }
  );

  // Get agent icon (no auth required)
  app.get<{ Params: { agentId: string } }>(
    '/api/agents/:agentId/icon',
    async (request, reply) => {
      const iconPath = findAgentIcon(agentManager.getDataDir(), request.params.agentId);
      if (!iconPath) {
        reply.status(404);
        return { error: 'No icon' };
      }
      const ext = iconPath.split('.').pop()!;
      const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'no-cache');
      return reply.send(fs.readFileSync(iconPath));
    }
  );

  // Upload agent icon
  app.post<{ Params: { agentId: string } }>(
    '/api/agents/:agentId/icon',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      const file = await request.file();
      if (!file) {
        reply.status(400);
        return { error: 'No file uploaded' };
      }

      const buf = await file.toBuffer();
      if (buf.length > 500 * 1024) {
        reply.status(400);
        return { error: 'File too large (max 500KB)' };
      }

      const ext = detectImageType(buf);
      if (!ext) {
        reply.status(400);
        return { error: 'Unsupported image format. Allowed: PNG, JPEG, WebP, SVG' };
      }

      const dataDir = agentManager.getDataDir();
      const dir = getIconsDir(dataDir);
      fs.mkdirSync(dir, { recursive: true });
      deleteAgentIcon(dataDir, agent.id);
      fs.writeFileSync(`${dir}/${agent.id}.${ext}`, buf);

      return { success: true };
    }
  );

  // Refresh agent icon from robohash
  app.post<{ Params: { agentId: string } }>(
    '/api/agents/:agentId/icon/refresh',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      try {
        await agentManager.refreshAgentIcon(agent.id);
        return { success: true };
      } catch {
        reply.status(502);
        return { success: false, error: 'Failed to fetch avatar' };
      }
    }
  );

  // Pause agent
  app.post<{ Params: { agentId: string } }>(
    '/api/agents/:agentId/pause',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }
      if (agent.status !== 'paired') {
        reply.status(400);
        return { error: `Cannot pause agent with status "${agent.status}"` };
      }
      agentManager.pauseAgent(agent.id);
      sse?.broadcast('agent_disconnected', {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
      });
      return { success: true };
    }
  );

  // Unpause agent
  app.post<{ Params: { agentId: string } }>(
    '/api/agents/:agentId/unpause',
    async (request, reply) => {
      const agent = agentManager.getAgent(request.params.agentId);
      if (!agent) {
        reply.status(404);
        return { error: 'Agent not found' };
      }
      if (agent.status !== 'paused') {
        reply.status(400);
        return { error: `Cannot unpause agent with status "${agent.status}"` };
      }
      agentManager.unpauseAgent(agent.id);
      sse?.broadcast('agent_connected', {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
      });
      return { success: true };
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
      policyEngine.deleteByAgent(agent.id);

      // Delete icon
      deleteAgentIcon(agentManager.getDataDir(), agent.id);

      // Emit agent_disconnected SSE event
      sse?.broadcast('agent_disconnected', {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
      });

      // Update nostr subscription
      onSubscriptionChange();

      // Sync with billing (best-effort, non-blocking)
      billingManager?.unregisterAgent(agent.agentPubkey).catch(() => {});

      return { success: true };
    }
  );
}
