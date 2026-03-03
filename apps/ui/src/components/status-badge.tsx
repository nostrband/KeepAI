import { cn } from '../lib/cn';

interface StatusBadgeProps {
  status: 'connected' | 'error' | 'online' | 'offline' | 'pending' | 'active' | 'paused' | 'revoked';
  className?: string;
}

const statusConfig: Record<string, { label: string; dotClass: string; textClass: string }> = {
  connected: { label: 'Connected', dotClass: 'bg-green-500', textClass: 'text-green-700' },
  online: { label: 'Online', dotClass: 'bg-green-500', textClass: 'text-green-700' },
  active: { label: 'Active', dotClass: 'bg-green-500', textClass: 'text-green-700' },
  paused: { label: 'Paused', dotClass: 'bg-yellow-500', textClass: 'text-yellow-700' },
  pending: { label: 'Pending', dotClass: 'bg-yellow-500', textClass: 'text-yellow-700' },
  offline: { label: 'Offline', dotClass: 'bg-gray-400', textClass: 'text-gray-500' },
  error: { label: 'Error', dotClass: 'bg-red-500', textClass: 'text-red-700' },
  revoked: { label: 'Revoked', dotClass: 'bg-red-500', textClass: 'text-red-700' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.offline;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', config.textClass, className)}>
      <span className={cn('w-2 h-2 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  );
}
