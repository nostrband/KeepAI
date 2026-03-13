import { useParams, Link, useNavigate } from 'react-router-dom';
import { Shield, Trash2, Activity, RefreshCw, Bot, Pause, Play } from 'lucide-react';
import { useConnection, useDisconnectService, useCheckConnection, usePauseConnection, useUnpauseConnection } from '../hooks/use-connections';
import { useAgents } from '../hooks/use-agents';
import { useConnectionPolicies } from '../hooks/use-policies';
import { useLogs } from '../hooks/use-logs';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { StatusBadge } from '../components/status-badge';
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

export function AppDetailPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { data: connection, isLoading } = useConnection(connectionId!);
  const { data: agents } = useAgents();
  const { data: connectionPolicies } = useConnectionPolicies(connectionId!);
  const { data: logsData } = useLogs(
    connection ? { service: connection.service, limit: '10' } : undefined,
    { enabled: !!connection }
  );
  const disconnectMutation = useDisconnectService();
  const checkMutation = useCheckConnection();
  const pauseMutation = usePauseConnection();
  const unpauseMutation = useUnpauseConnection();

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (!connection) return <div className="text-sm text-muted-foreground">App not found.</div>;

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${connection.accountId}?`)) return;
    try {
      await disconnectMutation.mutateAsync({ connectionId: connectionId!, service: connection.service });
      navigate('/apps');
    } catch {
      // error toast shown by global handler
    }
  };

  const handlePauseToggle = async () => {
    try {
      if (connection.status === 'paused') {
        await unpauseMutation.mutateAsync({ connectionId: connectionId!, service: connection.service });
      } else {
        await pauseMutation.mutateAsync({ connectionId: connectionId!, service: connection.service });
      }
    } catch {
      // error toast shown by global handler
    }
  };

  const activeAgents = agents?.filter((a: any) => a.status !== 'revoked') ?? [];
  const recentLogs = logsData?.entries ?? [];

  // Build a map of agentId → policy entry for quick lookup
  const policyByAgent = new Map<string, any>();
  for (const entry of connectionPolicies ?? []) {
    policyByAgent.set(entry.agentId, entry);
  }

  return (
    <div>
      <PageTitle>App: {serviceName(connection.service)}</PageTitle>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <ServiceIcon service={connection.service} className="w-12 h-12" />
          <div>
            <div className="font-medium">{connection.accountId}</div>
            <StatusBadge status={connection.status === 'connected' && connection.offline ? 'offline' : connection.status === 'connected' ? 'active' : connection.status === 'paused' ? 'paused' : 'error'} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(connection.status === 'connected' || connection.status === 'paused') && (
            <button
              onClick={handlePauseToggle}
              disabled={pauseMutation.isPending || unpauseMutation.isPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50 ${
                connection.status === 'paused'
                  ? 'text-green-700 border-green-300 hover:bg-green-50'
                  : 'text-yellow-700 border-yellow-300 hover:bg-yellow-50'
              }`}
            >
              {connection.status === 'paused' ? (
                <><Play className="w-4 h-4" /> Resume</>
              ) : (
                <><Pause className="w-4 h-4" /> Pause</>
              )}
            </button>
          )}
          {connection.status !== 'paused' && (
            <button
              onClick={() => checkMutation.mutate({ connectionId: connectionId! })}
              disabled={checkMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
              Test connection
            </button>
          )}
          <button
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-destructive border border-destructive/30 hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </div>

      {connection.offline && connection.offlineError && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm">
          Temporarily unreachable: {connection.offlineError}
        </div>
      )}

      {/* Connection Info */}
      <div className="border border-border rounded-xl p-4 bg-card shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">App ID</dt>
          <dd className="font-mono text-xs">{connectionId}</dd>
          <dt className="text-muted-foreground">Service</dt>
          <dd>{serviceName(connection.service)}</dd>
          <dt className="text-muted-foreground">Account</dt>
          <dd className="font-mono text-xs">{connection.accountId}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{connection.status}</dd>
          <dt className="text-muted-foreground">Connected</dt>
          <dd>{connection.createdAt ? new Date(connection.createdAt).toLocaleString() : '—'}</dd>
          <dt className="text-muted-foreground">Last Used</dt>
          <dd>{connection.lastUsedAt ? new Date(connection.lastUsedAt).toLocaleString() : 'Never'}</dd>
        </dl>
      </div>

      {/* Agent Policies */}
      <div className="border border-border rounded-xl p-4 bg-card shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            Agent Permissions
          </h2>
        </div>
        {activeAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents paired.</p>
        ) : (
          <div className="space-y-2">
            {activeAgents.map((agent: any) => {
              const entry = policyByAgent.get(agent.id);
              return (
                <div key={agent.id} className="flex items-center gap-2 p-2 rounded-md bg-accent/30">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {(agent.name || '?')[0].toUpperCase()}
                  </div>
                  <Link to={`/agents/${agent.id}`} className="text-sm font-medium hover:underline">
                    {agent.name || 'Unnamed'}
                  </Link>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {entry ? summarizePolicy(entry.policy) : 'no permissions'}
                  </span>
                  <Link
                    to={`/agents/${agent.id}/policies`}
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
            to={`/logs?service=${connection.service}`}
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
                <Bot className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-xs">{entry.agentName || entry.agent || '—'}</span>
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
