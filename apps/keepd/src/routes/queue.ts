/**
 * Approval queue routes.
 *
 * GET  /api/queue               List pending approvals
 * POST /api/queue/:id/approve   Approve request
 * POST /api/queue/:id/deny      Deny request
 */

import type { FastifyInstance } from 'fastify';
import type { ApprovalQueue } from '../managers/approval-queue.js';

export async function registerQueueRoutes(
  app: FastifyInstance,
  approvalQueue: ApprovalQueue
): Promise<void> {
  // List pending approvals
  app.get('/api/queue', async () => {
    const pending = approvalQueue.listPending();
    return { pending };
  });

  // Get request params for a specific approval (reads temp file, truncated)
  app.get<{ Params: { id: string } }>(
    '/api/queue/:id/params',
    async (request, reply) => {
      const entry = approvalQueue.getById(request.params.id);
      if (!entry || entry.status !== 'pending') {
        reply.status(404);
        return { error: 'Approval not found or not pending' };
      }
      return approvalQueue.readRequestParams(entry.tempFilePath);
    }
  );

  // Approve
  app.post<{ Params: { id: string } }>(
    '/api/queue/:id/approve',
    async (request, reply) => {
      const success = approvalQueue.approve(request.params.id);
      if (!success) {
        reply.status(404);
        return { error: 'Approval not found or already resolved' };
      }
      return { success: true };
    }
  );

  // Deny
  app.post<{ Params: { id: string } }>(
    '/api/queue/:id/deny',
    async (request, reply) => {
      const success = approvalQueue.deny(request.params.id);
      if (!success) {
        reply.status(404);
        return { error: 'Approval not found or already resolved' };
      }
      return { success: true };
    }
  );
}
