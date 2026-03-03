/**
 * AgentManager — manages agent pairing lifecycle.
 *
 * Generates pairing codes, completes pairing handshakes, lists/revokes agents.
 * Pairing codes encode { pubkey, relays, secret, protocolVersion } as base64url.
 */

import createDebug from 'debug';
import { randomUUID } from 'crypto';
import type { KeepDBApi } from '@keepai/db';

const log = createDebug('keepai:agent-mgr');
import type { Agent, PendingPairing } from '@keepai/proto';
import {
  generateKeypair,
  generateSecret,
  generatePairingCode,
} from '@keepai/nostr-rpc';
import { TIMEOUTS, DEFAULT_RELAYS, PROTOCOL_VERSION } from '@keepai/proto';

export interface AgentManagerOptions {
  db: KeepDBApi;
  relays?: string[];
}

export class AgentManager {
  private db: KeepDBApi;
  private relays: string[];

  constructor(options: AgentManagerOptions) {
    this.db = options.db;
    this.relays = options.relays ?? [...DEFAULT_RELAYS];
  }

  /**
   * Create a pending pairing. Returns the pairing code for the agent.
   */
  createPairing(name: string): { code: string; id: string } {
    // Validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Agent name is required');
    }

    // Check for duplicate names
    const existing = this.db.agents.getByName(name.trim());
    if (existing) {
      throw new Error(`Agent name "${name}" is already in use`);
    }

    const id = randomUUID();
    const { pubkey, privkey } = generateKeypair();
    const secret = generateSecret();

    const pairing: PendingPairing = {
      id,
      name: name.trim(),
      secret,
      keepdPubkey: pubkey,
      keepdPrivkey: privkey,
      expiresAt: Date.now() + TIMEOUTS.PAIRING,
      createdAt: Date.now(),
    };

    this.db.pairings.create(pairing);
    log('created pending pairing id:%s name:%s keepdPubkey:%s', id, name, pubkey);

    const code = generatePairingCode({
      pubkey,
      relays: this.relays,
      secret,
      protocolVersion: PROTOCOL_VERSION,
    });

    return { code, id };
  }

  /**
   * Complete pairing when agent sends "pair" RPC.
   * Moves keypair from pending_pairings to agents table.
   */
  completePairing(agentPubkey: string, secret: string): Agent {
    log('completePairing agentPubkey:%s', agentPubkey);
    const pairing = this.db.pairings.getBySecret(secret);
    if (!pairing) {
      log('no pairing found for secret');
      throw new Error('Invalid or expired pairing secret');
    }
    log('found pairing id:%s name:%s', pairing.id, pairing.name);

    if (pairing.expiresAt < Date.now()) {
      this.db.pairings.delete(pairing.id);
      throw new Error('Pairing code has expired');
    }

    const now = Date.now();
    const agent = {
      id: pairing.id,
      name: pairing.name,
      agentPubkey,
      keepdPubkey: pairing.keepdPubkey,
      keepdPrivkey: pairing.keepdPrivkey,
      pairedAt: now,
    };

    this.db.agents.create(agent);
    this.db.pairings.delete(pairing.id);

    return this.db.agents.getById(pairing.id)!;
  }

  /**
   * Look up agent by the per-agent keepd pubkey (from the "p" tag on incoming request).
   */
  getAgentByKeepdPubkey(keepdPubkey: string): Agent | null {
    return this.db.agents.getByKeepdPubkey(keepdPubkey);
  }

  /**
   * Look up pending pairing by keepd pubkey.
   */
  getPairingByKeepdPubkey(keepdPubkey: string): PendingPairing | null {
    return this.db.pairings.getByKeepdPubkey(keepdPubkey);
  }

  getAgent(id: string): Agent | null {
    return this.db.agents.getById(id);
  }

  listAgents(): Agent[] {
    return this.db.agents.list();
  }

  listPairings(): PendingPairing[] {
    return this.db.pairings.list();
  }

  pauseAgent(agentId: string): void {
    this.db.agents.pause(agentId);
    log('paused agent id:%s', agentId);
  }

  unpauseAgent(agentId: string): void {
    this.db.agents.unpause(agentId);
    log('unpaused agent id:%s', agentId);
  }

  revokeAgent(agentId: string): void {
    this.db.agents.revoke(agentId);
  }

  deleteAgent(agentId: string): void {
    this.db.agents.delete(agentId);
  }

  cancelPairing(pairingId: string): boolean {
    const pairing = this.db.pairings.list().find((p) => p.id === pairingId);
    if (!pairing) return false;
    this.db.pairings.delete(pairingId);
    log('cancelled pairing id:%s name:%s', pairingId, pairing.name);
    return true;
  }

  touchAgent(agentId: string): void {
    this.db.agents.updateLastSeen(agentId);
  }

  /**
   * Get all pubkeys that should be subscribed to (agents + pending pairings).
   */
  getActiveKeepdPubkeys(): string[] {
    const agentPubkeys = this.db.agents
      .list()
      .filter((a) => a.status === 'paired' || a.status === 'paused')
      .map((a) => a.keepdPubkey);

    const pairingPubkeys = this.db.pairings
      .list()
      .filter((p) => p.expiresAt > Date.now())
      .map((p) => p.keepdPubkey);

    const all = [...agentPubkeys, ...pairingPubkeys];
    log('active pubkeys: %d agent(s) + %d pending pairing(s) = %d total',
      agentPubkeys.length, pairingPubkeys.length, all.length);
    return all;
  }

  /**
   * Clean up expired pairings.
   */
  cleanupExpiredPairings(): number {
    return this.db.pairings.expireOld();
  }
}
