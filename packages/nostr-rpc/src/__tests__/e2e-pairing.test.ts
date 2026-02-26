/**
 * E2E pairing tests — exercises the full RPC flow over real nostr relays.
 *
 * These tests connect to the actual KeepAI relays to verify:
 * 1. Basic nostr pub/sub works (events are delivered)
 * 2. RPC request/response roundtrip works
 * 3. Full pairing handshake works end-to-end
 *
 * Run with: npx vitest run src/__tests__/e2e-pairing.test.ts
 * Debug with: DEBUG="keepai:*" npx vitest run src/__tests__/e2e-pairing.test.ts
 */

import { describe, it, expect, afterEach } from 'vitest';
import { NostrTransport } from '../transport.js';
import { RPCCaller } from '../rpc-caller.js';
import { RPCHandler, type AgentKeys } from '../rpc-handler.js';
import { PeerEncryption } from '../encryption.js';
import {
  generateKeypair,
  generateSecret,
  generatePairingCode,
  parsePairingCode,
} from '../pairing.js';
import { EVENT_KINDS, PROTOCOL_VERSION, SOFTWARE_VERSION } from '@keepai/proto/constants.js';
import type { RPCRequest, RPCResponse } from '@keepai/proto/types.js';
import { finalizeEvent, type EventTemplate } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

const RELAYS = ['wss://relay1.getkeep.ai', 'wss://relay2.getkeep.ai'];
const TIMEOUT = 15_000;

// Track resources for cleanup
const transports: NostrTransport[] = [];
const handlers: RPCHandler[] = [];
const callers: RPCCaller[] = [];

afterEach(() => {
  for (const t of transports) {
    try { t.close(); } catch {}
  }
  for (const h of handlers) {
    try { h.close(); } catch {}
  }
  for (const c of callers) {
    try { c.close(); } catch {}
  }
  transports.length = 0;
  handlers.length = 0;
  callers.length = 0;
});

function makeTransport(): NostrTransport {
  const t = new NostrTransport({ relays: RELAYS });
  transports.push(t);
  return t;
}

// ─── Test 1: Basic relay pub/sub ───────────────────────────────────────────

describe('E2E: relay pub/sub', () => {
  it('should publish and receive an event via real relays', async () => {
    const sender = generateKeypair();
    const receiver = generateKeypair();

    const pubTransport = makeTransport();
    const subTransport = makeTransport();

    // Subscribe first, then publish
    const received = new Promise<{ kind: number; content: string; pubkey: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for event')), TIMEOUT);

      subTransport.subscribe(
        {
          kinds: [EVENT_KINDS.RPC_REQUEST],
          '#p': [receiver.pubkey],
          since: Math.floor(Date.now() / 1000) - 10,
        },
        (event) => {
          clearTimeout(timer);
          resolve({ kind: event.kind, content: event.content, pubkey: event.pubkey });
        }
      );
    });

    // Small delay to let subscription establish
    await sleep(1000);

    // Publish
    const template: EventTemplate = {
      kind: EVENT_KINDS.RPC_REQUEST,
      content: 'test-content',
      tags: [['p', receiver.pubkey]],
      created_at: Math.floor(Date.now() / 1000),
    };

    await pubTransport.publishEvent(template, sender.privkey);

    const result = await received;
    expect(result.kind).toBe(EVENT_KINDS.RPC_REQUEST);
    expect(result.content).toBe('test-content');
    expect(result.pubkey).toBe(sender.pubkey);
  }, TIMEOUT + 5000);

  it('should receive events with correct #p tag filtering', async () => {
    const sender = generateKeypair();
    const target1 = generateKeypair();
    const target2 = generateKeypair();

    const pubTransport = makeTransport();
    const subTransport = makeTransport();

    const receivedEvents: string[] = [];

    // Subscribe to target1 only
    subTransport.subscribe(
      {
        kinds: [EVENT_KINDS.RPC_REQUEST],
        '#p': [target1.pubkey],
        since: Math.floor(Date.now() / 1000) - 10,
      },
      (event) => {
        receivedEvents.push(event.tags.find((t) => t[0] === 'p')?.[1] ?? '');
      }
    );

    await sleep(1000);

    // Publish to target2 (should NOT be received)
    await pubTransport.publishEvent(
      {
        kind: EVENT_KINDS.RPC_REQUEST,
        content: 'to-target2',
        tags: [['p', target2.pubkey]],
        created_at: Math.floor(Date.now() / 1000),
      },
      sender.privkey
    );

    // Publish to target1 (should be received)
    await pubTransport.publishEvent(
      {
        kind: EVENT_KINDS.RPC_REQUEST,
        content: 'to-target1',
        tags: [['p', target1.pubkey]],
        created_at: Math.floor(Date.now() / 1000),
      },
      sender.privkey
    );

    await sleep(3000);

    expect(receivedEvents).toEqual([target1.pubkey]);
  }, TIMEOUT + 5000);
});

