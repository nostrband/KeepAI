/**
 * SSE (Server-Sent Events) broadcaster for real-time UI updates.
 *
 * Event types: approval_request, approval_resolved, pairing_completed,
 * agent_connected, agent_disconnected, request_completed.
 */

import type { FastifyReply } from 'fastify';
import type { SSEEventType } from '@keepai/proto';

export class SSEBroadcaster {
  private clients = new Set<FastifyReply>();

  addClient(reply: FastifyReply): void {
    this.clients.add(reply);
    reply.raw.on('close', () => {
      this.clients.delete(reply);
    });
  }

  broadcast(event: SSEEventType, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.raw.write(message);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}
