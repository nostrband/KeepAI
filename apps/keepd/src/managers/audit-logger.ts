/**
 * AuditLogger — logs all RPC requests with their outcomes.
 *
 * Every request is logged regardless of outcome (approved, denied, timed out, errored).
 */

import { randomUUID } from 'crypto';
import type { KeepDBApi, AuditFilters } from '@keepai/db';
import type {
  Agent,
  AuditEntry,
  PermissionMetadata,
  PolicyDecision,
} from '@keepai/proto';
import type { SSEBroadcaster } from '../sse.js';

export interface AuditLogParams {
  agent: Agent;
  metadata: PermissionMetadata;
  policyAction: PolicyDecision;
  approved: boolean;
  approvedBy: 'policy' | 'user' | 'timeout' | null;
  responseStatus: 'success' | 'error';
  errorMessage?: string;
  durationMs?: number;
}

export class AuditLogger {
  constructor(
    private db: KeepDBApi,
    private sse?: SSEBroadcaster
  ) {}

  setSse(sse: SSEBroadcaster): void {
    this.sse = sse;
  }

  log(params: AuditLogParams): void {
    const id = randomUUID();

    this.db.audit.log({
      id,
      agentId: params.agent.id,
      agentName: params.agent.name,
      service: params.metadata.service,
      method: params.metadata.method,
      accountId: params.metadata.accountId,
      operationType: params.metadata.operationType,
      policyAction: params.policyAction,
      approved: params.approved,
      approvedBy: params.approvedBy,
      requestSummary: params.metadata.description,
      responseStatus: params.responseStatus,
      errorMessage: params.errorMessage ?? null,
      durationMs: params.durationMs ?? null,
    });

    this.sse?.broadcast('request_completed', {
      id,
      agentId: params.agent.id,
      agentName: params.agent.name,
      service: params.metadata.service,
      method: params.metadata.method,
      accountId: params.metadata.accountId,
      requestSummary: params.metadata.description,
      responseStatus: params.responseStatus,
    });
  }

  list(filters: AuditFilters = {}): AuditEntry[] {
    return this.db.audit.list(filters);
  }

  count(filters: AuditFilters = {}): number {
    return this.db.audit.count(filters);
  }
}
