/**
 * BillingManager — handles billing API communication, plan caching, and sync.
 *
 * Communicates with https://dashboard.getkeep.ai to manage:
 * - Device auth sign-in flow
 * - Token refresh
 * - Plan/subscription status
 * - Agent/app registration sync
 */

import createDebug from 'debug';
import * as crypto from 'crypto';
import type { KeepDBApi } from '@keepai/db';
import { BILLING_API_URL, FREE_PLAN } from '@keepai/proto';
import type { SSEBroadcaster } from '../sse.js';

const log = createDebug('keepai:billing');

export interface PlanInfo {
  plan_id: string | null;
  plan_name: string;
  status: string | null;
  max_agents: number;
  max_apps: number;
  billing_interval?: string | null;
  period_end?: string | null;
  grace_period_end?: string | null;
}

export interface BillingStatus {
  authenticated: boolean;
  user: { id: string; email: string; display_name: string | null } | null;
  plan: PlanInfo;
  usage: { agents: number; apps: number };
}

interface BillingAgent {
  agent_pubkey: string;
  name: string;
}

interface BillingApp {
  id: string;
  service: string;
  label?: string | null;
}

export class BillingManager {
  constructor(
    private db: KeepDBApi,
    private sse: SSEBroadcaster
  ) {}

  // --- Auth ---

  hasToken(): boolean {
    return !!this.db.settings.get('billing_api_token');
  }

  getToken(): string | null {
    return this.db.settings.get('billing_api_token');
  }

  getUser(): { id: string; email: string; display_name: string | null } | null {
    const id = this.db.settings.get('billing_user_id');
    const email = this.db.settings.get('billing_user_email');
    if (!id || !email) return null;
    return {
      id,
      email,
      display_name: this.db.settings.get('billing_user_display_name'),
    };
  }

  async initiateSignIn(): Promise<{ user_code: string; device_code: string; expires_at: string }> {
    const device_code = crypto.randomBytes(32).toString('hex');

    const res = await fetch(`${BILLING_API_URL}/api/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to initiate sign-in: ${res.status} ${text}`);
    }

