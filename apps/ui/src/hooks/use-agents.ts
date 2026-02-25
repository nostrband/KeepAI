import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function useAgents() {
  return useQuery({
    queryKey: qk.agents(),
    queryFn: api.listAgents,
  });
}

export function useAgent(agentId: string) {
  return useQuery({
    queryKey: qk.agent(agentId),
    queryFn: () => api.getAgent(agentId),
    enabled: !!agentId,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createAgent(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
    },
  });
}

export function useRevokeAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => api.revokeAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
    },
  });
}
