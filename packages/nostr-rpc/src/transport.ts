import createDebug from 'debug';
import { SimplePool, type Event, finalizeEvent, type EventTemplate } from 'nostr-tools';
import type { Filter } from 'nostr-tools/filter';
import { hexToBytes } from '@noble/hashes/utils';
import type { SubCloser } from 'nostr-tools/abstract-pool';

const log = createDebug('keepai:transport');

export interface TransportOptions {
  relays: string[];
}

/**
 * Nostr relay transport using SimplePool.
 * Handles publishing events and subscribing to filters.
 */
export class NostrTransport {
  private pool: SimplePool;
  private relays: string[];

  constructor(options: TransportOptions) {
    this.pool = new SimplePool();
    this.relays = options.relays;
    log('created transport, relays: %o', options.relays);
  }

  /**
   * Publish a signed event to all relays.
   */
  async publish(event: Event): Promise<void> {
    log('publishing event kind:%d id:%s to %d relay(s)', event.kind, event.id, this.relays.length);
    const results = await Promise.allSettled(
      this.pool.publish(this.relays, event)
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const fail = results.filter((r) => r.status === 'rejected').length;
    log('publish results: %d ok, %d failed', ok, fail);
    if (fail > 0) {
      for (const r of results) {
        if (r.status === 'rejected') log('publish error: %s', r.reason);
      }
    }
  }

  /**
   * Create and sign an event, then publish it.
   */
  async publishEvent(
    template: EventTemplate,
    privkeyHex: string
  ): Promise<Event> {
    const event = finalizeEvent(template, hexToBytes(privkeyHex));
    log('finalized event kind:%d id:%s pubkey:%s', event.kind, event.id, event.pubkey);
    await this.publish(event);
    return event;
  }

  /**
   * Subscribe to events matching a filter.
   * Returns a SubCloser handle and calls the callback for each event.
   */
  subscribe(
    filter: Filter,
    onEvent: (event: Event) => void,
    onEose?: () => void,
    onClose?: (reasons: string[]) => void
  ): SubCloser {
    log('subscribing with filter: %o', filter);
    return this.pool.subscribeMany(this.relays, filter, {
      onevent: (event) => {
        log('received event kind:%d id:%s from:%s', event.kind, event.id, event.pubkey);
        onEvent(event);
      },
      oneose: () => {
        log('EOSE received');
        onEose?.();
      },
      onclose: (reasons) => {
        log('subscription closed, reasons: %o', reasons);
        onClose?.(reasons);
      },
    });
  }

  /**
   * Close all connections.
   */
  close(): void {
    log('closing transport');
    this.pool.close(this.relays);
  }
}
