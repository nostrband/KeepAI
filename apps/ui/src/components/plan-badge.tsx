import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, ChevronDown, LogOut, Loader2 } from 'lucide-react';
import { useBilling } from '../hooks/use-billing';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';

interface PlanBadgeProps {
  onUpgrade: () => void;
}

export function PlanBadge({ onUpgrade }: PlanBadgeProps) {
  const { data: billing } = useBilling();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const signOutMutation = useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.billing() });
    },
  });

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!billing) return null;

  const { plan, usage, authenticated, user } = billing;
  const isPastDue = plan.status === 'past_due';
  const isFree = !plan.plan_id;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase border transition-colors ${
          isPastDue
            ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
            : isFree
            ? 'bg-muted text-muted-foreground border-border hover:bg-accent'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
        }`}
      >
        {isPastDue && <AlertTriangle className="w-3 h-3" />}
        {plan.plan_name}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
          <div className="mb-3">
            <div className="flex items-center gap-2">
              {isPastDue && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              <span className="font-semibold text-sm">{plan.plan_name} Plan</span>
            </div>
            {isPastDue && (
              <p className="text-xs text-amber-600 mt-1">Payment issue</p>
            )}
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agents</span>
              <span className="font-medium">{usage.agents} / {plan.max_agents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Apps</span>
              <span className="font-medium">{usage.apps} / {plan.max_apps}</span>
            </div>
          </div>

          <button
            onClick={() => { setOpen(false); onUpgrade(); }}
            className="w-full mt-3 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
          >
            {isPastDue ? 'Update payment' : 'Upgrade'}
          </button>

          <div className="mt-3 pt-3 border-t border-border">
            {authenticated && user ? (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-xs font-medium truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => signOutMutation.mutate()}
                  disabled={signOutMutation.isPending}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
                  title="Sign out"
                >
                  {signOutMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setOpen(false); onUpgrade(); }}
                className="w-full px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-accent"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
