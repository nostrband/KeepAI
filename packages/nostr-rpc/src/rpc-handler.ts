import { type Event, type EventTemplate } from 'nostr-tools';
import type { RPCRequest, RPCResponse, RPCError } from '@keepai/proto/types.js';
import { EVENT_KINDS, PROTOCOL_VERSION, SOFTWARE_VERSION } from '@keepai/proto/constants.js';
import { PeerEncryption } from './encryption.js';
import { NostrTransport } from './transport.js';
import type { SubCloser } from 'nostr-tools/abstract-pool';

export interface AgentKeys {
  keepdPubkey: string;
  keepdPrivkey: string;
  agentPubkey: string;
}

export type RequestHandler = (
  request: RPCRequest,
  agent: AgentKeys,
  eventId: string
) => Promise<{ result?: unknown; error?: RPCError }>;

export interface HandlerOptions {
  relays: string[];
  getAgentKeys: (keepdPubkey: string) => AgentKeys | null;
  tryInsertRequest: (eventId: string, requestId: string, agentPubkey: string, method: string) => boolean;
  onRequest: RequestHandler;
}

/**
 * Server-side RPC handler. Used by keepd to listen for and process agent requests.
 */
export class RPCHandler {
  private transport: NostrTransport;
  private options: HandlerOptions;
  private sub: SubCloser | null = null;
  private encryptionCache = new Map<string, PeerEncryption>();

  constructor(options: HandlerOptions) {
    this.options = options;
    this.transport = new NostrTransport({ relays: options.relays });
  }

  /**
   * Start listening for RPC requests from agents.
   * @param pubkeys List of per-agent keepd pubkeys to listen on
   */
  listen(pubkeys: string[]): void {
    if (this.sub) this.sub.close();
    if (pubkeys.length === 0) return;

    this.sub = this.transport.subscribe(
      {
        kinds: [EVENT_KINDS.RPC_REQUEST],
        '#p': pubkeys,
        since: Math.floor(Date.now() / 1000) - 10,
      },
      (event) => {
        this.handleEvent(event).catch((err) => {
          console.error('[rpc-handler] Error handling event:', err);
        });
      }
    );
  }

  /**
   * Update the subscription with new pubkeys (e.g., after agent paired/revoked).
   */
  updateSubscription(pubkeys: string[]): void {
    this.listen(pubkeys);
  }

  private getEncryption(keepdPrivkey: string, agentPubkey: string): PeerEncryption {
    const key = `${keepdPrivkey}:${agentPubkey}`;
    let enc = this.encryptionCache.get(key);
    if (!enc) {
      enc = new PeerEncryption(keepdPrivkey, agentPubkey);
      this.encryptionCache.set(key, enc);
    }
    return enc;
  }

  private async handleEvent(event: Event): Promise<void> {
    // Find which per-agent keepd pubkey was targeted
    const targetPubkey = event.tags.find((t) => t[0] === 'p')?.[1];
    if (!targetPubkey) return;

    // Look up agent by keepd pubkey
    const agentKeys = this.options.getAgentKeys(targetPubkey);
    if (!agentKeys) return;

    const encryption = this.getEncryption(agentKeys.keepdPrivkey, event.pubkey);

    let request: RPCRequest;
    try {
      request = encryption.decryptJSON<RPCRequest>(event.content);
    } catch {
      return; // Can't decrypt — ignore
    }

    // Protocol version check
    if (request.protocolVersion !== PROTOCOL_VERSION) {
      await this.sendReject(event, agentKeys, encryption, request.id, {
        code: 'incompatible_protocol',
        message: `Protocol version ${request.protocolVersion} not supported, expected ${PROTOCOL_VERSION}. Please update keepai.`,
      });
      return;
    }

    // Deduplication
    const isNew = this.options.tryInsertRequest(
      event.id,
      request.id,
      event.pubkey,
      request.method
    );
    if (!isNew) return; // Duplicate

    // Process request
    try {
      const { result, error } = await this.options.onRequest(request, agentKeys, event.id);
      await this.sendResponse(event, agentKeys, encryption, request.id, result, error);
    } catch (err: any) {
      await this.sendResponse(event, agentKeys, encryption, request.id, undefined, {
        code: 'internal_error',
        message: err.message || 'Internal error',
      });
    }
  }

  private async sendResponse(
    requestEvent: Event,
    agent: AgentKeys,
    encryption: PeerEncryption,
    requestId: string,
    result?: unknown,
    error?: RPCError
  ): Promise<void> {
    const response: RPCResponse = {
      id: requestId,
      protocolVersion: PROTOCOL_VERSION,
      version: SOFTWARE_VERSION,
      result,
      error,
    };

    const template: EventTemplate = {
      kind: EVENT_KINDS.RPC_RESPONSE,
      content: encryption.encryptJSON(response),
      tags: [
        ['e', requestEvent.id],
        ['p', requestEvent.pubkey],
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    await this.transport.publishEvent(template, agent.keepdPrivkey);
  }

  private async sendReject(
    requestEvent: Event,
    agent: AgentKeys,
    encryption: PeerEncryption,
    requestId: string,
    error: RPCError
  ): Promise<void> {
    const response: RPCResponse = {
      id: requestId,
      protocolVersion: PROTOCOL_VERSION,
      version: SOFTWARE_VERSION,
      error,
    };

    const template: EventTemplate = {
      kind: EVENT_KINDS.RPC_REJECT,
      content: encryption.encryptJSON(response),
      tags: [
        ['e', requestEvent.id],
        ['p', requestEvent.pubkey],
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    await this.transport.publishEvent(template, agent.keepdPrivkey);
  }

  close(): void {
    if (this.sub) {
      this.sub.close();
      this.sub = null;
    }
    this.transport.close();
    this.encryptionCache.clear();
  }
}