// ─── Test 2: Encrypted RPC roundtrip ──────────────────────────────────────

describe('E2E: encrypted RPC roundtrip', () => {
  it('should send an encrypted RPC request and receive the response', async () => {
    const keepd = generateKeypair();
    const agent = generateKeypair();

    // Set up "server" handler
    const seenRequests = new Set<string>();

    const handler = new RPCHandler({
      relays: RELAYS,
      getAgentKeys: (pubkey) => {
        if (pubkey === keepd.pubkey) {
          return {
            keepdPubkey: keepd.pubkey,
            keepdPrivkey: keepd.privkey,
            agentPubkey: agent.pubkey,
          };
        }
        return null;
      },
      tryInsertRequest: (eventId, requestId) => {
        if (seenRequests.has(requestId)) return false;
        seenRequests.add(requestId);
        return true;
      },
      onRequest: async (request) => {
        if (request.method === 'ping') {
          return {
            result: {
              pong: true,
              protocolVersion: PROTOCOL_VERSION,
              timestamp: Date.now(),
            },
          };
        }
        return { error: { code: 'not_found', message: 'Unknown method' } };
      },
    });
    handlers.push(handler);

    // Start listening
    handler.listen([keepd.pubkey]);

    // Wait for subscription to establish
    await sleep(2000);

    // Set up "client" caller
    const caller = new RPCCaller({
      relays: RELAYS,
      privkey: agent.privkey,
      pubkey: agent.pubkey,
      daemonPubkey: keepd.pubkey,
      timeout: TIMEOUT,
    });
    callers.push(caller);

    // Make RPC call
    const result = await caller.call('ping', {});
    expect(result).toMatchObject({ pong: true, protocolVersion: PROTOCOL_VERSION });
  }, 30_000);
});

// ─── Test 3: Full pairing handshake ───────────────────────────────────────

