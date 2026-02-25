/**
 * Integration tests for keepd — exercises the full request pipeline:
 *
 * RPCRouter: pairing → policy evaluation → approval flow → execution → audit
 * HTTP API: Fastify inject for all REST endpoints
 * Cleanup: expired pairings, approvals, audit log
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { KeepDB, KeepDBApi } from '@keepai/db';
import {
  PROTOCOL_VERSION,
  SOFTWARE_VERSION,
  DEFAULT_POLICY,
  CLEANUP,
} from '@keepai/proto';
import type {
  Policy,
  RPCRequest,
  Connector,
  PermissionMetadata,
  OAuthCredentials,
  ServiceHelp,
  Agent,
} from '@keepai/proto';
import type { AgentKeys } from '@keepai/nostr-rpc';
import { ConnectorExecutor } from '@keepai/connectors';

import { AgentManager } from '../managers/agent-manager.js';
import { PolicyEngine } from '../managers/policy-engine.js';
import { ApprovalQueue } from '../managers/approval-queue.js';
import { AuditLogger } from '../managers/audit-logger.js';
import { SSEBroadcaster } from '../sse.js';
import { createDbBridge } from '../db-bridge.js';
import { RPCRouter } from '../rpc-router.js';
import { registerAgentRoutes } from '../routes/agents.js';
import { registerQueueRoutes } from '../routes/queue.js';
import { registerPolicyRoutes } from '../routes/policies.js';
import { registerLogRoutes } from '../routes/logs.js';
import { registerConfigRoutes } from '../routes/config.js';

// --- Test Connector (mock) ---

function createTestConnector(): Connector {
  return {
    service: 'testservice',
    name: 'Test Service',
    methods: [
      {
        name: 'items.list',
        description: 'List items',
        operationType: 'read',
        params: [
          {
            name: 'query',
            type: 'string',
            required: false,
            description: 'Search query',
          },
        ],
        returns: 'Array of items',
      },
      {
        name: 'items.create',
        description: 'Create an item',
        operationType: 'write',
        params: [
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Item title',
          },
        ],
        returns: 'Created item',
      },
      {
        name: 'items.delete',
        description: 'Delete an item',
        operationType: 'delete',
        params: [
          {
            name: 'id',
            type: 'string',
            required: true,
            description: 'Item ID',
          },
        ],
        returns: 'Deletion result',
      },
    ],
    extractPermMetadata(
      method: string,
      params: Record<string, unknown>,
      accountId: string
    ): PermissionMetadata {
      const methodDef = this.methods.find((m) => m.name === method)!;
      return {
        service: this.service,
        accountId,
        method,
        operationType: methodDef.operationType,
        description: `${methodDef.description} on ${this.service}`,
      };
    },
    async execute(
      method: string,
      params: Record<string, unknown>,
      _credentials: OAuthCredentials
    ): Promise<unknown> {
      switch (method) {
        case 'items.list':
          return { items: [{ id: '1', title: 'Test Item' }], total: 1 };
        case 'items.create':
          return { id: '2', title: params.title };
        case 'items.delete':
          return { deleted: true };
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    },
    help(method?: string): ServiceHelp {
      const methods = method
        ? this.methods.filter((m) => m.name === method)
        : this.methods;
      return { service: 'testservice', name: 'Test Service', methods };
    },
  };
}

// --- Test ConnectionManager (mock) ---

function createMockConnectionManager() {
  return {
    listConnections: async () => [],
    listConnectionsByService: async (service: string) => [
      {
        id: `${service}:test@example.com`,
        service,
        accountId: 'test@example.com',
        status: 'connected' as const,
      },
    ],
    getCredentials: async (_opts: { service: string; accountId: string }) => ({
      accessToken: 'mock-token-123',
      refreshToken: 'mock-refresh',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    }),
    getServices: () => [],
    startOAuthFlow: () => ({ authUrl: 'https://example.com/auth' }),
    completeOAuthFlow: async () => ({ success: true }),
    disconnect: async () => {},
    shutdown: () => {},
    reconcile: async () => {},
    registerService: () => {},
  };
}

// --- Shared state ---

let tmpDir: string;
let keepdb: KeepDB;
let db: KeepDBApi;
let agentManager: AgentManager;
let policyEngine: PolicyEngine;
let approvalQueue: ApprovalQueue;
let auditLogger: AuditLogger;
let connectorExecutor: ConnectorExecutor;
let sse: SSEBroadcaster;
let rpcRouter: RPCRouter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepd-integ-'));
  const dbPath = path.join(tmpDir, 'test.db');
  keepdb = new KeepDB(dbPath);
  keepdb.migrate();
  db = new KeepDBApi(keepdb.db);

  sse = new SSEBroadcaster();
  agentManager = new AgentManager({ db, relays: ['wss://relay.test'] });
  policyEngine = new PolicyEngine(tmpDir);

  approvalQueue = new ApprovalQueue({
    db,
    dataDir: tmpDir,
    sse,
    pollIntervalMs: 10,
    timeoutMs: 200,
  });

  auditLogger = new AuditLogger(db, sse);

  connectorExecutor = new ConnectorExecutor();
  connectorExecutor.register(createTestConnector());

  rpcRouter = new RPCRouter({
    agentManager,
    policyEngine,
    approvalQueue,
    auditLogger,
    connectorExecutor,
    connectionManager: createMockConnectionManager() as any,
    sse,
  });
});

afterEach(() => {
  keepdb.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Helper: create a paired agent via the real pairing flow
function pairAgent(name: string): { agent: Agent; agentKeys: AgentKeys } {
  const { code } = agentManager.createPairing(name);
  const pairings = agentManager.listPairings();
  const pairing = pairings.find((p) => p.name === name)!;

  const agentPubkey = 'a'.repeat(64);
  const agent = agentManager.completePairing(agentPubkey, pairing.secret);

  // Create default policies
  const services = connectorExecutor.getRegisteredServices();
  policyEngine.createDefaults(agent.agentPubkey, services);

  const agentKeys: AgentKeys = {
    keepdPubkey: agent.keepdPubkey,
    keepdPrivkey: agent.keepdPrivkey,
    agentPubkey: agent.agentPubkey,
  };

  return { agent, agentKeys };
}

function makeRequest(overrides: Partial<RPCRequest> = {}): RPCRequest {
  return {
    id: 'req-' + Math.random().toString(36).slice(2),
    method: 'items.list',
    service: 'testservice',
    params: {},
    protocolVersion: PROTOCOL_VERSION,
    version: SOFTWARE_VERSION,
    ...overrides,
  };
}

// ============================================================
// RPCRouter Integration Tests
// ============================================================

describe('RPCRouter — Full Pipeline', () => {
  describe('Pairing Flow', () => {
    it('should complete pairing via RPC', async () => {
      const { code } = agentManager.createPairing('rpc-agent');
      const pairings = agentManager.listPairings();
      const pairing = pairings[0];

      const agentKeys: AgentKeys = {
        keepdPubkey: pairing.keepdPubkey,
        keepdPrivkey: pairing.keepdPrivkey,
        agentPubkey: '',
      };

      const request = makeRequest({
        method: 'pair',
        params: {
          secret: pairing.secret,
          pubkey: 'f'.repeat(64),
        },
      });
      delete request.service;

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-1');

      expect(result.error).toBeUndefined();
      expect(result.result).toMatchObject({
        success: true,
        name: 'rpc-agent',
        protocolVersion: PROTOCOL_VERSION,
      });

      // Agent should be in the database
      const agents = agentManager.listAgents();
      expect(agents.length).toBe(1);
      expect(agents[0].name).toBe('rpc-agent');
      expect(agents[0].agentPubkey).toBe('f'.repeat(64));
    });

    it('should reject pairing with invalid secret', async () => {
      agentManager.createPairing('bad-secret-agent');
      const pairings = agentManager.listPairings();
      const pairing = pairings[0];

      const agentKeys: AgentKeys = {
        keepdPubkey: pairing.keepdPubkey,
        keepdPrivkey: pairing.keepdPrivkey,
        agentPubkey: '',
      };

      const request = makeRequest({
        method: 'pair',
        params: { secret: 'wrong-secret', pubkey: 'f'.repeat(64) },
      });
      delete request.service;

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-2');

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('invalid_request');
    });

    it('should reject pairing without pubkey', async () => {
      agentManager.createPairing('no-pubkey-agent');
      const pairings = agentManager.listPairings();
      const pairing = pairings[0];

      const agentKeys: AgentKeys = {
        keepdPubkey: pairing.keepdPubkey,
        keepdPrivkey: pairing.keepdPrivkey,
        agentPubkey: '',
      };

      const request = makeRequest({
        method: 'pair',
        params: { secret: pairing.secret },
      });
      delete request.service;

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-3');

      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('pubkey');
    });
  });

  describe('Ping', () => {
    it('should respond to ping with version info', async () => {
      const { agentKeys } = pairAgent('ping-agent');
      const request = makeRequest({ method: 'ping' });
      delete request.service;

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-4');

      expect(result.result).toMatchObject({
        protocolVersion: PROTOCOL_VERSION,
        version: SOFTWARE_VERSION,
      });
      expect((result.result as any).timestamp).toBeGreaterThan(0);
    });
  });

  describe('Help', () => {
    it('should return all services help', async () => {
      const { agentKeys } = pairAgent('help-agent');
      const request = makeRequest({ method: 'help' });
      delete request.service;

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-5');

      expect(Array.isArray(result.result)).toBe(true);
      const services = result.result as ServiceHelp[];
      expect(services.length).toBe(1);
      expect(services[0].service).toBe('testservice');
    });

    it('should return service-specific help', async () => {
      const { agentKeys } = pairAgent('help-agent-2');
      const request = makeRequest({
        method: 'help',
        service: 'testservice',
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-6');

      const help = result.result as ServiceHelp;
      expect(help.service).toBe('testservice');
      expect(help.methods.length).toBe(3);
    });
  });

  describe('Read Request — Policy Allow', () => {
    it('should execute read request when default policy allows reads', async () => {
      const { agentKeys } = pairAgent('read-agent');

      const request = makeRequest({
        method: 'items.list',
        service: 'testservice',
        params: { query: 'test' },
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-7');

      expect(result.error).toBeUndefined();
      expect(result.result).toMatchObject({
        items: [{ id: '1', title: 'Test Item' }],
        total: 1,
      });

      // Verify audit log
      const entries = auditLogger.list();
      expect(entries.length).toBe(1);
      expect(entries[0].service).toBe('testservice');
      expect(entries[0].method).toBe('items.list');
      expect(entries[0].policyAction).toBe('allow');
      expect(entries[0].approved).toBe(true);
      expect(entries[0].approvedBy).toBe('policy');
      expect(entries[0].responseStatus).toBe('success');
    });
  });

  describe('Write Request — Policy Ask → Approval', () => {
    it('should queue write request for approval and approve', async () => {
      const { agentKeys } = pairAgent('write-agent');

      const request = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'New Item' },
      });

      // Start the request (it will block on approval)
      const promise = rpcRouter.handleRequest(request, agentKeys, 'evt-8');

      // Wait a tick for the approval to appear
      await new Promise((r) => setTimeout(r, 20));

      // Check approval queue
      const pending = approvalQueue.listPending();
      expect(pending.length).toBe(1);
      expect(pending[0].service).toBe('testservice');
      expect(pending[0].method).toBe('items.create');
      expect(pending[0].operationType).toBe('write');

      // Approve it
      approvalQueue.approve(pending[0].id);

      const result = await promise;

      expect(result.error).toBeUndefined();
      expect(result.result).toMatchObject({ id: '2', title: 'New Item' });

      // Audit log should show approval by user
      const entries = auditLogger.list();
      expect(entries.length).toBe(1);
      expect(entries[0].policyAction).toBe('ask');
      expect(entries[0].approved).toBe(true);
      expect(entries[0].approvedBy).toBe('user');
      expect(entries[0].responseStatus).toBe('success');
    });

    it('should deny write request when user denies', async () => {
      const { agentKeys } = pairAgent('deny-agent');

      const request = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'Denied Item' },
      });

      const promise = rpcRouter.handleRequest(request, agentKeys, 'evt-9');

      await new Promise((r) => setTimeout(r, 20));

      const pending = approvalQueue.listPending();
      approvalQueue.deny(pending[0].id);

      const result = await promise;

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('permission_denied');
      expect(result.error!.message).toContain('denied by user');

      // Audit shows denied
      const entries = auditLogger.list();
      expect(entries[0].approved).toBe(false);
      expect(entries[0].approvedBy).toBe('user');
    });

    it('should timeout write request when no approval', async () => {
      const { agentKeys } = pairAgent('timeout-agent');

      const request = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'Timed Out Item' },
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-10');

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('approval_timeout');

      // Audit shows timeout
      const entries = auditLogger.list();
      expect(entries[0].approved).toBe(false);
      expect(entries[0].approvedBy).toBe('timeout');
    });
  });

  describe('Policy Deny', () => {
    it('should deny request when policy denies writes', async () => {
      const { agent, agentKeys } = pairAgent('policy-deny-agent');

      // Set policy to deny writes
      const policy: Policy = {
        default: 'deny',
        rules: [
          { operations: ['read'], action: 'allow' },
        ],
      };
      policyEngine.savePolicy(agent.agentPubkey, 'testservice', policy);

      const request = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'Blocked' },
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-11');

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('permission_denied');
      expect(result.error!.message).toContain('Permission denied');

      // Audit log records the denial
      const entries = auditLogger.list();
      expect(entries.length).toBe(1);
      expect(entries[0].policyAction).toBe('deny');
      expect(entries[0].approved).toBe(false);
      expect(entries[0].approvedBy).toBe('policy');
    });

    it('should allow reads while denying writes with the same policy', async () => {
      const { agent, agentKeys } = pairAgent('mixed-policy-agent');

      const policy: Policy = {
        default: 'deny',
        rules: [
          { operations: ['read'], action: 'allow' },
        ],
      };
      policyEngine.savePolicy(agent.agentPubkey, 'testservice', policy);

      // Read should succeed
      const readReq = makeRequest({
        method: 'items.list',
        service: 'testservice',
      });
      const readResult = await rpcRouter.handleRequest(readReq, agentKeys, 'evt-12');
      expect(readResult.error).toBeUndefined();
      expect(readResult.result).toMatchObject({ items: expect.any(Array) });

      // Write should be denied
      const writeReq = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'Blocked' },
      });
      const writeResult = await rpcRouter.handleRequest(writeReq, agentKeys, 'evt-13');
      expect(writeResult.error!.code).toBe('permission_denied');
    });
  });

  describe('Policy Rules — Method-specific', () => {
    it('should deny specific methods while allowing others', async () => {
      const { agent, agentKeys } = pairAgent('method-rule-agent');

      const policy: Policy = {
        default: 'allow',
        rules: [
          { operations: ['delete'], methods: ['items.delete'], action: 'deny' },
        ],
      };
      policyEngine.savePolicy(agent.agentPubkey, 'testservice', policy);

      // delete should be denied
      const deleteReq = makeRequest({
        method: 'items.delete',
        service: 'testservice',
        params: { id: '1' },
      });
      const deleteResult = await rpcRouter.handleRequest(deleteReq, agentKeys, 'evt-14');
      expect(deleteResult.error!.code).toBe('permission_denied');

      // write should be allowed (not matched by rule, falls to default)
      const writeReq = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'Allowed' },
      });
      const writeResult = await rpcRouter.handleRequest(writeReq, agentKeys, 'evt-15');
      expect(writeResult.error).toBeUndefined();
    });
  });

  describe('Error Paths', () => {
    it('should reject unpaired agent', async () => {
      const agentKeys: AgentKeys = {
        keepdPubkey: '1'.repeat(64),
        keepdPrivkey: '2'.repeat(64),
        agentPubkey: '3'.repeat(64),
      };

      const request = makeRequest({
        method: 'items.list',
        service: 'testservice',
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-16');

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('not_paired');
    });

    it('should reject revoked agent', async () => {
      const { agent, agentKeys } = pairAgent('revoked-agent');

      // Revoke the agent
      agentManager.revokeAgent(agent.id);

      const request = makeRequest({
        method: 'items.list',
        service: 'testservice',
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-17');

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('not_paired');
    });

    it('should reject unknown service', async () => {
      const { agentKeys } = pairAgent('unknown-svc-agent');

      const request = makeRequest({
        method: 'something.do',
        service: 'nonexistent',
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-18');

      expect(result.error!.code).toBe('not_found');
      expect(result.error!.message).toContain('nonexistent');
    });

    it('should reject unknown method on known service', async () => {
      const { agentKeys } = pairAgent('unknown-method-agent');

      const request = makeRequest({
        method: 'nonexistent.method',
        service: 'testservice',
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-19');

      expect(result.error!.code).toBe('not_found');
      expect(result.error!.message).toContain('nonexistent.method');
    });

    it('should reject request without service', async () => {
      const { agentKeys } = pairAgent('no-svc-agent');

      const request = makeRequest({ method: 'items.list' });
      delete request.service;

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-20');

      expect(result.error!.code).toBe('invalid_request');
      expect(result.error!.message).toContain('Service is required');
    });

    it('should handle connector execution errors gracefully', async () => {
      const { agent, agentKeys } = pairAgent('exec-error-agent');

      // Set policy to allow all
      policyEngine.savePolicy(agent.agentPubkey, 'testservice', {
        default: 'allow',
        rules: [],
      });

      // Register a connector that throws
      const errorConnector: Connector = {
        ...createTestConnector(),
        service: 'errorservice',
        async execute() {
          throw new Error('Service unavailable');
        },
      };
      connectorExecutor.register(errorConnector);

      // Need mock connection manager to return connections for errorservice
      const request = makeRequest({
        method: 'items.list',
        service: 'errorservice',
      });

      // Create default policies for errorservice
      policyEngine.createDefaults(agent.agentPubkey, ['errorservice']);
      policyEngine.savePolicy(agent.agentPubkey, 'errorservice', {
        default: 'allow',
        rules: [],
      });

      const result = await rpcRouter.handleRequest(request, agentKeys, 'evt-21');

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('service_error');
      expect(result.error!.message).toContain('Service unavailable');

      // Audit should log the error
      const entries = auditLogger.list({ service: 'errorservice' });
      expect(entries.length).toBe(1);
      expect(entries[0].responseStatus).toBe('error');
      expect(entries[0].errorMessage).toBe('Service unavailable');
    });
  });

  describe('Agent Key Lookup', () => {
    it('should resolve paired agent keys', () => {
      const { agent } = pairAgent('lookup-agent');

      const keys = rpcRouter.getAgentKeys(agent.keepdPubkey);

      expect(keys).not.toBeNull();
      expect(keys!.keepdPubkey).toBe(agent.keepdPubkey);
      expect(keys!.agentPubkey).toBe(agent.agentPubkey);
    });

    it('should resolve pending pairing keys', () => {
      agentManager.createPairing('pending-agent');
      const pairings = agentManager.listPairings();
      const pairing = pairings[0];

      const keys = rpcRouter.getAgentKeys(pairing.keepdPubkey);

      expect(keys).not.toBeNull();
      expect(keys!.keepdPubkey).toBe(pairing.keepdPubkey);
      expect(keys!.agentPubkey).toBe(''); // Unknown until pairing completes
    });

    it('should return null for unknown pubkey', () => {
      const keys = rpcRouter.getAgentKeys('unknown'.repeat(8));
      expect(keys).toBeNull();
    });

    it('should not resolve revoked agent keys', () => {
      const { agent } = pairAgent('revoke-lookup-agent');
      agentManager.revokeAgent(agent.id);

      const keys = rpcRouter.getAgentKeys(agent.keepdPubkey);
      expect(keys).toBeNull();
    });
  });

  describe('Last Seen Tracking', () => {
    it('should update agent lastSeenAt on service request', async () => {
      const { agent, agentKeys } = pairAgent('tracking-agent');

      expect(agentManager.getAgent(agent.id)!.lastSeenAt).toBeNull();

      const request = makeRequest({
        method: 'items.list',
        service: 'testservice',
      });

      await rpcRouter.handleRequest(request, agentKeys, 'evt-22');

      const updated = agentManager.getAgent(agent.id)!;
      expect(updated.lastSeenAt).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// HTTP API Integration Tests (Fastify inject)
// ============================================================

describe('HTTP API — Fastify inject', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    await registerAgentRoutes(app, agentManager, policyEngine, () => {});
    await registerQueueRoutes(app, approvalQueue);
    await registerPolicyRoutes(app, agentManager, policyEngine, connectorExecutor);
    await registerLogRoutes(app, auditLogger);
    await registerConfigRoutes(app, db, sse, () => 9090);

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Agent Routes', () => {
    it('GET /api/agents — returns empty list initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/agents' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ agents: [] });
    });

    it('POST /api/agents/new — creates pairing code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/agents/new?name=test-agent',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBeTruthy();
      expect(body.id).toBeTruthy();
    });

    it('POST /api/agents/new — rejects missing name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/agents/new',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('name');
    });

    it('POST /api/agents/new — rejects duplicate name', async () => {
      pairAgent('dup-agent');

      const res = await app.inject({
        method: 'POST',
        url: '/api/agents/new?name=dup-agent',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('already in use');
    });

    it('GET /api/agents/:id — returns agent details', async () => {
      const { agent } = pairAgent('detail-agent');

      const res = await app.inject({
        method: 'GET',
        url: `/api/agents/${agent.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.name).toBe('detail-agent');
      expect(body.status).toBe('paired');
    });

    it('GET /api/agents/:id — 404 for unknown agent', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/agents/nonexistent',
      });

      expect(res.statusCode).toBe(404);
    });

    it('DELETE /api/agents/:id — revokes agent', async () => {
      const { agent } = pairAgent('revoke-agent');

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/agents/${agent.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      // Verify revoked
      const check = await app.inject({
        method: 'GET',
        url: `/api/agents/${agent.id}`,
      });
      expect(check.json().status).toBe('revoked');
    });

    it('DELETE /api/agents/:id — 404 for unknown agent', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/agents/nonexistent',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Queue Routes', () => {
    it('GET /api/queue — returns empty queue initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/queue' });
      expect(res.statusCode).toBe(200);
      expect(res.json().pending).toEqual([]);
    });

    it('POST /api/queue/:id/approve — 404 for non-existent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/queue/fake-id/approve',
      });
      expect(res.statusCode).toBe(404);
    });

    it('POST /api/queue/:id/deny — 404 for non-existent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/queue/fake-id/deny',
      });
      expect(res.statusCode).toBe(404);
    });

    it('should approve via HTTP and unblock RPC request', async () => {
      const { agent, agentKeys } = pairAgent('http-approve-agent');

      const request = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'HTTP Approved' },
      });

      // Start RPC request (blocks on approval)
      const rpcPromise = rpcRouter.handleRequest(request, agentKeys, 'evt-http-1');

      await new Promise((r) => setTimeout(r, 30));

      // Check queue via HTTP
      const queueRes = await app.inject({ method: 'GET', url: '/api/queue' });
      const pending = queueRes.json().pending;
      expect(pending.length).toBe(1);

      // Approve via HTTP
      const approveRes = await app.inject({
        method: 'POST',
        url: `/api/queue/${pending[0].id}/approve`,
      });
      expect(approveRes.statusCode).toBe(200);

      // RPC should complete
      const result = await rpcPromise;
      expect(result.error).toBeUndefined();
      expect(result.result).toMatchObject({ id: '2', title: 'HTTP Approved' });
    });

    it('should deny via HTTP and return error to RPC', async () => {
      const { agent, agentKeys } = pairAgent('http-deny-agent');

      const request = makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'HTTP Denied' },
      });

      const rpcPromise = rpcRouter.handleRequest(request, agentKeys, 'evt-http-2');

      await new Promise((r) => setTimeout(r, 30));

      const queueRes = await app.inject({ method: 'GET', url: '/api/queue' });
      const pending = queueRes.json().pending;

      const denyRes = await app.inject({
        method: 'POST',
        url: `/api/queue/${pending[0].id}/deny`,
      });
      expect(denyRes.statusCode).toBe(200);

      const result = await rpcPromise;
      expect(result.error!.code).toBe('permission_denied');
    });
  });

  describe('Policy Routes', () => {
    it('GET /api/agents/:id/policies — returns policies for agent', async () => {
      const { agent } = pairAgent('policy-list-agent');

      const res = await app.inject({
        method: 'GET',
        url: `/api/agents/${agent.id}/policies`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.policies.testservice).toBeDefined();
      expect(body.policies.testservice.default).toBe(DEFAULT_POLICY.default);
    });

    it('GET /api/agents/:id/policies/:service — returns specific policy', async () => {
      const { agent } = pairAgent('policy-get-agent');

      const res = await app.inject({
        method: 'GET',
        url: `/api/agents/${agent.id}/policies/testservice`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().policy.default).toBe(DEFAULT_POLICY.default);
    });

    it('PUT /api/agents/:id/policies/:service — saves policy', async () => {
      const { agent } = pairAgent('policy-save-agent');

      const newPolicy: Policy = {
        default: 'deny',
        rules: [
          { operations: ['read'], action: 'allow' },
          { operations: ['write'], methods: ['items.create'], action: 'ask' },
        ],
      };

      const res = await app.inject({
        method: 'PUT',
        url: `/api/agents/${agent.id}/policies/testservice`,
        payload: newPolicy,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      // Verify saved
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/agents/${agent.id}/policies/testservice`,
      });
      const savedPolicy = getRes.json().policy;
      expect(savedPolicy.default).toBe('deny');
      expect(savedPolicy.rules.length).toBe(2);
    });

    it('PUT /api/agents/:id/policies/:service — rejects invalid policy', async () => {
      const { agent } = pairAgent('policy-invalid-agent');

      const res = await app.inject({
        method: 'PUT',
        url: `/api/agents/${agent.id}/policies/testservice`,
        payload: { default: 'invalid', rules: [] },
      });

      expect(res.statusCode).toBe(400);
    });

    it('PUT /api/agents/:id/policies/:service — 404 for unknown agent', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/agents/nonexistent/policies/testservice',
        payload: DEFAULT_POLICY,
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Log Routes', () => {
    it('GET /api/logs — returns empty initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/logs' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ entries: [], total: 0 });
    });

    it('GET /api/logs — returns audit entries after requests', async () => {
      const { agentKeys } = pairAgent('log-agent');

      // Make a request to generate audit entry
      await rpcRouter.handleRequest(
        makeRequest({ method: 'items.list', service: 'testservice' }),
        agentKeys,
        'evt-log-1'
      );

      const res = await app.inject({ method: 'GET', url: '/api/logs' });
      const body = res.json();
      expect(body.total).toBe(1);
      expect(body.entries.length).toBe(1);
      expect(body.entries[0].service).toBe('testservice');
    });

    it('GET /api/logs — supports service filter', async () => {
      const { agent, agentKeys } = pairAgent('log-filter-agent');

      // Use the test agent for audit entries
      auditLogger.log({
        agent,
        metadata: {
          service: 'testservice',
          accountId: 'a@b.com',
          method: 'items.list',
          operationType: 'read',
          description: 'test',
        },
        policyAction: 'allow',
        approved: true,
        approvedBy: 'policy',
        responseStatus: 'success',
      });

      auditLogger.log({
        agent,
        metadata: {
          service: 'otherservice',
          accountId: 'a@b.com',
          method: 'do.thing',
          operationType: 'write',
          description: 'test2',
        },
        policyAction: 'ask',
        approved: true,
        approvedBy: 'user',
        responseStatus: 'success',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/logs?service=testservice',
      });
      expect(res.json().entries.length).toBe(1);
      expect(res.json().total).toBe(1);
    });

    it('GET /api/logs — supports pagination', async () => {
      const { agent } = pairAgent('log-page-agent');

      for (let i = 0; i < 5; i++) {
        auditLogger.log({
          agent,
          metadata: {
            service: 'testservice',
            accountId: 'a@b.com',
            method: 'items.list',
            operationType: 'read',
            description: `test ${i}`,
          },
          policyAction: 'allow',
          approved: true,
          approvedBy: 'policy',
          responseStatus: 'success',
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/logs?limit=2&offset=0',
      });

      expect(res.json().entries.length).toBe(2);
      expect(res.json().total).toBe(5);

      const res2 = await app.inject({
        method: 'GET',
        url: '/api/logs?limit=2&offset=2',
      });
      expect(res2.json().entries.length).toBe(2);
    });
  });

  describe('Config & Status Routes', () => {
    it('GET /api/status — returns status', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/status' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('ok');
      expect(body.port).toBe(9090);
      expect(body.agents).toMatchObject({ total: 0, paired: 0 });
      expect(body.connections).toMatchObject({ total: 0 });
      expect(body.pendingApprovals).toBe(0);
    });

    it('GET /api/status — reflects paired agents', async () => {
      pairAgent('status-agent');

      const res = await app.inject({ method: 'GET', url: '/api/status' });
      expect(res.json().agents.total).toBe(1);
      expect(res.json().agents.paired).toBe(1);
    });

    it('GET /api/config — returns empty settings initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/config' });
      expect(res.statusCode).toBe(200);
      expect(res.json().settings).toEqual({});
    });

    it('PUT /api/config — saves settings', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/config',
        payload: {
          relays: 'wss://relay1.test,wss://relay2.test',
          approvalTimeout: '600',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      // Verify saved
      const getRes = await app.inject({ method: 'GET', url: '/api/config' });
      const settings = getRes.json().settings;
      expect(settings.relays).toBe('wss://relay1.test,wss://relay2.test');
      expect(settings.approvalTimeout).toBe('600');
    });
  });
});

// ============================================================
// Cleanup Job Tests
// ============================================================

describe('Cleanup Jobs', () => {
  it('should clean up expired pairings', () => {
    // Create an expired pairing
    db.pairings.create({
      id: 'expired-pairing',
      name: 'expired-test',
      secret: 'secret-1',
      keepdPubkey: 'x'.repeat(64),
      keepdPrivkey: 'y'.repeat(64),
      expiresAt: Date.now() - 60000,
      createdAt: Date.now() - 120000,
    });

    // Create a valid pairing
    db.pairings.create({
      id: 'valid-pairing',
      name: 'valid-test',
      secret: 'secret-2',
      keepdPubkey: 'z'.repeat(64),
      keepdPrivkey: 'w'.repeat(64),
      expiresAt: Date.now() + 600000,
      createdAt: Date.now(),
    });

    expect(db.pairings.list().length).toBe(2);

    const cleaned = db.pairings.expireOld();
    expect(cleaned).toBe(1);
    expect(db.pairings.list().length).toBe(1);
    expect(db.pairings.list()[0].id).toBe('valid-pairing');
  });

  it('should clean up expired approvals', () => {
    // Insert agent for FK
    db.agents.create({
      id: 'cleanup-agent',
      name: 'cleanup-test',
      agentPubkey: '1'.repeat(64),
      keepdPubkey: '2'.repeat(64),
      keepdPrivkey: '3'.repeat(64),
      pairedAt: Date.now(),
    });

    // Create approval (created_at defaults to NOW via DB default)
    db.approvals.create({
      id: 'old-approval',
      agentId: 'cleanup-agent',
      agentName: 'cleanup-test',
      service: 'testservice',
      method: 'items.list',
      accountId: 'a@b.com',
      operationType: 'read',
      description: 'Old request',
      requestHash: 'abc123',
      tempFilePath: '/tmp/old.json',
    });

    // Manually backdate created_at to simulate old entry
    keepdb.db.prepare(
      `UPDATE approval_queue SET created_at = ? WHERE id = ?`
    ).run(Date.now() - CLEANUP.APPROVALS_MAX_AGE - 1000, 'old-approval');

    const pending = db.approvals.listPending();
    expect(pending.length).toBe(1);

    // Expire old approvals
    db.approvals.expireOld(CLEANUP.APPROVALS_MAX_AGE);

    const afterExpire = db.approvals.listPending();
    expect(afterExpire.length).toBe(0);
  });

  it('should clean up resolved approvals', () => {
    db.agents.create({
      id: 'cleanup-agent-2',
      name: 'cleanup-test-2',
      agentPubkey: '4'.repeat(64),
      keepdPubkey: '5'.repeat(64),
      keepdPrivkey: '6'.repeat(64),
      pairedAt: Date.now(),
    });

    db.approvals.create({
      id: 'resolved-approval',
      agentId: 'cleanup-agent-2',
      agentName: 'cleanup-test-2',
      service: 'testservice',
      method: 'items.list',
      accountId: 'a@b.com',
      operationType: 'read',
      description: 'Resolved request',
      requestHash: 'def456',
      tempFilePath: '/tmp/resolved.json',
    });

    db.approvals.resolve('resolved-approval', 'approved', 'user');

    // Manually backdate resolved_at to simulate old resolved entry
    keepdb.db.prepare(
      `UPDATE approval_queue SET resolved_at = ? WHERE id = ?`
    ).run(Date.now() - CLEANUP.APPROVALS_MAX_AGE - 1000, 'resolved-approval');

    // cleanupResolved should remove old resolved entries
    db.approvals.cleanupResolved(CLEANUP.APPROVALS_MAX_AGE);

    const entry = db.approvals.getById('resolved-approval');
    expect(entry).toBeNull();
  });

  it('should clean up old RPC request dedup entries', () => {
    // Insert an old rpc request
    db.rpcRequests.tryInsert('old-event', 'old-req', 'a'.repeat(64), 'items.list');

    // Manually set created_at to be old
    keepdb.db.prepare(
      `UPDATE rpc_requests SET created_at = ? WHERE event_id = ?`
    ).run(Date.now() - CLEANUP.RPC_REQUESTS_MAX_AGE - 1000, 'old-event');

    // Insert a fresh one
    db.rpcRequests.tryInsert('new-event', 'new-req', 'a'.repeat(64), 'items.list');

    db.rpcRequests.cleanupOld(CLEANUP.RPC_REQUESTS_MAX_AGE);

    // Old one should be gone, new one stays
    // Try inserting old event again — should succeed since it was cleaned
    const inserted = db.rpcRequests.tryInsert('old-event', 'old-req-2', 'a'.repeat(64), 'items.list');
    expect(inserted).toBe(true);

    // New one should still be deduped
    const dedup = db.rpcRequests.tryInsert('new-event', 'new-req-2', 'a'.repeat(64), 'items.list');
    expect(dedup).toBe(false);
  });

  it('should clean up old audit log entries', () => {
    const { agent } = pairAgent('audit-cleanup-agent');

    // Log an entry
    auditLogger.log({
      agent,
      metadata: {
        service: 'testservice',
        accountId: 'a@b.com',
        method: 'items.list',
        operationType: 'read',
        description: 'Old audit entry',
      },
      policyAction: 'allow',
      approved: true,
      approvedBy: 'policy',
      responseStatus: 'success',
    });

    expect(auditLogger.count()).toBe(1);

    // Manually age the entry
    keepdb.db.prepare(
      `UPDATE audit_log SET created_at = ?`
    ).run(Date.now() - CLEANUP.AUDIT_LOG_MAX_AGE - 1000);

    db.audit.cleanupOld(CLEANUP.AUDIT_LOG_MAX_AGE);
    expect(auditLogger.count()).toBe(0);
  });
});

// ============================================================
// Full Lifecycle Test
// ============================================================

describe('Full Agent Lifecycle', () => {
  it('should support complete lifecycle: pair → request → approve → audit → revoke', async () => {
    // 1. Create pairing via API
    const { code } = agentManager.createPairing('lifecycle-agent');
    const pairings = agentManager.listPairings();
    const pairing = pairings[0];

    // 2. Complete pairing via RPC (simulating agent)
    const agentKeys: AgentKeys = {
      keepdPubkey: pairing.keepdPubkey,
      keepdPrivkey: pairing.keepdPrivkey,
      agentPubkey: '',
    };

    const pairReq = makeRequest({
      method: 'pair',
      params: {
        secret: pairing.secret,
        pubkey: 'b'.repeat(64),
      },
    });
    delete pairReq.service;

    const pairResult = await rpcRouter.handleRequest(pairReq, agentKeys, 'lc-1');
    expect(pairResult.result).toMatchObject({ success: true, name: 'lifecycle-agent' });

    // 3. Agent is now paired
    const agent = agentManager.listAgents()[0];
    expect(agent.status).toBe('paired');
    expect(agent.agentPubkey).toBe('b'.repeat(64));

    // Update agentKeys for subsequent requests
    const pairedKeys: AgentKeys = {
      keepdPubkey: agent.keepdPubkey,
      keepdPrivkey: agent.keepdPrivkey,
      agentPubkey: agent.agentPubkey,
    };

    // 4. Read request (auto-allowed by default policy)
    const readResult = await rpcRouter.handleRequest(
      makeRequest({ method: 'items.list', service: 'testservice' }),
      pairedKeys,
      'lc-2'
    );
    expect(readResult.result).toMatchObject({ items: expect.any(Array) });

    // 5. Write request (requires approval by default policy)
    const writePromise = rpcRouter.handleRequest(
      makeRequest({
        method: 'items.create',
        service: 'testservice',
        params: { title: 'Lifecycle Item' },
      }),
      pairedKeys,
      'lc-3'
    );

    await new Promise((r) => setTimeout(r, 20));

    const pending = approvalQueue.listPending();
    expect(pending.length).toBe(1);
    approvalQueue.approve(pending[0].id);

    const writeResult = await writePromise;
    expect(writeResult.result).toMatchObject({ id: '2', title: 'Lifecycle Item' });

    // 6. Verify audit log has both entries
    const entries = auditLogger.list();
    expect(entries.length).toBe(2);

    const readEntry = entries.find((e) => e.method === 'items.list')!;
    expect(readEntry.policyAction).toBe('allow');
    expect(readEntry.approvedBy).toBe('policy');

    const writeEntry = entries.find((e) => e.method === 'items.create')!;
    expect(writeEntry.policyAction).toBe('ask');
    expect(writeEntry.approvedBy).toBe('user');

    // 7. Revoke agent
    agentManager.revokeAgent(agent.id);
    policyEngine.deleteAgentPolicies(agent.agentPubkey);

    expect(agentManager.getAgent(agent.id)!.status).toBe('revoked');

    // 8. Revoked agent's requests should fail
    const revokedResult = await rpcRouter.handleRequest(
      makeRequest({ method: 'items.list', service: 'testservice' }),
      pairedKeys,
      'lc-4'
    );
    expect(revokedResult.error!.code).toBe('not_paired');
  });
});
