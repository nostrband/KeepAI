import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePostHog } from '@posthog/react';
import { toast } from 'sonner';
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
    retry: false,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: (name: string) => api.createAgent(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
      posthog?.capture('agent_created');
    },
  });
}

export function useCancelPairing() {
  return useMutation({
    mutationFn: (pairingId: string) => api.cancelPairing(pairingId),
  });
}

export function usePauseAgent() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: (agentId: string) => api.pauseAgent(agentId),
    onSuccess: (_data, agentId) => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
      queryClient.invalidateQueries({ queryKey: qk.agent(agentId) });
      toast.success('Agent paused');
      posthog?.capture('agent_paused');
    },
  });
}

export function useUnpauseAgent() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: (agentId: string) => api.unpauseAgent(agentId),
    onSuccess: (_data, agentId) => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
      queryClient.invalidateQueries({ queryKey: qk.agent(agentId) });
      toast.success('Agent resumed');
      posthog?.capture('agent_resumed');
    },
  });
}

export function useRevokeAgent() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: (agentId: string) => api.revokeAgent(agentId),
    onSuccess: (_data, agentId) => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
      queryClient.invalidateQueries({ queryKey: qk.agent(agentId) });
      toast.success('Agent revoked');
      posthog?.capture('agent_revoked');
    },
  });
}
