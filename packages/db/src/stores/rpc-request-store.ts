import type Database from 'better-sqlite3';

export class RpcRequestStore {
  constructor(private db: Database.Database) {}

  /**
   * Try to insert a new RPC request record for deduplication.
   * Returns false if the event_id already exists (duplicate).
   */
  tryInsert(
    eventId: string,
    requestId: string,
    agentPubkey: string,
    method: string
  ): boolean {
    try {
      this.db
        .prepare(
          `INSERT INTO rpc_requests (event_id, request_id, agent_pubkey, method)
           VALUES (?, ?, ?, ?)`
        )
        .run(eventId, requestId, agentPubkey, method);
      return true;
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.message?.includes('UNIQUE constraint')) {
        return false;
      }
      throw err;
    }
  }

  updateStatus(eventId: string, status: string): void {
    const respondedAt = status === 'responded' || status === 'rejected' ? Date.now() : null;
    this.db
      .prepare(
        'UPDATE rpc_requests SET status = ?, responded_at = COALESCE(?, responded_at) WHERE event_id = ?'
      )
      .run(status, respondedAt, eventId);
  }

  /**
   * Delete records older than maxAgeMs. Returns count deleted.
   */
  cleanupOld(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db
      .prepare('DELETE FROM rpc_requests WHERE created_at < ?')
      .run(cutoff);
    return result.changes;
  }
}
