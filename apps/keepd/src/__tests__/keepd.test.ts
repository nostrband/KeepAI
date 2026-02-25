import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KeepDB, KeepDBApi } from '@keepai/db';
import { DEFAULT_POLICY, PROTOCOL_VERSION, SOFTWARE_VERSION } from '@keepai/proto';
import type { Policy, PermissionMetadata, RPCRequest } from '@keepai/proto';
import { AgentManager } from '../managers/agent-manager.js';
import { PolicyEngine } from '../managers/policy-engine.js';
import { ApprovalQueue } from '../managers/approval-queue.js';
import { AuditLogger } from '../managers/audit-logger.js';
import { SSEBroadcaster } from '../sse.js';
import { createDbBridge } from '../db-bridge.js';

let tmpDir: string;
let keepdb: KeepDB;
let db: KeepDBApi;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepd-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  keepdb = new KeepDB(dbPath);
  keepdb.migrate();
  db = new KeepDBApi(keepdb.db);
});

afterEach(() => {
  keepdb.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- AgentManager ---

describe('AgentManager', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager({
      db,
      relays: ['wss://relay.test'],
    });
  });

  it('should create a pairing and return a code', () => {
    const { code, id } = manager.createPairing('test-agent');
    expect(code).toBeTruthy();
    expect(typeof code).toBe('string');
    expect(id).toBeTruthy();
  });

  it('should reject duplicate agent names', () => {
    // First, complete a pairing to create an agent
    const { code } = manager.createPairing('existing-agent');
    const pairings = manager.listPairings();
    const pairing = pairings[0];

    // Complete pairing
    manager.completePairing('agent-pubkey-1', pairing.secret);

    // Try to create another pairing with same name
    expect(() => manager.createPairing('existing-agent')).toThrow('already in use');
  });

  it('should reject empty names', () => {
    expect(() => manager.createPairing('')).toThrow('required');
  });

  it('should complete pairing', () => {
    manager.createPairing('my-agent');
    const pairings = manager.listPairings();
    expect(pairings.length).toBe(1);

    const agent = manager.completePairing('agent-pubkey-2', pairings[0].secret);
    expect(agent.name).toBe('my-agent');
    expect(agent.agentPubkey).toBe('agent-pubkey-2');
    expect(agent.status).toBe('paired');

    // Pairing should be deleted
    expect(manager.listPairings().length).toBe(0);
    // Agent should exist
    expect(manager.listAgents().length).toBe(1);
  });

  it('should reject invalid secret', () => {
    manager.createPairing('agent-x');
    expect(() => manager.completePairing('pubkey', 'wrong-secret')).toThrow('Invalid or expired');
  });

  it('should get active keepd pubkeys', () => {
    manager.createPairing('agent-a');
    manager.createPairing('agent-b');

    const pubkeys = manager.getActiveKeepdPubkeys();
    expect(pubkeys.length).toBe(2); // 2 pending pairings
  });

  it('should revoke an agent', () => {
    manager.createPairing('agent-revoke');
    const pairing = manager.listPairings()[0];
    const agent = manager.completePairing('agent-pubkey-3', pairing.secret);

    manager.revokeAgent(agent.id);

    const updated = manager.getAgent(agent.id);
    expect(updated?.status).toBe('revoked');

    // Revoked agents should not appear in active pubkeys
    const pubkeys = manager.getActiveKeepdPubkeys();
    expect(pubkeys.length).toBe(0);
  });

  it('should touch agent last seen', () => {
    manager.createPairing('agent-touch');
    const pairing = manager.listPairings()[0];
    const agent = manager.completePairing('agent-pubkey-4', pairing.secret);

    expect(agent.lastSeenAt).toBeNull();
    manager.touchAgent(agent.id);

    const updated = manager.getAgent(agent.id);
    expect(updated?.lastSeenAt).toBeGreaterThan(0);
  });

  it('should cleanup expired pairings', () => {
    // Manually insert an expired pairing
    db.pairings.create({
      id: 'expired-1',
      name: 'expired-agent',
      secret: 'secret-expired',
      keepdPubkey: 'pub-expired',
      keepdPrivkey: 'priv-expired',
      expiresAt: Date.now() - 1000,
      createdAt: Date.now() - 60000,
    });

    expect(manager.listPairings().length).toBe(1);
    const cleaned = manager.cleanupExpiredPairings();
    expect(cleaned).toBe(1);
    expect(manager.listPairings().length).toBe(0);
  });
});

