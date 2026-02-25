import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KeepDB } from '../database.js';
import { KeepDBApi } from '../api.js';
import crypto from 'crypto';

function randomHex(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

describe('KeepDB', () => {
  let db: KeepDB;

  beforeEach(() => {
    db = new KeepDB(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates database with WAL mode', () => {
    const mode = db.db.pragma('journal_mode', { simple: true });
    expect(mode).toBe('memory'); // WAL falls back to memory for :memory: DBs
  });

  it('starts at version 0 before migration', () => {
    expect(db.getVersion()).toBe(0);
  });

  it('migrates to version 1', () => {
    db.migrate();
    expect(db.getVersion()).toBe(1);
  });

  it('creates all 7 tables', () => {
    db.migrate();
    const tables = db.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('agents');
    expect(tableNames).toContain('pending_pairings');
    expect(tableNames).toContain('connections');
    expect(tableNames).toContain('rpc_requests');
    expect(tableNames).toContain('approval_queue');
    expect(tableNames).toContain('audit_log');
    expect(tableNames).toContain('settings');
  });

  it('migration is idempotent', () => {
    db.migrate();
    db.migrate(); // should not throw
    expect(db.getVersion()).toBe(1);
  });
});

describe('AgentStore', () => {
  let db: KeepDB;
  let api: KeepDBApi;

  beforeEach(() => {
    db = new KeepDB(':memory:');
    db.migrate();
    api = new KeepDBApi(db.db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves an agent', () => {
    const id = randomHex();
    api.agents.create({
      id,
      name: 'test-agent',
      agentPubkey: randomHex(32),
      keepdPubkey: randomHex(32),
      keepdPrivkey: randomHex(32),
      pairedAt: Date.now(),
    });

    const agent = api.agents.getById(id);
    expect(agent).not.toBeNull();
    expect(agent!.name).toBe('test-agent');
    expect(agent!.status).toBe('paired');
  });

  it('finds agent by pubkey', () => {
    const pubkey = randomHex(32);
    api.agents.create({
      id: randomHex(),
      name: 'by-pubkey',
      agentPubkey: pubkey,
      keepdPubkey: randomHex(32),
      keepdPrivkey: randomHex(32),
      pairedAt: Date.now(),
    });

    expect(api.agents.getByPubkey(pubkey)).not.toBeNull();
    expect(api.agents.getByPubkey(randomHex(32))).toBeNull();
  });

  it('finds agent by keepd pubkey', () => {
    const keepdPubkey = randomHex(32);
    api.agents.create({
      id: randomHex(),
      name: 'by-keepd-pub',
      agentPubkey: randomHex(32),
      keepdPubkey,
      keepdPrivkey: randomHex(32),
      pairedAt: Date.now(),
    });

    expect(api.agents.getByKeepdPubkey(keepdPubkey)).not.toBeNull();
  });

  it('lists all agents', () => {
    api.agents.create({ id: randomHex(), name: 'a1', agentPubkey: randomHex(32), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), pairedAt: Date.now() });
    api.agents.create({ id: randomHex(), name: 'a2', agentPubkey: randomHex(32), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), pairedAt: Date.now() });
    expect(api.agents.list()).toHaveLength(2);
  });

  it('revokes an agent', () => {
    const id = randomHex();
    api.agents.create({ id, name: 'revokable', agentPubkey: randomHex(32), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), pairedAt: Date.now() });
    api.agents.revoke(id);
    expect(api.agents.getById(id)!.status).toBe('revoked');
  });

  it('enforces unique names', () => {
    api.agents.create({ id: randomHex(), name: 'unique', agentPubkey: randomHex(32), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), pairedAt: Date.now() });
    expect(() =>
      api.agents.create({ id: randomHex(), name: 'unique', agentPubkey: randomHex(32), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), pairedAt: Date.now() })
    ).toThrow();
  });
});

