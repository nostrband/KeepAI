/**
 * In-memory tracker for transient connection health state (offline/online).
 * Not persisted to DB — resets on daemon restart (optimistic: all connections
 * start as online until a health check proves otherwise).
 */

export interface OfflineState {
  offline: boolean;
  error?: string;
  since?: number;
}

export class ConnectionHealthTracker {
  private state = new Map<string, OfflineState>();

  private key(service: string, accountId: string): string {
    return `${service}:${accountId}`;
  }

  markOffline(service: string, accountId: string, error: string): void {
    const k = this.key(service, accountId);
    const existing = this.state.get(k);
    this.state.set(k, {
      offline: true,
      error,
      since: existing?.since ?? Date.now(),
    });
  }

  markOnline(service: string, accountId: string): void {
    this.state.delete(this.key(service, accountId));
  }

  isOffline(service: string, accountId: string): boolean {
    return this.state.get(this.key(service, accountId))?.offline ?? false;
  }

  getState(service: string, accountId: string): OfflineState | undefined {
    return this.state.get(this.key(service, accountId));
  }
}
