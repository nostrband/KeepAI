import { useParams, Link, useNavigate } from 'react-router-dom';
import { Shield, Trash2, Activity, Pause, Play } from 'lucide-react';
import { useAgent, useRevokeAgent, usePauseAgent, useUnpauseAgent } from '../hooks/use-agents';
import { usePolicies } from '../hooks/use-policies';
import { useConnections } from '../hooks/use-connections';
import { useLogs } from '../hooks/use-logs';
import { StatusBadge } from '../components/status-badge';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { PageTitle } from '../components/page-title';

function summarizePolicy(policy: any): string {
  const actions: Record<string, string> = { read: 'ask', write: 'ask', delete: 'ask' };
  for (const rule of policy?.rules ?? []) {
    for (const op of rule.operations ?? []) {
      actions[op] = rule.action;
    }
  }
  const grouped = new Map<string, string[]>();
  for (const [op, action] of Object.entries(actions)) {
    if (!grouped.has(action)) grouped.set(action, []);
    grouped.get(action)!.push(op);
  }
  return Array.from(grouped.entries())
    .map(([action, ops]) => `${action[0].toUpperCase() + action.slice(1)}: ${ops.join(', ')}`)
    .join(' · ');
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading } = useAgent(agentId!);
  const { data: policies } = usePolicies(agentId!);
  const { data: connections } = useConnections();
  const agentName = agent?.name;
  const { data: logsData } = useLogs(
    agentName ? { agent: agentName, limit: '10' } : undefined,
    { enabled: !!agentName }
  );
  const revokeMutation = useRevokeAgent();
  const pauseMutation = usePauseAgent();
  const unpauseMutation = useUnpauseAgent();

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (!agent) return <div className="text-sm text-muted-foreground">Agent not found.</div>;

  const handleRevoke = async () => {
    if (!confirm(`Disconnect agent "${agent.name}"? This cannot be undone.`)) return;
    try {
      await revokeMutation.mutateAsync(agentId!);
      navigate('/agents');
    } catch {
      // error toast shown by global mutation handler
    }
  };

  const handlePauseToggle = async () => {
    try {
      if (agent.status === 'paused') {
        await unpauseMutation.mutateAsync(agentId!);
      } else {
        await pauseMutation.mutateAsync(agentId!);
      }
    } catch {
      // error toast shown by global mutation handler
    }
  };

  const policyEntries = policies ?? [];
  const recentLogs = logsData?.entries ?? [];

  return (
    <div>
      <PageTitle>Agent: {agent.name || 'Unnamed'}</PageTitle>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
            {(agent.name || '?')[0].toUpperCase()}
          </div>
          <StatusBadge status={agent.status === 'revoked' ? 'revoked' : agent.status === 'paused' ? 'paused' : 'active'} />
        </div>
        {agent.status !== 'revoked' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseToggle}
              disabled={pauseMutation.isPending || unpauseMutation.isPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50 ${
                agent.status === 'paused'
                  ? 'text-green-700 border-green-300 hover:bg-green-50'
                  : 'text-yellow-700 border-yellow-300 hover:bg-yellow-50'
              }`}
            >
              {agent.status === 'paused' ? (
                <><Play className="w-4 h-4" /> Resume</>
              ) : (
                <><Pause className="w-4 h-4" /> Pause</>
              )}
            </button>
            <button
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-destructive border border-destructive/30 hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Agent Info */}
      <div className="border border-border rounded-xl p-4 bg-card shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Agent ID</dt>
          <dd className="font-mono text-xs">{agent.id}</dd>
          <dt className="text-muted-foreground">Public Key</dt>
          <dd className="font-mono text-xs truncate">{agent.agentPubkey}</dd>
          <dt className="text-muted-foreground">Paired</dt>
          <dd>{new Date(agent.pairedAt).toLocaleString()}</dd>
          <dt className="text-muted-foreground">Last Seen</dt>
          <dd>{agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString() : 'Never'}</dd>
        </dl>
      </div>

      {/* Policies */}
      <div className="border border-border rounded-xl p-4 bg-card shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            Permissions
          </h2>
        </div>
        {policyEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions configured.</p>
        ) : (
          <div className="space-y-2">
            {policyEntries.map((entry: any) => {
              const conn = connections?.find((c: any) => c.service === entry.service && c.accountId === entry.accountId);
              return (
                <div key={`${entry.service}:${entry.accountId}`} className="flex items-center gap-2 p-2 rounded-md bg-accent/30">
                  <ServiceIcon service={entry.service} className="w-4 h-4" />
                  {conn ? (
                    <Link to={`/apps/${conn.id}`} className="text-sm font-medium hover:underline">
                      {serviceName(entry.service)}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{serviceName(entry.service)}</span>
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.accountId}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {summarizePolicy(entry.policy)}
                  </span>
                  <Link
                    to={`/agents/${agentId}/policies`}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="border border-border rounded-xl p-4 bg-card shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            Recent Activity
          </h2>
          <Link
            to={`/logs?agent=${agentId}`}
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <div className="space-y-1">
            {recentLogs.map((entry: any) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 p-2 text-sm rounded-md hover:bg-accent/20"
              >
                <ServiceIcon service={entry.service} className="w-4 h-4 shrink-0" />
                <span className="text-xs">{serviceName(entry.service)}</span>
                {entry.accountId && (
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">{entry.accountId}</span>
                )}
                <span className="font-mono text-xs">{entry.method}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    entry.responseStatus === 'success'
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-red-500/10 text-red-600'
                  }`}
                >
                  {entry.responseStatus}
                </span>
                {entry.durationMs != null && (
                  <span className="text-xs text-muted-foreground">{entry.durationMs}ms</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
