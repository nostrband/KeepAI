/**
 * Audit log routes.
 *
 * GET /api/logs   List audit log entries (with filters)
 */

import type { FastifyInstance } from 'fastify';
import type { AuditLogger } from '../managers/audit-logger.js';

export async function registerLogRoutes(
  app: FastifyInstance,
  auditLogger: AuditLogger
): Promise<void> {
  app.get<{
    Querystring: {
      agent?: string;
      service?: string;
      from?: string;
      to?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/logs', async (request) => {
    const { agent, service, from, to, limit, offset } = request.query;

    const entries = auditLogger.list({
      agentId: agent,
      service,
      from: from ? Number(from) : undefined,
      to: to ? Number(to) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    const total = auditLogger.count({
      agentId: agent,
      service,
      from: from ? Number(from) : undefined,
      to: to ? Number(to) : undefined,
    });

    return { entries, total };
  });
}
