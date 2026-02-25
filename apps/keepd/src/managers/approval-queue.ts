/**
 * ApprovalQueue — manages approval requests for operations that need user consent.
 *
 * Security model:
 * 1. Request JSON written to temp file
 * 2. SHA-256 hash stored in DB
 * 3. On approval, hash verified to prevent tampering
 * 4. DB is sole communication channel (decouples HTTP handler from RPC handler)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import type { KeepDBApi } from '@keepai/db';
import type {
  Agent,
  PermissionMetadata,
  RPCRequest,
  ApprovalEntry,
} from '@keepai/proto';
import { TIMEOUTS } from '@keepai/proto';
import type { SSEBroadcaster } from '../sse.js';

export interface ApprovalQueueOptions {
  db: KeepDBApi;
  dataDir: string;
  sse?: SSEBroadcaster;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export class ApprovalQueue {
  private db: KeepDBApi;
  private tempDir: string;
  private sse?: SSEBroadcaster;
  private timeoutMs: number;
  private pollIntervalMs: number;

  constructor(options: ApprovalQueueOptions) {
    this.db = options.db;
    this.tempDir = path.join(options.dataDir, 'temp');
    this.sse = options.sse;
    this.timeoutMs = options.timeoutMs ?? TIMEOUTS.REQUEST;
    this.pollIntervalMs = options.pollIntervalMs ?? TIMEOUTS.APPROVAL_POLL;
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  setSse(sse: SSEBroadcaster): void {
    this.sse = sse;
  }

  /**
   * Request user approval for an operation.
   * Blocks until approved, denied, or timed out.
   */
  async requestApproval(
    agent: Agent,
    metadata: PermissionMetadata,
    request: RPCRequest
  ): Promise<'approved' | 'denied' | 'expired'> {
    const id = randomUUID();

    // 1. Write request to temp file
    const tempFilePath = path.join(this.tempDir, `${id}.json`);
    const requestJson = JSON.stringify(request);
    fs.writeFileSync(tempFilePath, requestJson, { mode: 0o600 });

    // 2. Compute SHA-256 hash
    const hash = createHash('sha256').update(requestJson).digest('hex');

    // 3. Insert into approval queue
    this.db.approvals.create({
      id,
      agentId: agent.id,
      agentName: agent.name,
      service: metadata.service,
      method: metadata.method,
      accountId: metadata.accountId,
      operationType: metadata.operationType,
      description: metadata.description,
      requestHash: hash,
      tempFilePath,
      createdAt: Date.now(),
    });

    // 4. Emit SSE event
    this.sse?.broadcast('approval_request', {
      id,
      agentId: agent.id,
      agentName: agent.name,
      service: metadata.service,
      method: metadata.method,
      accountId: metadata.accountId,
      operationType: metadata.operationType,
      description: metadata.description,
    });

    // 5. Poll DB until status changes or timeout
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const entry = this.db.approvals.getById(id);
      if (!entry) {
        this.cleanupTempFile(tempFilePath);
        return 'denied';
      }

      if (entry.status === 'approved') {
        // Verify hash integrity
        if (!this.verifyHash(tempFilePath, entry.requestHash)) {
          console.error(
            `[approval-queue] Hash mismatch for approval ${id} — possible tampering`
          );
          this.cleanupTempFile(tempFilePath);
          return 'denied';
        }
        this.cleanupTempFile(tempFilePath);
        return 'approved';
      }

      if (entry.status === 'denied') {
        this.cleanupTempFile(tempFilePath);
        return 'denied';
      }

      if (entry.status === 'expired') {
        this.cleanupTempFile(tempFilePath);
        return 'expired';
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }

    // Timeout
    this.db.approvals.resolve(id, 'denied', 'timeout');
    this.cleanupTempFile(tempFilePath);

    this.sse?.broadcast('approval_resolved', {
      id,
      status: 'expired',
      resolvedBy: 'timeout',
    });

    return 'expired';
  }

  /**
   * Approve a pending request (called from HTTP handler).
   */
  approve(id: string): boolean {
    const entry = this.db.approvals.getById(id);
    if (!entry || entry.status !== 'pending') {
      return false;
    }

    // Verify hash integrity before approving
    if (!this.verifyHash(entry.tempFilePath, entry.requestHash)) {
      console.error(
        `[approval-queue] Hash mismatch on approve for ${id} — rejecting`
      );
      this.db.approvals.resolve(id, 'denied', 'system');
      return false;
    }

    this.db.approvals.resolve(id, 'approved', 'user');

    this.sse?.broadcast('approval_resolved', {
      id,
      status: 'approved',
      resolvedBy: 'user',
    });

    return true;
  }

  /**
   * Deny a pending request (called from HTTP handler).
   */
  deny(id: string): boolean {
    const entry = this.db.approvals.getById(id);
    if (!entry || entry.status !== 'pending') {
      return false;
    }

    this.db.approvals.resolve(id, 'denied', 'user');
    this.cleanupTempFile(entry.tempFilePath);

    this.sse?.broadcast('approval_resolved', {
      id,
      status: 'denied',
      resolvedBy: 'user',
    });

    return true;
  }

  listPending(): ApprovalEntry[] {
    return this.db.approvals.listPending();
  }

  getById(id: string): ApprovalEntry | null {
    return this.db.approvals.getById(id);
  }

  private verifyHash(filePath: string, expectedHash: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const actualHash = createHash('sha256').update(content).digest('hex');
      return actualHash === expectedHash;
    } catch {
      return false;
    }
  }

  private cleanupTempFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Already gone
    }
  }
}
