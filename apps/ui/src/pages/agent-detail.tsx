import { useParams, Link, useNavigate } from 'react-router-dom';
import { Bot, Shield, Trash2, ArrowLeft } from 'lucide-react';
import { useAgent, useRevokeAgent } from '../hooks/use-agents';
import { usePolicies } from '../hooks/use-policies';
import { StatusBadge } from '../components/status-badge';
import { ServiceIcon, serviceName } from '../components/service-icon';

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading } = useAgent(agentId!);
  const { data: policies } = usePolicies(agentId!);
  const revokeMutation = useRevokeAgent();

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (!agent) return <div className="text-sm text-muted-foreground">Agent not found.</div>;

  const handleRevoke = async () => {
    if (!confirm(`Revoke agent "${agent.name}"? This cannot be undone.`)) return;
    await revokeMutation.mutateAsync(agentId!);
    navigate('/agents');
  };

  const policyServices = policies ? Object.keys(policies) : [];

  return (
    <div>
      <Link to="/agents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to agents
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
            {(agent.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.name || 'Unnamed'}</h1>
            <StatusBadge status={agent.status === 'revoked' ? 'revoked' : 'active'} />
          </div>
        </div>
        {agent.status !== 'revoked' && (
          <button
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-destructive border border-destructive/30 hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Revoke
          </button>
        )}
      </div>

      {/* Agent Info */}
      <div className="border border-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Agent ID</dt>
          <dd className="font-mono text-xs">{agent.id}</dd>
          <dt className="text-muted-foreground">Public Key</dt>
          <dd className="font-mono text-xs truncate">{agent.agent_pubkey}</dd>
          <dt className="text-muted-foreground">Paired</dt>
          <dd>{new Date(agent.created_at).toLocaleString()}</dd>
          <dt className="text-muted-foreground">Last Seen</dt>
          <dd>{agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString() : 'Never'}</dd>
        </dl>
      </div>

      {/* Policies */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            Policies
          </h2>
          <Link
            to={`/agents/${agentId}/policies`}
            className="text-sm text-primary hover:underline"
          >
            Edit policies
          </Link>
        </div>
        {policyServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No policies configured.</p>
        ) : (
          <div className="space-y-2">
            {policyServices.map((svc) => {
              const policy = policies![svc];
              return (
                <div key={svc} className="flex items-center gap-2 p-2 rounded-md bg-accent/30">
                  <ServiceIcon service={svc} className="w-4 h-4" />
                  <span className="text-sm font-medium">{serviceName(svc)}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    default: {policy?.default ?? 'ask'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
