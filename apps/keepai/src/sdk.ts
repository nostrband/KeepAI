/**
 * KeepAI SDK — programmatic interface for AI agents.
 *
 * Usage:
 *   const keep = new KeepAI();
 *   const result = await keep.run('gmail', 'messages.list', { q: 'is:unread' });
 *
 * Or with explicit config:
 *   const keep = new KeepAI({ configDir: '/path/to/.keepai' });
 */

import createDebug from 'debug';
import { EventEmitter } from 'events';
import {
  RPCCaller,
  RPCCallError,
  generateKeypair,
  parsePairingCode,
} from '@keepai/nostr-rpc';
import { EXIT_CODES } from '@keepai/proto';

const log = createDebug('keepai:sdk');
import {
  loadIdentity,
  loadConfig,
  saveIdentity,
  saveConfig,
  deleteStorage,
  isPaired,
  getConfigDir,
  type Identity,
  type ClientConfig,
} from './storage.js';

export interface KeepAIOptions {
  configDir?: string;
  /** Explicit connection details (skip loading from config files) */
  daemonPubkey?: string;
  relays?: string[];
  privateKey?: string;
  timeout?: number;
}

export interface StatusResult {
  paired: boolean;
  helpText?: string;
}

export class KeepAIError extends Error {
  code: string;
  exitCode: number;
  text?: string;

  constructor(message: string, code: string, exitCode: number, text?: string) {
    super(message);
    this.name = 'KeepAIError';
    this.code = code;
    this.exitCode = exitCode;
    this.text = text;
  }
}

export type KeepAIEvent = 'waiting_approval' | 'connected' | 'disconnected';

export class KeepAI extends EventEmitter {
  private configDir: string;
  private caller: RPCCaller | null = null;
  private identity: Identity | null = null;
  private config: ClientConfig | null = null;
  private timeout: number;

  constructor(options: KeepAIOptions = {}) {
    super();
    this.configDir = options.configDir ?? getConfigDir();
    this.timeout = options.timeout ?? 300_000;

    if (options.daemonPubkey && options.relays && options.privateKey) {
      // Explicit config — skip file loading
      this.identity = { privateKey: options.privateKey, publicKey: '' };
      this.config = {
        daemonPubkey: options.daemonPubkey,
        relays: options.relays,
        pairedAt: 0,
      };
    }
  }

  private ensurePaired(): void {
    if (!this.identity) {
      this.identity = loadIdentity(this.configDir);
    }
    if (!this.config) {
      this.config = loadConfig(this.configDir);
    }

    if (!this.identity || !this.config) {
      throw new KeepAIError(
        'Not paired with KeepAI daemon. Run "npx keepai init <code>" first.',
        'not_paired',
        EXIT_CODES.NOT_PAIRED
      );
    }
  }

  private getCaller(): RPCCaller {
    this.ensurePaired();

    if (!this.caller) {
      this.caller = new RPCCaller({
        relays: this.config!.relays,
        privkey: this.identity!.privateKey,
        pubkey: this.identity!.publicKey,
        daemonPubkey: this.config!.daemonPubkey,
        timeout: this.timeout,
      });
    }

    return this.caller;
  }