describe('E2E: full pairing handshake', () => {
  it('should complete the pairing flow end-to-end', async () => {
    // --- Server side: create pairing code ---
    const keepd = generateKeypair();
    const secret = generateSecret();

    const pairingCode = generatePairingCode({
      pubkey: keepd.pubkey,
      relays: RELAYS,
      secret,
      protocolVersion: PROTOCOL_VERSION,
    });

    // Track state
    let pairingCompleted = false;
    let pairedAgentPubkey = '';
    const seenRequests = new Set<string>();

    // --- Server side: set up RPC handler ---
    const handler = new RPCHandler({
      relays: RELAYS,
      getAgentKeys: (pubkey) => {
        if (pubkey === keepd.pubkey) {
          return {
            keepdPubkey: keepd.pubkey,
            keepdPrivkey: keepd.privkey,
            agentPubkey: pairedAgentPubkey, // empty until paired
          };
        }
        return null;
      },
      tryInsertRequest: (eventId, requestId) => {
        if (seenRequests.has(requestId)) return false;
        seenRequests.add(requestId);
        return true;
      },
      onRequest: async (request, agentKeys) => {
        if (request.method === 'pair') {
          const params = request.params as Record<string, unknown> | undefined;
          const reqSecret = params?.secret as string;
          const agentPubkey = params?.pubkey as string;

          if (reqSecret !== secret) {
            return { error: { code: 'invalid_request', message: 'Bad secret' } };
          }

          pairingCompleted = true;
          pairedAgentPubkey = agentPubkey;

          return {
            result: {
              success: true,
              agentId: 'test-agent-id',
              name: 'test-agent',
              protocolVersion: PROTOCOL_VERSION,
              version: SOFTWARE_VERSION,
            },
          };
        }

        return { error: { code: 'not_found', message: 'Unknown method' } };
      },
    });
    handlers.push(handler);

    handler.listen([keepd.pubkey]);

    // Wait for subscription to be fully established on all relays
    await sleep(2000);

    // --- Agent side: parse code, generate keypair, send pair request ---
    const parsed = parsePairingCode(pairingCode);
    expect(parsed.pubkey).toBe(keepd.pubkey);
    expect(parsed.secret).toBe(secret);

    const agent = generateKeypair();

    const caller = new RPCCaller({
      relays: parsed.relays,
      privkey: agent.privkey,
      pubkey: agent.pubkey,
      daemonPubkey: parsed.pubkey,
      timeout: TIMEOUT,
    });
    callers.push(caller);

    const result = (await caller.call('pair', {
      params: { secret: parsed.secret, pubkey: agent.pubkey },
    })) as any;

    expect(result.success).toBe(true);
    expect(result.agentId).toBe('test-agent-id');
    expect(result.name).toBe('test-agent');
    expect(pairingCompleted).toBe(true);
    expect(pairedAgentPubkey).toBe(agent.pubkey);
  }, 30_000);

  it('should complete pairing after 15s idle gap (real-world delay)', async () => {
    // --- Server side: create pairing code ---
    const keepd = generateKeypair();
    const secret = generateSecret();

    const pairingCode = generatePairingCode({
      pubkey: keepd.pubkey,
      relays: RELAYS,
      secret,
      protocolVersion: PROTOCOL_VERSION,
    });

    let pairingCompleted = false;
    let pairedAgentPubkey = '';
    const seenRequests = new Set<string>();

    const handler = new RPCHandler({
      relays: RELAYS,
      getAgentKeys: (pubkey) => {
        if (pubkey === keepd.pubkey) {
          return {
            keepdPubkey: keepd.pubkey,
            keepdPrivkey: keepd.privkey,
            agentPubkey: pairedAgentPubkey,
          };
        }
        return null;
      },
      tryInsertRequest: (eventId, requestId) => {
        if (seenRequests.has(requestId)) return false;
        seenRequests.add(requestId);
        return true;
      },
      onRequest: async (request) => {
        if (request.method === 'pair') {
          const params = request.params as Record<string, unknown> | undefined;
          if (params?.secret !== secret) {
            return { error: { code: 'invalid_request', message: 'Bad secret' } };
          }
          pairingCompleted = true;
          pairedAgentPubkey = params?.pubkey as string;
          return {
            result: {
              success: true,
              agentId: 'test-agent-id',
              name: 'test-agent',
              protocolVersion: PROTOCOL_VERSION,
              version: SOFTWARE_VERSION,
            },
          };
        }
        return { error: { code: 'not_found', message: 'Unknown method' } };
      },
    });
    handlers.push(handler);

    handler.listen([keepd.pubkey]);
    console.log('[test] server subscription created, waiting 15s before agent connects...');

    // Simulate real-world delay: user copies code, opens terminal, runs npx keepai init
    await sleep(15_000);

    console.log('[test] 15s elapsed, agent connecting now...');

    const parsed = parsePairingCode(pairingCode);
    const agent = generateKeypair();

    const caller = new RPCCaller({
      relays: parsed.relays,
      privkey: agent.privkey,
      pubkey: agent.pubkey,
      daemonPubkey: parsed.pubkey,
      timeout: TIMEOUT,
    });
    callers.push(caller);

    const result = (await caller.call('pair', {
      params: { secret: parsed.secret, pubkey: agent.pubkey },
    })) as any;

    expect(result.success).toBe(true);
    expect(pairingCompleted).toBe(true);
    expect(pairedAgentPubkey).toBe(agent.pubkey);
  }, 60_000);

  it('should reject pairing with wrong secret', async () => {
    const keepd = generateKeypair();
    const secret = generateSecret();

    const pairingCode = generatePairingCode({
      pubkey: keepd.pubkey,
      relays: RELAYS,
      secret,
      protocolVersion: PROTOCOL_VERSION,
    });

    const seenRequests = new Set<string>();

    const handler = new RPCHandler({
      relays: RELAYS,
      getAgentKeys: (pubkey) => {
        if (pubkey === keepd.pubkey) {
          return {
            keepdPubkey: keepd.pubkey,
            keepdPrivkey: keepd.privkey,
            agentPubkey: '',
          };
        }
        return null;
      },
      tryInsertRequest: (eventId, requestId) => {
        if (seenRequests.has(requestId)) return false;
        seenRequests.add(requestId);
        return true;
      },
      onRequest: async (request) => {
        if (request.method === 'pair') {
          const params = request.params as Record<string, unknown> | undefined;
          if (params?.secret !== secret) {
            return { error: { code: 'invalid_request', message: 'Bad secret' } };
          }
          return { result: { success: true } };
        }
        return { error: { code: 'not_found', message: 'Unknown method' } };
      },
    });
    handlers.push(handler);

    handler.listen([keepd.pubkey]);
    await sleep(2000);

    const parsed = parsePairingCode(pairingCode);
    const agent = generateKeypair();

    const caller = new RPCCaller({
      relays: parsed.relays,
      privkey: agent.privkey,
      pubkey: agent.pubkey,
      daemonPubkey: parsed.pubkey,
      timeout: TIMEOUT,
    });
    callers.push(caller);

    // Send with wrong secret
    await expect(
      caller.call('pair', {
        params: { secret: 'wrong-secret', pubkey: agent.pubkey },
      })
    ).rejects.toThrow('Bad secret');
  }, 30_000);
});

