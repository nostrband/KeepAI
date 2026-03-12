import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePostHog } from '@posthog/react';
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
  const posthog = usePostHog();
  return useMutation({
    mutationFn: (service: string) => api.connectService(service),
    onSuccess: (_data, service) => {
      posthog?.capture('app_connect_started', { service });
    },
  });
}

export function useDisconnectService() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: ({ connectionId, service }: { connectionId: string; service: string }) =>
      api.disconnectService(connectionId),
    onSuccess: (_data, { service }) => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
      toast.success('Service disconnected');
      posthog?.capture('app_disconnected', { service });
    },
  });
}

export function useConnection(connectionId: string) {
  const { data: connections, ...rest } = useConnections();
  const connection = connections?.find(
    (c: any) => c.id === connectionId
  );
  return { data: connection, ...rest };
}

export function usePauseConnection() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: ({ connectionId }: { connectionId: string; service: string }) =>
      api.pauseConnection(connectionId),
    onSuccess: (_data, { service }) => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
      toast.success('App paused');
      posthog?.capture('app_paused', { service });
    },
  });
}

export function useUnpauseConnection() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  return useMutation({
    mutationFn: ({ connectionId }: { connectionId: string; service: string }) =>
      api.unpauseConnection(connectionId),
    onSuccess: (_data, { service }) => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
      toast.success('App resumed');
      posthog?.capture('app_resumed', { service });
    },
  });
}

export function useCheckConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId }: { connectionId: string }) =>
      api.checkConnection(connectionId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Connection is working');
      } else if (data.errorType === 'network') {
        toast.warning(data.error || 'Network error');
      } else {
        toast.error(data.error || 'Authentication error');
      }
      // Invalidate to pick up any status changes (error ↔ connected)
      queryClient.invalidateQueries({ queryKey: qk.connections() });
    },
  });
}
