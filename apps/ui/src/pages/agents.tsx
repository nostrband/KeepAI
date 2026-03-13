import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus } from 'lucide-react';
import { useAgents } from '../hooks/use-agents';
import { useBilling } from '../hooks/use-billing';
import { StatusBadge } from '../components/status-badge';
import { EmptyState } from '../components/empty-state';
import { PageTitle } from '../components/page-title';
import { AddAgentDialog } from '../components/add-agent-dialog';
import { UpgradeDialog } from '../components/upgrade-dialog';

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const { data: billing } = useBilling();
  const [showDialog, setShowDialog] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleAddAgent = () => {
    if (billing) {
      const activeCount = (agents ?? []).filter(
        (a: any) => a.status !== 'revoked'
      ).length;
      if (activeCount >= billing.plan.max_agents) {
        setShowUpgrade(true);
        return;
      }
    }
    setShowDialog(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageTitle>Agents</PageTitle>
        <button
          onClick={handleAddAgent}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
        >
          <Plus className="w-4 h-4" />
          Add agent
        </button>
      </div>

      <AddAgentDialog open={showDialog} onClose={() => setShowDialog(false)} />
      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} resourceType="agents" />

      {/* Agent List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading agents...</div>
      ) : !agents || agents.length === 0 ? (
        <EmptyState
          icon={<Bot className="w-12 h-12" />}
          title="No agents paired"
          description="Pair an AI agent to allow it to access your connected apps securely."
          action={
            <button
              onClick={handleAddAgent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
            >
              <Plus className="w-4 h-4" />
              Add an agent
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {agents.map((agent: any) => (
            <Link
              key={agent.id}
              to={`/agents/${agent.id}`}
              className="flex items-center gap-3 p-4 border border-border rounded-xl bg-card shadow-sm hover:shadow-md hover:border-[#D1CBC4] transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {(agent.name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{agent.name || 'Unnamed'}</div>
                <div className="text-sm text-muted-foreground">
                  Paired {new Date(agent.pairedAt).toLocaleDateString()}
                  {agent.lastSeenAt && ` — last seen ${new Date(agent.lastSeenAt).toLocaleString()}`}
                </div>
              </div>
              <StatusBadge status={agent.status === 'revoked' ? 'revoked' : agent.status === 'paused' ? 'paused' : 'active'} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
