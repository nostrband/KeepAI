import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function useConnections() {
  return useQuery({
    queryKey: qk.connections(),
    queryFn: api.listConnections,
  });
}

export function useServices() {
  return useQuery({
    queryKey: qk.services(),
    queryFn: api.listServices,
  });
}

export function useConnectService() {
  return useMutation({
    mutationFn: (service: string) => api.connectService(service),
  });
}

export function useDisconnectService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ service, accountId }: { service: string; accountId: string }) =>
      api.disconnectService(service, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
      toast.success('Service disconnected');
    },
  });
}

export function useCheckConnection() {
  return useMutation({
    mutationFn: ({ service, accountId }: { service: string; accountId: string }) =>
      api.checkConnection(service, accountId),
  });
}
