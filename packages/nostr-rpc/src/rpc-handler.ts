import createDebug from 'debug';
import { type Event, type EventTemplate } from 'nostr-tools';
import type { RPCRequest, RPCResponse, RPCError } from '@keepai/proto/types.js';
import { EVENT_KINDS, PROTOCOL_VERSION, SOFTWARE_VERSION } from '@keepai/proto/constants.js';
import { PeerEncryption } from './encryption.js';
import { NostrTransport } from './transport.js';
import type { SubCloser } from 'nostr-tools/abstract-pool';

const log = createDebug('keepai:rpc-handler');

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
  private currentPubkeys: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(options: HandlerOptions) {
    this.options = options;
    this.transport = new NostrTransport({ relays: options.relays });
    log('created handler');
  }

  /**
   * Start listening for RPC requests from agents.
   * @param pubkeys List of per-agent keepd pubkeys to listen on
   */
  listen(pubkeys: string[]): void {
    if (this.sub) {
      const oldSub = this.sub;
      this.sub = null;
      oldSub.close();
    }
    this.currentPubkeys = pubkeys;

    if (pubkeys.length === 0) {
      log('listen called with 0 pubkeys, not subscribing');
      return;
    }

    log('subscribing to %d pubkey(s): %o', pubkeys.length, pubkeys);
    this.sub = this.transport.subscribe(
      {
        kinds: [EVENT_KINDS.RPC_REQUEST],
        '#p': pubkeys,
        since: Math.floor(Date.now() / 1000) - 10,
      },
      (event) => {
        log('got event', event);
        this.handleEvent(event).catch((err) => {
          log('error handling event: %O', err);
        });
      },
      undefined,
      (reasons) => {
        // Subscription was closed by relay (connection drop, etc.)
        // Check this.sub to distinguish unexpected closes from intentional ones
        // (scheduleReconnect and close() null out this.sub before closing)
        if (!this.sub) return;
        log('subscription closed unexpectedly: %o', reasons);
        if (!this.closed && this.currentPubkeys.length > 0) {
          this.scheduleReconnect();
        }
      }
    );
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    log('scheduling reconnect in 3s');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed) return;
      log('reconnecting with %d pubkey(s)', this.currentPubkeys.length);
      // Null out sub before closing to prevent onclose from scheduling another reconnect
      this.sub = null;
      // Create a fresh transport to get clean relay connections
      this.transport.close();
      this.transport = new NostrTransport({ relays: this.options.relays });
      this.listen(this.currentPubkeys);
    }, 3000);
  }

  /**
   * Update the subscription with new pubkeys (e.g., after agent paired/revoked).
   */
  updateSubscription(pubkeys: string[]): void {
    log('updating subscription with %d pubkey(s)', pubkeys.length);
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
    if (!targetPubkey) {
      log('ignoring event %s: no p tag', event.id);
      return;
    }

    log('handling event id:%s from:%s target:%s', event.id, event.pubkey, targetPubkey);

    // Look up agent by keepd pubkey
    const agentKeys = this.options.getAgentKeys(targetPubkey);
    if (!agentKeys) {
      log('no agent keys found for pubkey:%s', targetPubkey);
      return;
    }
    log('found agent keys, agentPubkey:%s', agentKeys.agentPubkey || '(pending pairing)');

    const encryption = this.getEncryption(agentKeys.keepdPrivkey, event.pubkey);

    let request: RPCRequest;
    try {
      request = encryption.decryptJSON<RPCRequest>(event.content);
    } catch (err) {
      log('decrypt failed for event %s: %s', event.id, err);
      return;
    }

    log('decrypted request method:%s service:%s id:%s', request.method, request.service ?? '-', request.id);

    // Protocol version check
    if (request.protocolVersion !== PROTOCOL_VERSION) {
      log('protocol mismatch: got %d, expected %d', request.protocolVersion, PROTOCOL_VERSION);
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
    if (!isNew) {
      log('duplicate request %s, ignoring', request.id);
      return;
    }

    // Process request
    try {
      log('routing request method:%s', request.method);
      const { result, error } = await this.options.onRequest(request, agentKeys, event.id);
      if (error) {
        log('handler returned error: %s (%s)', error.message, error.code);
      } else {
        log('handler returned result for method:%s', request.method);
      }
      await this.sendResponse(event, agentKeys, encryption, request.id, result, error);
    } catch (err: any) {
      log('handler threw: %s', err.message);
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
    log('sending response for request:%s error:%s', requestId, error?.code ?? 'none');
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
    log('sending reject for request:%s error:%s', requestId, error.code);
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
    log('closing handler');
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sub) {
      this.sub.close();
      this.sub = null;
    }
    this.transport.close();
    this.encryptionCache.clear();
  }
}
