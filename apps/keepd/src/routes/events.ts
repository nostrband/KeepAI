/**
 * SSE events endpoint.
 *
 * GET /api/events   Server-Sent Events stream for real-time UI updates
 */

import type { FastifyInstance } from 'fastify';
import type { SSEBroadcaster } from '../sse.js';

export async function registerEventsRoute(
  app: FastifyInstance,
  sse: SSEBroadcaster
): Promise<void> {
  app.get('/api/events', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send initial heartbeat
    reply.raw.write(':\n\n');

    // Register client
    sse.addClient(reply);

    // Keep alive with periodic heartbeats
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(':\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 30_000);

    reply.raw.on('close', () => {
      clearInterval(heartbeat);
    });

    // Don't end the response — it stays open for SSE
    // Fastify needs to know we're handling the response manually
    return reply;
  });
}
