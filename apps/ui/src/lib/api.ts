/**
 * API client for keepd HTTP API.
 *
 * In development, Vite proxies /api to localhost:DEFAULT_PORT.
 * In production (both frontend and electron), the UI is served by keepd
 * on the same origin, so relative URLs work.
 */

const BASE = '/api';

let _tokenPromise: Promise<string> | null = null;

export function getAccessToken(): Promise<string> {
  if (!_tokenPromise) {
    const electronAPI = (window as any).electronAPI;
    _tokenPromise = electronAPI?.getAccessToken?.() ?? Promise.resolve('');
  }
  return _tokenPromise;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
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
    request<{ connections: any[] }>('/connections').then((r) => r.connections),

  listServices: () =>
    request<{ services: any[] }>('/connections/services').then((r) => r.services),

  connectService: (service: string) =>
    request<{ authUrl: string }>(`/connections/${service}/connect`, { method: 'POST' }),

  connectManualToken: (service: string, credentials: Record<string, string>) =>
    request<{ connection: any }>('/connections/manual-token', {
      method: 'POST',
      body: JSON.stringify({ service, credentials }),
    }),

  disconnectService: (connectionId: string) =>
    request<void>(`/connections/${connectionId}`, { method: 'DELETE' }),

  pauseConnection: (connectionId: string) =>
    request<void>(`/connections/${connectionId}/pause`, { method: 'POST' }),

  unpauseConnection: (connectionId: string) =>
    request<void>(`/connections/${connectionId}/unpause`, { method: 'POST' }),

  checkConnection: (connectionId: string) =>
    request<{ success: boolean; error?: string; errorType?: 'auth' | 'network' }>(`/connections/${connectionId}/check`, { method: 'POST' }),

  // Agents
  listAgents: () =>
    request<{ agents: any[] }>('/agents').then((r) => r.agents),

  getAgent: (agentId: string) =>
    request<any>(`/agents/${agentId}`),

  createAgent: (name: string, type: string = '') =>
    request<{ code: string; id: string }>(`/agents/new?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, { method: 'POST' }),

  renameAgent: (agentId: string, name: string) =>
    request<void>(`/agents/${agentId}/name`, { method: 'PUT', body: JSON.stringify({ name }) }),

  revokeAgent: (agentId: string) =>
    request<void>(`/agents/${agentId}`, { method: 'DELETE' }),

  pauseAgent: (agentId: string) =>
    request<void>(`/agents/${agentId}/pause`, { method: 'POST' }),

  unpauseAgent: (agentId: string) =>
    request<void>(`/agents/${agentId}/unpause`, { method: 'POST' }),

  cancelPairing: (pairingId: string) =>
    request<void>(`/agents/pairings/${pairingId}`, { method: 'DELETE' }),

  // Policies
  listPolicies: (agentId: string) =>
    request<{ policies: any[] }>(`/agents/${agentId}/policies`).then((r) => r.policies),

  getPolicy: (agentId: string, connectionId: string) =>
    request<{ policy: any }>(`/agents/${agentId}/policies/${connectionId}`).then((r) => r.policy),

  savePolicy: (agentId: string, connectionId: string, policy: any) =>
    request<void>(`/agents/${agentId}/policies/${connectionId}`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    }),

  listConnectionPolicies: (connectionId: string) =>
    request<{ policies: any[] }>(`/connections/${connectionId}/policies`).then((r) => r.policies),

  // Approval Queue
  listQueue: () =>
    request<{ pending: any[] }>('/queue').then((r) => r.pending),

  getRequestParams: (id: string) =>
    request<{ params: string; truncated: number | null }>(`/queue/${id}/params`),

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

  // Billing
  getBillingStatus: () =>
    request<any>('/billing/status'),

  startSignIn: () =>
    request<{ user_code: string; device_code: string; expires_at: string }>('/billing/signin', { method: 'POST' }),

  pollSignIn: (device_code: string) =>
    request<{ status: string; api_token?: string; user?: any }>('/billing/signin/poll', {
      method: 'POST',
      body: JSON.stringify({ device_code }),
    }),

  signOut: () =>
    request<void>('/billing/signout', { method: 'POST' }),

  // Agent icons
  getAgentIconUrl: (agentId: string) =>
    `${BASE}/agents/${agentId}/icon`,

  uploadAgentIcon: async (agentId: string, file: File) => {
    const token = await getAccessToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/agents/${agentId}/icon`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `Upload failed (${res.status})`);
    }
  },

  refreshAgentIcon: (agentId: string) =>
    request<{ success: boolean; error?: string }>(`/agents/${agentId}/icon/refresh`, { method: 'POST' }),
};
