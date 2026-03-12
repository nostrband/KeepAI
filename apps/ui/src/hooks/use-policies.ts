import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePostHog } from '@posthog/react';
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

export function usePolicy(agentId: string, connectionId: string) {
  return useQuery({
    queryKey: qk.policy(agentId, connectionId),
    queryFn: () => api.getPolicy(agentId, connectionId),
    enabled: !!agentId && !!connectionId,
  });
}

export function useConnectionPolicies(connectionId: string) {
  return useQuery({
    queryKey: qk.connectionPolicies(connectionId),
    queryFn: () => api.listConnectionPolicies(connectionId),
    enabled: !!connectionId,
  });
}

export function useSavePolicy() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: ({ agentId, connectionId, policy }: { agentId: string; connectionId: string; policy: any }) =>
      api.savePolicy(agentId, connectionId, policy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.policies(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: qk.policy(variables.agentId, variables.connectionId) });
      queryClient.invalidateQueries({ queryKey: qk.connectionPolicies(variables.connectionId) });
      toast.success('Permissions saved');
      posthog?.capture('policy_saved');
    },
  });
}
