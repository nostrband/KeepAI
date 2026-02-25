import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function useQueue() {
  return useQuery({
    queryKey: qk.queue(),
    queryFn: api.listQueue,
    refetchInterval: 5000,
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
    },
  });
}

export function useDenyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.denyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
    },
  });
}
