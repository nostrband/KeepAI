import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

export interface BillingPlan {
  plan_id: string | null;
  plan_name: string;
  status: string | null;
  max_agents: number;
  max_apps: number;
  billing_interval?: string | null;
  period_end?: string | null;
  grace_period_end?: string | null;
}

export interface BillingStatus {
  authenticated: boolean;
  user: { id: string; email: string; display_name: string | null } | null;
  plan: BillingPlan;
  usage: { agents: number; apps: number };
}

export function useBilling() {
  return useQuery<BillingStatus>({
    queryKey: qk.billing(),
    queryFn: api.getBillingStatus,
    refetchOnWindowFocus: true,
  });
}