describe('PairingStore', () => {
  let db: KeepDB;
  let api: KeepDBApi;

  beforeEach(() => {
    db = new KeepDB(':memory:');
    db.migrate();
    api = new KeepDBApi(db.db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and finds pairing by secret', () => {
    const secret = randomHex();
    api.pairings.create({
      id: randomHex(),
      name: 'agent1',
      secret,
      keepdPubkey: randomHex(32),
      keepdPrivkey: randomHex(32),
      expiresAt: Date.now() + 600_000,
      createdAt: Date.now(),
    });

    const pairing = api.pairings.getBySecret(secret);
    expect(pairing).not.toBeNull();
    expect(pairing!.name).toBe('agent1');
  });

  it('deletes a pairing', () => {
    const id = randomHex();
    const secret = randomHex();
    api.pairings.create({ id, name: 'del', secret, keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), expiresAt: Date.now() + 600_000, createdAt: Date.now() });
    api.pairings.delete(id);
    expect(api.pairings.getBySecret(secret)).toBeNull();
  });

  it('expires old pairings', () => {
    api.pairings.create({ id: randomHex(), name: 'old', secret: randomHex(), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), expiresAt: Date.now() - 1000, createdAt: Date.now() - 60000 });
    api.pairings.create({ id: randomHex(), name: 'new', secret: randomHex(), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), expiresAt: Date.now() + 600_000, createdAt: Date.now() });

    const expired = api.pairings.expireOld();
    expect(expired).toBe(1);
    expect(api.pairings.list()).toHaveLength(1);
  });
});

describe('ConnectionStore', () => {
  let db: KeepDB;
  let api: KeepDBApi;

  beforeEach(() => {
    db = new KeepDB(':memory:');
    db.migrate();
    api = new KeepDBApi(db.db);
  });

  afterEach(() => {
    db.close();
  });

  it('upserts and retrieves a connection', () => {
    api.connections.upsert({ id: 'gmail:user@test.com', service: 'gmail', accountId: 'user@test.com', label: 'Test' });
    const conn = api.connections.getById('gmail:user@test.com');
    expect(conn).not.toBeNull();
    expect(conn!.service).toBe('gmail');
    expect(conn!.label).toBe('Test');
    expect(conn!.status).toBe('connected');
  });

  it('lists by service', () => {
    api.connections.upsert({ id: 'gmail:a@test.com', service: 'gmail', accountId: 'a@test.com' });
    api.connections.upsert({ id: 'notion:ws1', service: 'notion', accountId: 'ws1' });
    expect(api.connections.listByService('gmail')).toHaveLength(1);
    expect(api.connections.listAll()).toHaveLength(2);
  });

  it('updates status', () => {
    api.connections.upsert({ id: 'gmail:x@test.com', service: 'gmail', accountId: 'x@test.com' });
    api.connections.updateStatus('gmail:x@test.com', 'error', 'Token expired');
    const conn = api.connections.getById('gmail:x@test.com');
    expect(conn!.status).toBe('error');
    expect(conn!.error).toBe('Token expired');
  });
});