  /**
   * Pair with a KeepAI daemon using a pairing code.
   */
  static async init(
    pairingCode: string,
    options: { configDir?: string; timeout?: number } = {}
  ): Promise<{ helpText: string }> {
    const configDir = options.configDir ?? getConfigDir();
    const timeout = options.timeout ?? 30_000;

    // Decode pairing code
    const { pubkey, relays, secret } = parsePairingCode(pairingCode);
    log('parsed pairing code: daemonPubkey:%s relays:%o', pubkey, relays);

    // Generate keypair
    const { pubkey: agentPubkey, privkey: agentPrivkey } = generateKeypair();
    log('generated agent keypair pubkey:%s', agentPubkey);

    // Save identity
    saveIdentity({ privateKey: agentPrivkey, publicKey: agentPubkey }, configDir);
    log('saved identity to %s', configDir);

    // Create RPC caller for pairing
    const caller = new RPCCaller({
      relays,
      privkey: agentPrivkey,
      pubkey: agentPubkey,
      daemonPubkey: pubkey,
      timeout,
    });

    try {
      // Send pair request
      log('sending pair request with secret');
      const pairResult = await caller.call('pair', {
        params: { secret, pubkey: agentPubkey },
      });
      log('pair result: %O', pairResult);

      if (!pairResult || (pairResult as any).error) {
        throw new KeepAIError(
          'Pairing failed: ' + ((pairResult as any)?.error?.message ?? 'Unknown error'),
          'pairing_failed',
          EXIT_CODES.GENERAL_ERROR
        );
      }

      // Save config
      saveConfig(
        {
          daemonPubkey: pubkey,
          relays,
          pairedAt: Date.now(),
        },
        configDir
      );
      log('saved config to %s', configDir);

      // Fetch available services help text
      let helpText = '';
      try {
        log('fetching available services...');
        const helpResult = await caller.call('help', {});
        if (helpResult && typeof helpResult === 'object' && 'text' in (helpResult as any)) {
          helpText = (helpResult as any).text;
        }
        log('got help text (%d chars)', helpText.length);
      } catch (err) {
        log('help fetch failed (non-fatal): %s', err);
      }

      return { helpText };
    } finally {
      caller.close();
    }
  }

  /**
   * Check connection status.
   */
  async status(): Promise<StatusResult> {
    if (!isPaired(this.configDir)) {
      return { paired: false };
    }

    try {
      const result = await this.getCaller().call('ping', {});
      if (result) {
        this.emit('connected');
        // Also fetch services help text
        const helpResult = await this.getCaller().call('help', {});
        const helpText = helpResult && typeof helpResult === 'object' && 'text' in (helpResult as any)
          ? (helpResult as any).text
          : '';
        return { paired: true, helpText };
      }
    } catch {
      return { paired: true }; // Paired but daemon unreachable
    }

    return { paired: true };
  }

  /**
   * Get help text for services or a specific method.
   */
  async help(service?: string, method?: string): Promise<{ text: string }> {
    const caller = this.getCaller();
    const result = await caller.call('help', {
      service,
      params: method ? { method } : undefined,
    });
    // Handle both new format ({ text }) and old server format (ServiceHelp)
    if (result && typeof result === 'object' && 'text' in (result as any)) {
      return result as { text: string };
    }
    // Fallback for old servers: return raw JSON
    return { text: JSON.stringify(result, null, 2) };
  }

  /**
   * Execute a service operation.
   */
  async run(
    service: string,
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    log('run %s.%s params:%O', service, method, params);
    const caller = this.getCaller();
    const account = params.account as string | undefined;
    const cleanParams = { ...params };
    delete cleanParams.account;

    try {
      this.emit('waiting_approval');
      const result = await caller.call(method, {
        service,
        params: cleanParams,
        account,
      });
      return result;
    } catch (err) {
      if (err instanceof RPCCallError) {
        const code = err.code;
        let exitCode: number = EXIT_CODES.GENERAL_ERROR;

        switch (code) {
          case 'not_paired':
          case 'not_connected':
            exitCode = EXIT_CODES.NOT_PAIRED;
            break;
          case 'permission_denied':
            exitCode = EXIT_CODES.PERMISSION_DENIED;
            break;
          case 'approval_timeout':
            exitCode = EXIT_CODES.APPROVAL_TIMEOUT;
            break;
          case 'service_error':
            exitCode = EXIT_CODES.SERVICE_ERROR;
            break;
        }

        throw new KeepAIError(err.message, code, exitCode, err.text);
      }
      throw err;
    }
  }

  /**
   * Remove local identity and config.
   */
  disconnect(): void {
    deleteStorage(this.configDir);
    if (this.caller) {
      this.caller.close();
      this.caller = null;
    }
    this.identity = null;
    this.config = null;
    this.emit('disconnected');
  }

  /**
   * Close the SDK (cleanup resources).
   */
  close(): void {
    if (this.caller) {
      this.caller.close();
      this.caller = null;
    }
  }
}
