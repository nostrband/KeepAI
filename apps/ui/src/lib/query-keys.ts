/**
 * TanStack Query key factory.
 */
export const qk = {
  connections: () => ['connections'] as const,
  services: () => ['services'] as const,
  agents: () => ['agents'] as const,
  agent: (id: string) => ['agent', id] as const,
  policies: (agentId: string) => ['policies', agentId] as const,
  policy: (agentId: string, service: string) => ['policy', agentId, service] as const,
  queue: () => ['queue'] as const,
  logs: (params?: Record<string, string>) => ['logs', params] as const,
  config: () => ['config'] as const,
  status: () => ['status'] as const,
};
