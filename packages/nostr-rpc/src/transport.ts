import { SimplePool, type Event, finalizeEvent, type EventTemplate } from 'nostr-tools';
import type { Filter } from 'nostr-tools/filter';
import { hexToBytes } from '@noble/hashes/utils';
import type { SubCloser } from 'nostr-tools/abstract-pool';

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
  }

  /**
   * Publish a signed event to all relays.
   */
  async publish(event: Event): Promise<void> {
    await Promise.allSettled(
      this.pool.publish(this.relays, event)
    );
  }

  /**
   * Create and sign an event, then publish it.
   */
  async publishEvent(
    template: EventTemplate,
    privkeyHex: string
  ): Promise<Event> {
    const event = finalizeEvent(template, hexToBytes(privkeyHex));
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
    onEose?: () => void
  ): SubCloser {
    return this.pool.subscribeMany(this.relays, filter, {
      onevent: onEvent,
      oneose: onEose,
    });
  }

  /**
   * Close all connections.
   */
  close(): void {
    this.pool.close(this.relays);
  }
}