// ─── Test 4: Subscription update (simulates adding new pairing) ──────────

describe('E2E: subscription update after pairing created', () => {
  it('should receive events after subscription is updated with new pubkey', async () => {
    const keepd1 = generateKeypair();
    const keepd2 = generateKeypair();
    const agent = generateKeypair();

    const seenRequests = new Set<string>();
    let receivedMethod = '';

    const handler = new RPCHandler({
      relays: RELAYS,
      getAgentKeys: (pubkey) => {
        // Return keys for either keepd pubkey
        for (const kp of [keepd1, keepd2]) {
          if (pubkey === kp.pubkey) {
            return {
              keepdPubkey: kp.pubkey,
              keepdPrivkey: kp.privkey,
              agentPubkey: agent.pubkey,
            };
          }
        }
        return null;
      },
      tryInsertRequest: (eventId, requestId) => {
        if (seenRequests.has(requestId)) return false;
        seenRequests.add(requestId);
        return true;
      },
      onRequest: async (request) => {
        receivedMethod = request.method;
        return { result: { ok: true } };
      },
    });
    handlers.push(handler);

    // Initially subscribe only to keepd1
    handler.listen([keepd1.pubkey]);
    await sleep(2000);

    // Now update subscription to also include keepd2
    handler.updateSubscription([keepd1.pubkey, keepd2.pubkey]);
    await sleep(2000);

    // Send request to keepd2 — should be received after subscription update
    const caller = new RPCCaller({
      relays: RELAYS,
      privkey: agent.privkey,
      pubkey: agent.pubkey,
      daemonPubkey: keepd2.pubkey,
      timeout: TIMEOUT,
    });
    callers.push(caller);

    const result = (await caller.call('ping', {})) as any;
    expect(result.ok).toBe(true);
    expect(receivedMethod).toBe('ping');
  }, 30_000);
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
