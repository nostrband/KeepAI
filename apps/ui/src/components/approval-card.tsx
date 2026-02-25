import { useState } from 'react';
import { ServiceIcon, serviceName } from './service-icon';
import { Clock, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface ApprovalCardProps {
  item: {
    id: string;
    agent_name?: string;
    service: string;
    method: string;
    account_id?: string;
    description?: string;
    created_at: string;
    params?: Record<string, unknown>;
  };
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isApproving?: boolean;
  isDenying?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ApprovalCard({ item, onApprove, onDeny, isApproving, isDenying }: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasParams = item.params && Object.keys(item.params).length > 0;

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ServiceIcon service={item.service} className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm truncate">
              {serviceName(item.service)} — {item.method}
            </span>
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground mb-1">{item.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.agent_name && <span>Agent: {item.agent_name}</span>}
            {item.account_id && <span>Account: {item.account_id}</span>}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onApprove(item.id)}
            disabled={isApproving || isDenying}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={() => onDeny(item.id)}
            disabled={isApproving || isDenying}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Deny
          </button>
        </div>
      </div>

      {/* Expandable request details */}
      {hasParams && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Request details
          </button>
          {expanded && (
            <pre className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(item.params, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