// --- PolicyEngine ---

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine(tmpDir);
  });

  it('should return default policy when no file exists', () => {
    const pubkey = '0'.repeat(64); // Valid hex, no file on disk
    const decision = engine.evaluate(pubkey, {
      service: 'gmail',
      accountId: 'user@test.com',
      method: 'messages.list',
      operationType: 'read',
      description: 'List emails',
    });
    expect(decision).toBe('allow'); // Default policy allows reads
  });

  it('should save and load a policy', () => {
    const pubkey = 'a'.repeat(64);
    const policy: Policy = {
      default: 'deny',
      rules: [
        { operations: ['read'], action: 'allow' },
      ],
    };

    engine.savePolicy(pubkey, 'gmail', policy);

    const decision = engine.evaluate(pubkey, {
      service: 'gmail',
      accountId: 'user@test.com',
      method: 'messages.list',
      operationType: 'read',
      description: 'List emails',
    });
    expect(decision).toBe('allow');

    const writeDec = engine.evaluate(pubkey, {
      service: 'gmail',
      accountId: 'user@test.com',
      method: 'messages.send',
      operationType: 'write',
      description: 'Send email',
    });
    expect(writeDec).toBe('deny'); // Falls to default
  });

  it('should match first rule that applies', () => {
    const pubkey = 'b'.repeat(64);
    const policy: Policy = {
      default: 'ask',
      rules: [
        { operations: ['write'], methods: ['messages.send'], action: 'deny' },
        { operations: ['write'], action: 'ask' },
        { operations: ['read'], action: 'allow' },
      ],
    };

    engine.savePolicy(pubkey, 'gmail', policy);

    // messages.send should match first rule → deny
    expect(
      engine.evaluate(pubkey, {
        service: 'gmail',
        accountId: 'x',
        method: 'messages.send',
        operationType: 'write',
        description: 'Send email',
      })
    ).toBe('deny');

    // drafts.create should match second rule → ask
    expect(
      engine.evaluate(pubkey, {
        service: 'gmail',
        accountId: 'x',
        method: 'drafts.create',
        operationType: 'write',
        description: 'Create draft',
      })
    ).toBe('ask');
  });

  it('should filter by accounts', () => {
    const pubkey = 'c'.repeat(64);
    const policy: Policy = {
      default: 'deny',
      rules: [
        { operations: ['read'], accounts: ['trusted@test.com'], action: 'allow' },
      ],
    };

    engine.savePolicy(pubkey, 'gmail', policy);

    expect(
      engine.evaluate(pubkey, {
        service: 'gmail',
        accountId: 'trusted@test.com',
        method: 'messages.list',
        operationType: 'read',
        description: 'List emails',
      })
    ).toBe('allow');

    expect(
      engine.evaluate(pubkey, {
        service: 'gmail',
        accountId: 'other@test.com',
        method: 'messages.list',
        operationType: 'read',
        description: 'List emails',
      })
    ).toBe('deny');
  });

  it('should create default policies', () => {
    const pubkey = 'd'.repeat(64);
    engine.createDefaults(pubkey, ['gmail', 'notion']);

    const policy = engine.getPolicy(pubkey, 'gmail');
    expect(policy.default).toBe(DEFAULT_POLICY.default);
    expect(policy.rules.length).toBe(DEFAULT_POLICY.rules.length);
  });

  it('should delete agent policies', () => {
    const pubkey = 'e'.repeat(64);
    engine.savePolicy(pubkey, 'gmail', DEFAULT_POLICY);
    engine.savePolicy(pubkey, 'notion', DEFAULT_POLICY);

    // Verify files exist
    const agentDir = path.join(tmpDir, 'agents', pubkey);
    expect(fs.existsSync(agentDir)).toBe(true);

    engine.deleteAgentPolicies(pubkey);
    expect(fs.existsSync(agentDir)).toBe(false);
  });

  it('should reject invalid pubkey format', () => {
    expect(() => engine.savePolicy('../evil', 'gmail', DEFAULT_POLICY)).toThrow('Invalid agent pubkey');
  });

  it('should reject invalid service ID', () => {
    const pubkey = 'f'.repeat(64);
    expect(() => engine.savePolicy(pubkey, '../evil', DEFAULT_POLICY)).toThrow('Invalid service ID');
  });

  it('should cache policies by mtime', () => {
    const pubkey = 'a1'.padEnd(64, '0');
    engine.savePolicy(pubkey, 'gmail', { default: 'deny', rules: [] });

    // First read → loads from file
    expect(engine.evaluate(pubkey, {
      service: 'gmail',
      accountId: 'x',
      method: 'messages.list',
      operationType: 'read',
      description: '',
    })).toBe('deny');

    // Second read → from cache (same mtime)
    expect(engine.evaluate(pubkey, {
      service: 'gmail',
      accountId: 'x',
      method: 'messages.list',
      operationType: 'read',
      description: '',
    })).toBe('deny');
  });
});

