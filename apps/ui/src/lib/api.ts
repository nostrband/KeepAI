/**
 * API client for keepd HTTP API.
 *
 * In development, Vite proxies /api to http://localhost:9090.
 * In production (both frontend and electron), the UI is served by keepd
 * on the same origin, so relative URLs work.
 */

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message: string;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || text;
    } catch {
      message = text;
    }
    throw new Error(`API ${response.status}: ${message}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}

// --- Connections ---

export const api = {
  // Connections
  listConnections: () =>
    request<any[]>('/connections'),

  listServices: () =>
    request<any[]>('/connections/services'),

  connectService: (service: string) =>
    request<{ url: string }>(`/connections/${service}/connect`, { method: 'POST' }),

  disconnectService: (service: string, accountId: string) =>
    request<void>(`/connections/${service}/${encodeURIComponent(accountId)}`, { method: 'DELETE' }),

  checkConnection: (service: string, accountId: string) =>
    request<{ ok: boolean }>(`/connections/${service}/${encodeURIComponent(accountId)}/check`, { method: 'POST' }),

  // Agents
  listAgents: () =>
    request<any[]>('/agents'),

  getAgent: (agentId: string) =>
    request<any>(`/agents/${agentId}`),

  createAgent: (name: string) =>
    request<{ pairingCode: string; agentId: string }>(`/agents/new?name=${encodeURIComponent(name)}`, { method: 'POST' }),

  revokeAgent: (agentId: string) =>
    request<void>(`/agents/${agentId}`, { method: 'DELETE' }),

  // Policies
  listPolicies: (agentId: string) =>
    request<Record<string, any>>(`/agents/${agentId}/policies`),

  getPolicy: (agentId: string, service: string) =>
    request<any>(`/agents/${agentId}/policies/${service}`),

  savePolicy: (agentId: string, service: string, policy: any) =>
    request<void>(`/agents/${agentId}/policies/${service}`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    }),

  // Approval Queue
  listQueue: () =>
    request<any[]>('/queue'),

  approveRequest: (id: string) =>
    request<void>(`/queue/${id}/approve`, { method: 'POST' }),

  denyRequest: (id: string) =>
    request<void>(`/queue/${id}/deny`, { method: 'POST' }),

  // Logs
  listLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ entries: any[]; total: number }>(`/logs${qs}`);
  },

  // Config
  getConfig: () =>
    request<Record<string, string>>('/config'),

  saveConfig: (config: Record<string, string>) =>
    request<void>('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getStatus: () =>
    request<any>('/status'),
};
