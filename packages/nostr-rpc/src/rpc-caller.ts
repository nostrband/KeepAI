import { type EventTemplate } from 'nostr-tools';
import type { RPCRequest, RPCResponse, RPCError } from '@keepai/proto/types.js';
import { EVENT_KINDS, PROTOCOL_VERSION, SOFTWARE_VERSION, TIMEOUTS } from '@keepai/proto/constants.js';
import { PeerEncryption } from './encryption.js';
import { NostrTransport } from './transport.js';
import crypto from 'crypto';

export interface CallerOptions {
  privkey: string;
  pubkey: string;
  daemonPubkey: string;
  relays: string[];
  timeout?: number;
}

/**
 * Client-side RPC caller. Used by keepai CLI/SDK to send requests to keepd.
 */
export class RPCCaller {
  private transport: NostrTransport;
  private encryption: PeerEncryption;
  private privkey: string;
  private pubkey: string;
  private daemonPubkey: string;
  private timeout: number;

  constructor(options: CallerOptions) {
    this.privkey = options.privkey;
    this.pubkey = options.pubkey;
    this.daemonPubkey = options.daemonPubkey;
    this.timeout = options.timeout ?? TIMEOUTS.REQUEST;

    this.transport = new NostrTransport({ relays: options.relays });
    this.encryption = new PeerEncryption(options.privkey, options.daemonPubkey);
  }

  /**
   * Make an RPC call to keepd. Returns the result or throws on error.
   */
  async call(
    method: string,
    params?: {
      service?: string;
      params?: unknown;
      account?: string;
      timeout?: number;
    }
  ): Promise<unknown> {
    const requestId = crypto.randomBytes(16).toString('hex');
    const timeout = params?.timeout ?? this.timeout;

    const request: RPCRequest = {
      id: requestId,
      method,
      service: params?.service,
      params: params?.params,
      account: params?.account,
      protocolVersion: PROTOCOL_VERSION,
      version: SOFTWARE_VERSION,
    };

    const encryptedContent = this.encryption.encryptJSON(request);

    const template: EventTemplate = {
      kind: EVENT_KINDS.RPC_REQUEST,
      content: encryptedContent,
      tags: [['p', this.daemonPubkey]],
      created_at: Math.floor(Date.now() / 1000),
    };

    const event = await this.transport.publishEvent(template, this.privkey);

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        sub.close();
        reject(new Error(`RPC timeout after ${timeout}ms`));
      }, timeout);

      const sub = this.transport.subscribe(
        {
          kinds: [EVENT_KINDS.RPC_READY, EVENT_KINDS.RPC_REJECT, EVENT_KINDS.RPC_RESPONSE],
          '#e': [event.id],
          since: Math.floor(Date.now() / 1000) - 10,
        },
        (responseEvent) => {
          try {
            const response = this.encryption.decryptJSON<RPCResponse>(
              responseEvent.content
            );

            if (response.id !== requestId) return;

            // Handle rejection
            if (responseEvent.kind === EVENT_KINDS.RPC_REJECT) {
              clearTimeout(timer);
              sub.close();
              reject(new RPCCallError(response.error!));
              return;
            }

            // Handle response
            if (responseEvent.kind === EVENT_KINDS.RPC_RESPONSE) {
              clearTimeout(timer);
              sub.close();
              if (response.error) {
                reject(new RPCCallError(response.error));
              } else {
                resolve(response.result);
              }
              return;
            }

            // RPC_READY is for streamed requests — not implemented in V1 inline flow
          } catch {
            // Ignore malformed events
          }
        }
      );
    });
  }

  close(): void {
    this.transport.close();
  }
}

export class RPCCallError extends Error {
  readonly code: string;

  constructor(rpcError: RPCError) {
    super(rpcError.message);
    this.name = 'RPCCallError';
    this.code = rpcError.code;
  }
}
