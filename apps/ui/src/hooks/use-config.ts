import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function useConfig() {
  return useQuery({
    queryKey: qk.config(),
    queryFn: api.getConfig,
  });
}

export function useStatus() {
  return useQuery({
    queryKey: qk.status(),
    queryFn: api.getStatus,
    refetchInterval: 30000,
  });
}

export function useSaveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Record<string, string>) => api.saveConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.config() });
    },
  });
}
