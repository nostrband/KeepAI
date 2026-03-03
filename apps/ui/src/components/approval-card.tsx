import { useState } from 'react';
import { ServiceIcon, serviceName } from './service-icon';
import { Clock, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';

interface ApprovalCardProps {
  item: {
    id: string;
    agentName?: string;
    service: string;
    method: string;
    accountId?: string;
    description?: string;
    createdAt: number;
  };
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isApproving?: boolean;
  isDenying?: boolean;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ApprovalCard({ item, onApprove, onDeny, isApproving, isDenying }: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [paramsData, setParamsData] = useState<{ params: string; truncated: number | null } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!paramsData) {
      setLoading(true);
      try {
        const data = await api.getRequestParams(item.id);
        setParamsData(data);
      } catch {
        setParamsData({ params: 'Failed to load request params', truncated: null });
      } finally {
        setLoading(false);
      }
    }
  };

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
            {item.agentName && <span>Agent: {item.agentName}</span>}
            {item.accountId && <span>Account: {item.accountId}</span>}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(item.createdAt)}
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
            Allow
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
      <div className="mt-2 pt-2 border-t border-border/50">
        <button
          onClick={handleToggle}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Request details
        </button>
        {expanded && (
          <pre className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
            {loading
              ? 'Loading...'
              : paramsData
                ? <>
                    {paramsData.params}
                    {paramsData.truncated && (
                      <span className="text-muted-foreground italic">
                        {'\n'}...({paramsData.truncated.toLocaleString()} chars more)
                      </span>
                    )}
                  </>
                : 'null'}
          </pre>
        )}
      </div>
    </div>
  );
}