    const data = await res.json();
    return { user_code: data.user_code, device_code, expires_at: data.expires_at };
  }

  async pollSignIn(device_code: string): Promise<{
    status: 'pending' | 'success' | 'expired';
    api_token?: string;
    user?: { id: string; email: string; display_name: string | null };
  }> {
    const res = await fetch(`${BILLING_API_URL}/api/auth/device/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code }),
    });

    if (res.status === 410) return { status: 'expired' };
    if (res.status === 429) return { status: 'pending' };

    if (!res.ok) {
      throw new Error(`Poll failed: ${res.status}`);
    }

    const data = await res.json();
    if (data.status === 'pending') return { status: 'pending' };

    // Success — save auth
    this.saveAuth(data.api_token, data.expires_at, data.user);
    log('sign-in completed for %s', data.user?.email);

    return {
      status: 'success',
      api_token: data.api_token,
      user: data.user,
    };
  }

  saveAuth(token: string, expiresAt: string, user: { id: string; email: string; display_name?: string | null }): void {
    this.db.settings.set('billing_api_token', token);
    this.db.settings.set('billing_token_expires_at', expiresAt);
    this.db.settings.set('billing_user_id', user.id);
    this.db.settings.set('billing_user_email', user.email);
    this.db.settings.set('billing_user_display_name', user.display_name ?? '');
  }

  clearAuth(): void {
    const keys = [
      'billing_api_token', 'billing_token_expires_at',
      'billing_user_id', 'billing_user_email', 'billing_user_display_name',
      'billing_plan_id', 'billing_plan_name', 'billing_plan_status',
      'billing_max_agents', 'billing_max_apps',
      'billing_usage_agents', 'billing_usage_apps',
      'billing_interval', 'billing_period_end', 'billing_grace_period_end',
      'billing_last_sync',
    ];
    for (const key of keys) {
      this.db.settings.delete(key);
    }
  }

  async signOut(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        // Find current token ID and revoke it
        const tokensRes = await this.apiCall('GET', '/api/auth/tokens');
        if (tokensRes.ok) {
          const { tokens } = await tokensRes.json();
          const current = tokens.find((t: { is_current: boolean }) => t.is_current);
          if (current) {
            await this.apiCall('DELETE', `/api/auth/token/${current.id}`);
          }
        }
      } catch (err) {
        log('sign-out revocation failed (best-effort): %O', err);
      }
    }
    this.clearAuth();
    this.sse.broadcast('billing_updated', {});
    log('signed out');
  }

  // --- Token lifecycle ---

  async refreshTokenIfNeeded(): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    const expiresAtStr = this.db.settings.get('billing_token_expires_at');
    if (!expiresAtStr) return;

    const expiresAt = new Date(expiresAtStr).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (expiresAt - Date.now() > sevenDays) return;

    log('token expires soon, refreshing...');
    try {
      const res = await fetch(`${BILLING_API_URL}/api/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.status === 401) {
        log('token refresh failed with 401, clearing auth');
        this.clearAuth();
        this.sse.broadcast('billing_updated', {});
        return;
      }

      if (res.ok) {
        const data = await res.json();
        this.db.settings.set('billing_api_token', data.api_token);
        this.db.settings.set('billing_token_expires_at', data.expires_at);
        log('token refreshed successfully');
      }
    } catch (err) {
      log('token refresh failed: %O', err);
    }
  }

  // --- Plan ---

  getPlan(): PlanInfo {
    const planId = this.db.settings.get('billing_plan_id');
    // If we have cached plan data, use it
    if (planId !== null) {
      return {
        plan_id: planId || null,
        plan_name: this.db.settings.get('billing_plan_name') || FREE_PLAN.plan_name,
        status: this.db.settings.get('billing_plan_status') || null,
        max_agents: parseInt(this.db.settings.get('billing_max_agents') || String(FREE_PLAN.max_agents), 10),
        max_apps: parseInt(this.db.settings.get('billing_max_apps') || String(FREE_PLAN.max_apps), 10),
        billing_interval: this.db.settings.get('billing_interval') || null,
        period_end: this.db.settings.get('billing_period_end') || null,
        grace_period_end: this.db.settings.get('billing_grace_period_end') || null,
      };
    }
    // No cached data — return free defaults
    return { ...FREE_PLAN };
  }

  async fetchPlan(): Promise<PlanInfo> {
    if (!this.hasToken()) {
      return { ...FREE_PLAN };
    }

    try {
      const res = await this.apiCall('GET', '/api/account/status');
      if (!res.ok) {
        log('fetchPlan failed with %d', res.status);
        return this.getPlan(); // fall back to cached
      }

      const data = await res.json();
      const sub = data.subscription;
      const limits = data.limits;

      if (sub && limits) {
        this.db.settings.set('billing_plan_id', sub.plan_id || '');
        this.db.settings.set('billing_plan_name', sub.plan_name || '');
        this.db.settings.set('billing_plan_status', sub.status || '');
        this.db.settings.set('billing_max_agents', String(limits.max_agents));
        this.db.settings.set('billing_max_apps', String(limits.max_apps));
        this.db.settings.set('billing_usage_agents', String(data.usage?.agents ?? 0));
        this.db.settings.set('billing_usage_apps', String(data.usage?.apps ?? 0));
        this.db.settings.set('billing_interval', sub.billing_interval || '');
        this.db.settings.set('billing_period_end', sub.current_period_end || '');
        this.db.settings.set('billing_grace_period_end', sub.grace_period_end || '');
      } else {
        // No subscription — store Free plan marker
        this.db.settings.set('billing_plan_id', '');
        this.db.settings.set('billing_plan_name', FREE_PLAN.plan_name);
        this.db.settings.set('billing_plan_status', '');
        this.db.settings.set('billing_max_agents', String(FREE_PLAN.max_agents));
        this.db.settings.set('billing_max_apps', String(FREE_PLAN.max_apps));
      }

      const plan = this.getPlan();
      this.sse.broadcast('billing_updated', { plan });
      return plan;
    } catch (err) {
      log('fetchPlan error: %O', err);
      return this.getPlan();
    }
  }

  getStatus(activeAgentCount: number, activeAppCount: number): BillingStatus {
    return {
      authenticated: this.hasToken(),
      user: this.getUser(),
      plan: this.getPlan(),
      usage: {
        agents: activeAgentCount,
        apps: activeAppCount,
      },
    };
  }

  // --- Sync ---

  async fullSync(agents: BillingAgent[], connections: BillingApp[]): Promise<void> {
    if (!this.hasToken()) return;

    log('starting full sync: %d agents, %d connections', agents.length, connections.length);

    try {
      // Fetch current plan
      await this.fetchPlan();

      // Get server-side lists
      const [serverAgentsRes, serverAppsRes] = await Promise.all([
        this.apiCall('GET', '/api/agents'),
        this.apiCall('GET', '/api/apps'),
      ]);

      const serverAgents: Set<string> = new Set();
      const serverApps: Set<string> = new Set();

      if (serverAgentsRes.ok) {
        const data = await serverAgentsRes.json();
        for (const a of data.agents ?? []) {
          serverAgents.add(a.pubkey);
        }
      }

      if (serverAppsRes.ok) {
        const data = await serverAppsRes.json();
        for (const a of data.apps ?? []) {
          serverApps.add(a.pubkey);
        }
      }

      // Register active agents not on server
      for (const agent of agents) {
        if (!serverAgents.has(agent.agent_pubkey)) {
          try {
            const res = await this.apiCall('POST', '/api/agents', {
              pubkey: agent.agent_pubkey,
              name: agent.name,
            });
            if (!res.ok && res.status !== 409) {
              const text = await res.text();
              log('failed to register agent %s: %d %s', agent.name, res.status, text);
            } else {
              log('registered agent %s', agent.name);
            }
          } catch (err) {
            log('failed to register agent %s: %O', agent.name, err);
          }
        }
      }

      // Register active apps not on server
      for (const conn of connections) {
        if (!serverApps.has(conn.id)) {
          try {
            const res = await this.apiCall('POST', '/api/apps', {
              pubkey: conn.id,
              service: conn.service,
              name: conn.label || conn.service,
            });
            if (!res.ok && res.status !== 409) {
              const text = await res.text();
              log('failed to register app %s: %d %s', conn.id, res.status, text);
            } else {
              log('registered app %s (%s)', conn.id, conn.service);
            }
          } catch (err) {
            log('failed to register app %s: %O', conn.id, err);
          }
        }
      }

      // Delete revoked agents from server
      const revokedAgents = this.db.agents.list().filter(a => a.status === 'revoked');
      for (const agent of revokedAgents) {
        if (serverAgents.has(agent.agentPubkey)) {
          try {
            const res = await this.apiCall('DELETE', `/api/agents?pubkey=${encodeURIComponent(agent.agentPubkey)}`);
            if (res.ok || res.status === 404) {
              this.db.agents.delete(agent.id);
              log('unregistered and cleaned up agent %s', agent.name);
            }
          } catch (err) {
            log('failed to unregister agent %s: %O', agent.name, err);
          }
        } else {
          // Not on server (maybe already deleted), clean up locally
          this.db.agents.delete(agent.id);
        }
      }

      // Delete disconnected apps from server
      const disconnectedApps = this.db.connections.listDisconnected();
      for (const conn of disconnectedApps) {
        if (serverApps.has(conn.id)) {
          try {
            const res = await this.apiCall('DELETE', `/api/apps?pubkey=${encodeURIComponent(conn.id)}`);
            if (res.ok || res.status === 404) {
              this.db.connections.hardDelete(conn.id);
              log('unregistered and cleaned up app %s (%s)', conn.id, conn.service);
            }
          } catch (err) {
            log('failed to unregister app %s: %O', conn.id, err);
          }
        } else {
          // Not on server, clean up locally
          this.db.connections.hardDelete(conn.id);
        }
      }

      this.db.settings.set('billing_last_sync', new Date().toISOString());

      // Re-fetch plan to get updated usage counts
      await this.fetchPlan();

      log('full sync complete');
    } catch (err) {
      log('full sync error: %O', err);
    }
  }

  async registerAgent(agent: BillingAgent): Promise<void> {
    if (!this.hasToken()) return;
    try {
      const res = await this.apiCall('POST', '/api/agents', {
        pubkey: agent.agent_pubkey,
        name: agent.name,
      });
      if (!res.ok && res.status !== 409) {
        const text = await res.text();
        log('failed to register agent %s: %d %s', agent.name, res.status, text);
        return;
      }
      await this.fetchPlan();
      log('registered agent %s', agent.name);
    } catch (err) {
      log('failed to register agent (will retry on next sync): %O', err);
    }
  }

  async registerApp(app: BillingApp): Promise<void> {
    if (!this.hasToken()) return;
    try {
      const res = await this.apiCall('POST', '/api/apps', {
        pubkey: app.id,
        service: app.service,
        name: app.label || app.service,
      });
      if (!res.ok && res.status !== 409) {
        const text = await res.text();
        log('failed to register app %s: %d %s', app.id, res.status, text);
        return;
      }
      await this.fetchPlan();
      log('registered app %s (%s)', app.id, app.service);
    } catch (err) {
      log('failed to register app (will retry on next sync): %O', err);
    }
  }

  async unregisterAgent(agentPubkey: string): Promise<void> {
    if (!this.hasToken()) return;
    try {
      const res = await this.apiCall('DELETE', `/api/agents?pubkey=${encodeURIComponent(agentPubkey)}`);
      if (!res.ok && res.status !== 404) {
        const text = await res.text();
        log('failed to unregister agent %s: %d %s', agentPubkey, res.status, text);
        return;
      }
      await this.fetchPlan();
      log('unregistered agent %s', agentPubkey);
    } catch (err) {
      log('failed to unregister agent (will retry on next sync): %O', err);
    }
  }

  async unregisterApp(appId: string): Promise<void> {
    if (!this.hasToken()) return;
    try {
      const res = await this.apiCall('DELETE', `/api/apps?pubkey=${encodeURIComponent(appId)}`);
      if (!res.ok && res.status !== 404) {
        const text = await res.text();
        log('failed to unregister app %s: %d %s', appId, res.status, text);
        return;
      }
      await this.fetchPlan();
      log('unregistered app %s', appId);
    } catch (err) {
      log('failed to unregister app (will retry on next sync): %O', err);
    }
  }

  // --- Internal ---

  private async apiCall(method: string, path: string, body?: unknown): Promise<Response> {
    const token = this.getToken();
    if (!token) throw new Error('Not signed in');

    const res = await fetch(`${BILLING_API_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      log('API returned 401, clearing auth');
      this.clearAuth();
      this.sse.broadcast('billing_updated', {});
      throw new Error('Session expired. Please sign in again.');
    }

    return res;
  }
}