// --- ApprovalQueue ---

describe('ApprovalQueue', () => {
  let queue: ApprovalQueue;

  beforeEach(() => {
    // Insert a test agent for foreign key constraint
    db.agents.create({
      id: 'agent-1',
      name: 'test-agent',
      agentPubkey: 'a'.repeat(64),
      keepdPubkey: 'b'.repeat(64),
      keepdPrivkey: 'c'.repeat(64),
      pairedAt: Date.now(),
    });

    queue = new ApprovalQueue({
      db,
      dataDir: tmpDir,
      pollIntervalMs: 10, // Fast polling for tests
      timeoutMs: 200,     // Short timeout for tests
    });
  });

  it('should create an approval entry', async () => {
    const agent = createTestAgent();
    const metadata = createTestMetadata();
    const request = createTestRequest();

    // Start approval (don't await — it blocks)
    const promise = queue.requestApproval(agent, metadata, request);

    // Check pending
    const pending = queue.listPending();
    expect(pending.length).toBe(1);
    expect(pending[0].agentName).toBe('test-agent');
    expect(pending[0].service).toBe('gmail');

    // Approve it
    queue.approve(pending[0].id);

    const result = await promise;
    expect(result).toBe('approved');
  });

  it('should deny an approval', async () => {
    const promise = queue.requestApproval(
      createTestAgent(),
      createTestMetadata(),
      createTestRequest()
    );

    const pending = queue.listPending();
    queue.deny(pending[0].id);

    const result = await promise;
    expect(result).toBe('denied');
  });

  it('should timeout an approval', async () => {
    const result = await queue.requestApproval(
      createTestAgent(),
      createTestMetadata(),
      createTestRequest()
    );
    expect(result).toBe('expired');
  });

  it('should verify hash integrity on approve', async () => {
    const promise = queue.requestApproval(
      createTestAgent(),
      createTestMetadata(),
      createTestRequest()
    );

    const pending = queue.listPending();
    // Tamper with the temp file
    fs.writeFileSync(pending[0].tempFilePath, '{"tampered": true}');

    // Try to approve — should fail due to hash mismatch
    const approved = queue.approve(pending[0].id);
    expect(approved).toBe(false);

    // The pending entry should be denied
    const result = await promise;
    expect(result).toBe('denied');
  });

  it('should return false for approving non-existent entry', () => {
    expect(queue.approve('non-existent')).toBe(false);
  });

  it('should return false for denying non-existent entry', () => {
    expect(queue.deny('non-existent')).toBe(false);
  });
});