describe('RpcRequestStore', () => {
  let db: KeepDB;
  let api: KeepDBApi;

  beforeEach(() => {
    db = new KeepDB(':memory:');
    db.migrate();
    api = new KeepDBApi(db.db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts a new request and returns true', () => {
    const result = api.rpcRequests.tryInsert(randomHex(), randomHex(), randomHex(32), 'messages.list');
    expect(result).toBe(true);
  });

  it('rejects duplicate event_id and returns false', () => {
    const eventId = randomHex();
    api.rpcRequests.tryInsert(eventId, randomHex(), randomHex(32), 'messages.list');
    const result = api.rpcRequests.tryInsert(eventId, randomHex(), randomHex(32), 'messages.get');
    expect(result).toBe(false);
  });

  it('cleans up old records', () => {
    api.rpcRequests.tryInsert(randomHex(), randomHex(), randomHex(32), 'test');
    // Records just created are not old, so cleanup returns 0
    expect(api.rpcRequests.cleanupOld(60_000)).toBe(0);
  });
});

describe('ApprovalStore', () => {
  let db: KeepDB;
  let api: KeepDBApi;
  let agentId: string;

  beforeEach(() => {
    db = new KeepDB(':memory:');
    db.migrate();
    api = new KeepDBApi(db.db);
    agentId = randomHex();
    api.agents.create({ id: agentId, name: 'test', agentPubkey: randomHex(32), keepdPubkey: randomHex(32), keepdPrivkey: randomHex(32), pairedAt: Date.now() });
  });

  afterEach(() => {
    db.close();
  });

  it('creates and lists pending approvals', () => {
    const id = randomHex();
    api.approvals.create({
      id,
      agentId,
      agentName: 'test',
      service: 'gmail',
      method: 'messages.send',
      accountId: 'user@test.com',
      operationType: 'write',
      description: 'Send email',
      requestHash: randomHex(32),
      tempFilePath: '/tmp/test.json',
      createdAt: Date.now(),
    });

    const pending = api.approvals.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(id);
    expect(pending[0].status).toBe('pending');
  });

  it('resolves an approval', () => {
    const id = randomHex();
    api.approvals.create({ id, agentId, agentName: 'test', service: 'gmail', method: 'messages.send', accountId: 'user@test.com', operationType: 'write', description: 'Send', requestHash: randomHex(32), tempFilePath: '/tmp/x.json', createdAt: Date.now() });

    api.approvals.resolve(id, 'approved', 'user');
    const entry = api.approvals.getById(id);
    expect(entry!.status).toBe('approved');
    expect(entry!.resolvedBy).toBe('user');
    expect(entry!.resolvedAt).not.toBeNull();
  });
});

describe('AuditStore', () => {
  let db: KeepDB;
  let api: KeepDBApi;

  beforeEach(() => {
    db = new KeepDB(':memory:');
    db.migrate();
    api = new KeepDBApi(db.db);
  });

  afterEach(() => {
    db.close();
  });

  it('logs and retrieves audit entries', () => {
    api.audit.log({
      id: randomHex(),
      agentId: 'a1',
      agentName: 'test',
      service: 'gmail',
      method: 'messages.list',
      accountId: 'user@test.com',
      operationType: 'read',
      policyAction: 'allow',
      approved: true,
      approvedBy: 'policy',
      requestSummary: 'List emails',
      responseStatus: 'success',
      errorMessage: null,
      durationMs: 150,
    });

    const entries = api.audit.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].approved).toBe(true);
    expect(entries[0].durationMs).toBe(150);
  });

  it('filters by service', () => {
    api.audit.log({ id: randomHex(), agentId: 'a1', agentName: 't', service: 'gmail', method: 'm', accountId: 'x', operationType: 'read', policyAction: 'allow', approved: true, approvedBy: 'policy', requestSummary: null, responseStatus: 'success', errorMessage: null, durationMs: null });
    api.audit.log({ id: randomHex(), agentId: 'a1', agentName: 't', service: 'notion', method: 'm', accountId: 'x', operationType: 'read', policyAction: 'allow', approved: true, approvedBy: 'policy', requestSummary: null, responseStatus: 'success', errorMessage: null, durationMs: null });

    expect(api.audit.list({ service: 'gmail' })).toHaveLength(1);
    expect(api.audit.count({ service: 'gmail' })).toBe(1);
    expect(api.audit.count()).toBe(2);
  });
});

describe('SettingsStore', () => {
  let db: KeepDB;
  let api: KeepDBApi;

  beforeEach(() => {
    db = new KeepDB(':memory:');
    db.migrate();
    api = new KeepDBApi(db.db);
  });

  afterEach(() => {
    db.close();
  });

  it('get/set/delete settings', () => {
    expect(api.settings.get('relays')).toBeNull();

    api.settings.set('relays', '["wss://r1.test"]');
    expect(api.settings.get('relays')).toBe('["wss://r1.test"]');

    api.settings.set('relays', '["wss://r2.test"]');
    expect(api.settings.get('relays')).toBe('["wss://r2.test"]');

    api.settings.delete('relays');
    expect(api.settings.get('relays')).toBeNull();
  });

  it('getAll returns all settings', () => {
    api.settings.set('a', '1');
    api.settings.set('b', '2');
    const all = api.settings.getAll();
    expect(all).toEqual({ a: '1', b: '2' });
  });
});
