import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function useQueue() {
  const query = useQuery({
    queryKey: qk.queue(),
    queryFn: api.listQueue,
    refetchInterval: 5000,
  });

  // Update Electron tray badge when pending count changes
  const prevCountRef = useRef<number | undefined>(undefined);
  const data = query.data;
  useEffect(() => {
    const count = Array.isArray(data) ? data.length : 0;
    if (prevCountRef.current !== count) {
      prevCountRef.current = count;
      (window as any).electronAPI?.updateTrayBadge?.(count);
    }
  }, [data]);

  return query;
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