// --- AuditLogger ---

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger(db);
  });

  it('should log an audit entry', () => {
    logger.log({
      agent: createTestAgent(),
      metadata: createTestMetadata(),
      policyAction: 'allow',
      approved: true,
      approvedBy: 'policy',
      responseStatus: 'success',
      durationMs: 42,
    });

    const entries = logger.list();
    expect(entries.length).toBe(1);
    expect(entries[0].agentName).toBe('test-agent');
    expect(entries[0].service).toBe('gmail');
    expect(entries[0].policyAction).toBe('allow');
    expect(entries[0].approved).toBe(true);
    expect(entries[0].durationMs).toBe(42);
  });

  it('should log denied entries', () => {
    logger.log({
      agent: createTestAgent(),
      metadata: createTestMetadata(),
      policyAction: 'deny',
      approved: false,
      approvedBy: 'policy',
      responseStatus: 'error',
      errorMessage: 'Permission denied',
    });

    const entries = logger.list();
    expect(entries[0].approved).toBe(false);
    expect(entries[0].errorMessage).toBe('Permission denied');
  });

  it('should filter by service', () => {
    logger.log({
      agent: createTestAgent(),
      metadata: createTestMetadata(),
      policyAction: 'allow',
      approved: true,
      approvedBy: 'policy',
      responseStatus: 'success',
    });

    logger.log({
      agent: createTestAgent(),
      metadata: { ...createTestMetadata(), service: 'notion' },
      policyAction: 'allow',
      approved: true,
      approvedBy: 'policy',
      responseStatus: 'success',
    });

    expect(logger.list({ service: 'gmail' }).length).toBe(1);
    expect(logger.list({ service: 'notion' }).length).toBe(1);
    expect(logger.list().length).toBe(2);
  });

  it('should count entries', () => {
    for (let i = 0; i < 5; i++) {
      logger.log({
        agent: createTestAgent(),
        metadata: createTestMetadata(),
        policyAction: 'allow',
        approved: true,
        approvedBy: 'policy',
        responseStatus: 'success',
      });
    }

    expect(logger.count()).toBe(5);
  });
});

// --- SSEBroadcaster ---

describe('SSEBroadcaster', () => {
  it('should track client count', () => {
    const sse = new SSEBroadcaster();
    expect(sse.clientCount).toBe(0);
  });
});

// --- DB Bridge ---

describe('createDbBridge', () => {
  it('should bridge connection store', async () => {
    const bridge = createDbBridge(db.connections);

    // Insert a connection
    db.connections.upsert({
      id: 'gmail:user@test.com',
      service: 'gmail',
      accountId: 'user@test.com',
      status: 'connected',
      metadata: JSON.stringify({ displayName: 'Test User' }),
    });

    // Read via bridge
    const conn = await bridge.getConnection('gmail:user@test.com');
    expect(conn).not.toBeNull();
    expect(conn!.service).toBe('gmail');
    expect(conn!.account_id).toBe('user@test.com');
    expect(conn!.metadata).toEqual({ displayName: 'Test User' });

    // List all
    const all = await bridge.listConnections();
    expect(all.length).toBe(1);

    // List by service
    const gmailConns = await bridge.listByService('gmail');
    expect(gmailConns.length).toBe(1);

    const notionConns = await bridge.listByService('notion');
    expect(notionConns.length).toBe(0);

    // Update last used
    await bridge.updateLastUsed('gmail:user@test.com');

    // Delete
    await bridge.deleteConnection('gmail:user@test.com');
    const deleted = await bridge.getConnection('gmail:user@test.com');
    expect(deleted).toBeNull();
  });
});

// --- Helpers ---

function createTestAgent() {
  return {
    id: 'agent-1',
    name: 'test-agent',
    agentPubkey: 'a'.repeat(64),
    keepdPubkey: 'b'.repeat(64),
    keepdPrivkey: 'c'.repeat(64),
    status: 'paired' as const,
    pairedAt: Date.now(),
    lastSeenAt: null,
    createdAt: Date.now(),
  };
}

function createTestMetadata(): PermissionMetadata {
  return {
    service: 'gmail',
    accountId: 'user@test.com',
    method: 'messages.list',
    operationType: 'read',
    description: 'List emails',
  };
}

function createTestRequest(): RPCRequest {
  return {
    id: 'req-1',
    method: 'messages.list',
    service: 'gmail',
    params: { q: 'test' },
    protocolVersion: PROTOCOL_VERSION,
    version: SOFTWARE_VERSION,
  };
}
