/**
 * AgentManager — manages agent pairing lifecycle.
 *
 * Generates pairing codes, completes pairing handshakes, lists/revokes agents.
 * Pairing codes encode { pubkey, relays, secret, protocolVersion } as base64url.
 */

import createDebug from 'debug';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
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
  dataDir: string;
}

/**
 * Detect image type from initial bytes.
 * Returns extension or null if not a recognized image.
 */
export function detectImageType(buf: Buffer): string | null {
  // PNG: 89 50 4e 47
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png';
  }
  // JPEG: ff d8 ff
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }
  // WebP: RIFF....WEBP
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  // SVG: starts with <svg or <?xml
  const head = buf.toString('utf-8', 0, Math.min(buf.length, 256)).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    return 'svg';
  }
  return null;
}

export function getIconsDir(dataDir: string): string {
  return path.join(dataDir, 'icons');
}

export function findAgentIcon(dataDir: string, agentId: string): string | null {
  const dir = getIconsDir(dataDir);
  for (const ext of ['png', 'jpg', 'webp', 'svg']) {
    const p = path.join(dir, `${agentId}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function deleteAgentIcon(dataDir: string, agentId: string): void {
  for (const ext of ['png', 'jpg', 'webp', 'svg']) {
    const p = path.join(getIconsDir(dataDir), `${agentId}.${ext}`);
    try { fs.unlinkSync(p); } catch { /* ignore */ }
  }
}

async function fetchRobohashIcon(agentId: string, dataDir: string): Promise<void> {
  const dir = getIconsDir(dataDir);
  fs.mkdirSync(dir, { recursive: true });

  const seed = randomUUID();
  const url = `https://robohash.org/${seed}`;
  log('fetching robohash icon for agent %s from %s', agentId, url);

  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`robohash ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const ext = detectImageType(buf);
  if (!ext) throw new Error('unrecognized image format from robohash');

  // Remove any previous icon
  deleteAgentIcon(dataDir, agentId);
  fs.writeFileSync(path.join(dir, `${agentId}.${ext}`), buf);
  log('saved icon for agent %s (%s, %d bytes)', agentId, ext, buf.length);
}

export class AgentManager {
  private db: KeepDBApi;
  private relays: string[];
  private dataDir: string;

  constructor(options: AgentManagerOptions) {
    this.db = options.db;
    this.relays = options.relays ?? [...DEFAULT_RELAYS];
    this.dataDir = options.dataDir;
  }

  /**
   * Create a pending pairing. Returns the pairing code for the agent.
   */
  createPairing(name: string, type: string = ''): { code: string; id: string } {
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
      type,
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
  async completePairing(agentPubkey: string, secret: string): Promise<Agent> {
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
      type: pairing.type,
      agentPubkey,
      keepdPubkey: pairing.keepdPubkey,
      keepdPrivkey: pairing.keepdPrivkey,
      pairedAt: now,
    };

    this.db.agents.create(agent);
    this.db.pairings.delete(pairing.id);

    // Fetch random avatar from robohash (wait up to 3s, swallow errors)
    try {
      await fetchRobohashIcon(pairing.id, this.dataDir);
    } catch (err) {
      log('robohash icon fetch failed for agent %s: %O', pairing.id, err);
    }

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

  renameAgent(agentId: string, name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Agent name is required');
    }
    const existing = this.db.agents.getByName(name.trim());
    if (existing && existing.id !== agentId) {
      throw new Error(`Agent name "${name}" is already in use`);
    }
    this.db.agents.rename(agentId, name.trim());
    log('renamed agent id:%s to "%s"', agentId, name.trim());
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

  getDataDir(): string {
    return this.dataDir;
  }

  async refreshAgentIcon(agentId: string): Promise<void> {
    await fetchRobohashIcon(agentId, this.dataDir);
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
