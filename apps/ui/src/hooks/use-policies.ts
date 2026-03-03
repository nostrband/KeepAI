import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function usePolicies(agentId: string) {
  return useQuery({
    queryKey: qk.policies(agentId),
    queryFn: () => api.listPolicies(agentId),
    enabled: !!agentId,
  });
}

export function usePolicy(agentId: string, service: string, accountId: string) {
  return useQuery({
    queryKey: qk.policy(agentId, service, accountId),
    queryFn: () => api.getPolicy(agentId, service, accountId),
    enabled: !!agentId && !!service && !!accountId,
  });
}

export function useConnectionPolicies(service: string, accountId: string) {
  return useQuery({
    queryKey: qk.connectionPolicies(service, accountId),
    queryFn: () => api.listConnectionPolicies(service, accountId),
    enabled: !!service && !!accountId,
  });
}

export function useSavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, service, accountId, policy }: { agentId: string; service: string; accountId: string; policy: any }) =>
      api.savePolicy(agentId, service, accountId, policy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.policies(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: qk.policy(variables.agentId, variables.service, variables.accountId) });
      queryClient.invalidateQueries({ queryKey: qk.connectionPolicies(variables.service, variables.accountId) });
      toast.success('Permissions saved');
    },
  });
}
