import { useState, useEffect, useReducer } from 'react';
import { ServiceIcon, serviceName } from './service-icon';
import { ArrowRight, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { AgentAvatar } from './agent-avatar';
import { ResolvableId } from './resolvable-id';
import { JsonViewer } from './json-viewer';
import { parseDescription } from '../lib/parse-description';
import { api } from '../lib/api';

interface ResolvableTypeInfo {
  label: string;
  params?: Record<string, string>;
}

interface ApprovalCardProps {
  item: {
    id: string;
    agentId?: string;
    agentName?: string;
    service: string;
    method: string;
    accountId?: string;
    description?: string;
    createdAt: number;
  };
  resolvableTypes?: Record<string, ResolvableTypeInfo>;
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

function ParsedDescription({
  description,
  service,
  accountId,
  resolvableTypes,
}: {
  description: string;
  service: string;
  accountId: string;
  resolvableTypes: Record<string, ResolvableTypeInfo>;
}) {
  const segments = parseDescription(description);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
        const typeInfo = resolvableTypes[seg.refType];
        if (!typeInfo) return <span key={i}>{seg.id}</span>;
        return (
          <ResolvableId
            key={i}
            type={seg.refType}
            id={seg.id}
            label={typeInfo.label}
            service={service}
            accountId={accountId}
          />
        );
      })}
    </>
  );
}

export function ApprovalCard({ item, resolvableTypes, onApprove, onDeny, isApproving, isDenying }: ApprovalCardProps) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(forceUpdate, 15_000);
    return () => clearInterval(id);
  }, []);
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

  const types = resolvableTypes ?? {};

  return (
    <div className="border border-border rounded-xl p-4 bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Row 1: Agent → Service (account) */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <AgentAvatar agentId={item.agentId ?? ''} name={item.agentName ?? '?'} size={16} />
            <span className="font-semibold text-sm">{item.agentName || 'Unknown agent'}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <ServiceIcon service={item.service} className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm">{serviceName(item.service)}</span>
            {item.accountId && (
              <span className="text-sm text-muted-foreground">({item.accountId})</span>
            )}
          </div>
          {/* Row 2: Human-readable description with resolvable IDs */}
          {item.description && (
            <p className="text-sm text-foreground mb-1">
              <ParsedDescription
                description={item.description}
                service={item.service}
                accountId={item.accountId ?? ''}
                resolvableTypes={types}
              />
            </p>
          )}
          {/* Row 3: Method + time + request details toggle in grey */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Method: {item.method}</span>
            <span>{timeAgo(item.createdAt)}</span>
            <button
              onClick={handleToggle}
              className="flex items-center gap-1 hover:text-foreground cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Request details
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onApprove(item.id)}
            disabled={isApproving || isDenying}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Allow
          </button>
          <button
            onClick={() => onDeny(item.id)}
            disabled={isApproving || isDenying}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Deny
          </button>
        </div>
      </div>

      {/* Expandable request details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-border/50">
          {loading
            ? <pre className="p-2 rounded bg-muted/50 text-xs font-mono">Loading...</pre>
            : paramsData
              ? (() => {
                  // Try to parse JSON for rich rendering with resolvable IDs
                  try {
                    const parsed = JSON.parse(paramsData.params);
                    return (
                      <JsonViewer
                        data={parsed}
                        service={item.service}
                        accountId={item.accountId ?? ''}
                        method={item.method}
                        resolvableTypes={types}
                        truncated={paramsData.truncated}
                      />
                    );
                  } catch {
                    // Fallback to raw text (e.g. truncated JSON that can't parse)
                    return (
                      <pre className="p-2 rounded bg-muted/50 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto scrollbar-thin">
                        {paramsData.params}
                        {paramsData.truncated != null && paramsData.truncated > 0 && (
                          <span className="text-muted-foreground italic">
                            {'\n'}...({paramsData.truncated.toLocaleString()} chars more)
                          </span>
                        )}
                      </pre>
                    );
                  }
                })()
              : <pre className="p-2 rounded bg-muted/50 text-xs font-mono">null</pre>
          }
        </div>
      )}
    </div>
  );
}
