import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function usePolicies(agentId: string) {
  return useQuery({
    queryKey: qk.policies(agentId),
    queryFn: () => api.listPolicies(agentId),
    enabled: !!agentId,
  });
}

export function usePolicy(agentId: string, service: string) {
  return useQuery({
    queryKey: qk.policy(agentId, service),
    queryFn: () => api.getPolicy(agentId, service),
    enabled: !!agentId && !!service,
  });
}

export function useSavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, service, policy }: { agentId: string; service: string; policy: any }) =>
      api.savePolicy(agentId, service, policy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.policies(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: qk.policy(variables.agentId, variables.service) });
    },
  });
}
