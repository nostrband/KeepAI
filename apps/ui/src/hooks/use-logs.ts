import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export function useLogs(params?: Record<string, string>) {
  return useQuery({
    queryKey: qk.logs(params),
    queryFn: () => api.listLogs(params),
  });
}
