import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Bot, Plus, ShieldCheck } from 'lucide-react';
import { useConnections } from '../hooks/use-connections';
import { useAgents } from '../hooks/use-agents';
import { useQueue } from '../hooks/use-queue';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { StatusBadge } from '../components/status-badge';
import { ApprovalCard } from '../components/approval-card';
import { EmptyState } from '../components/empty-state';
import { ConnectAppDialog } from '../components/connect-app-dialog';
import { AddAgentDialog } from '../components/add-agent-dialog';
import { useApproveRequest, useDenyRequest } from '../hooks/use-queue';

export function DashboardPage() {
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: queue } = useQueue();
  const approveMutation = useApproveRequest();
  const denyMutation = useDenyRequest();
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);

  const pendingApprovals = queue ?? [];

  return (
    <div className="space-y-8">
      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Pending Approvals
            </h2>
            <Link to="/approvals" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {pendingApprovals.slice(0, 3).map((item: any) => (
              <ApprovalCard
                key={item.id}
                item={item}
                onApprove={(id) => approveMutation.mutate(id)}
                onDeny={(id) => denyMutation.mutate(id)}
              />
            ))}
            {pendingApprovals.length > 3 && (
              <Link to="/approvals" className="block text-sm text-primary hover:underline text-center py-2">
                +{pendingApprovals.length - 3} more
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Apps */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plug className="w-5 h-5" />
            Apps
          </h2>
          <button
            onClick={() => setShowConnectDialog(true)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        {connectionsLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : !connections || connections.length === 0 ? (
          <EmptyState
            title="No apps connected"
            description="Connect Gmail or Notion to get started."
            action={
              <button
                onClick={() => setShowConnectDialog(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Connect an app
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {connections.map((conn: any) => (
              <Link
                key={`${conn.service}:${conn.accountId}`}
                to="/apps"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <ServiceIcon service={conn.service} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{conn.accountId}</div>
                  <div className="text-xs text-muted-foreground">{serviceName(conn.service)}</div>
                </div>
                <StatusBadge status={conn.status === 'connected' ? 'active' : 'error'} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Agents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Agents
          </h2>
          <button
            onClick={() => setShowAgentDialog(true)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        {agentsLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : !agents || agents.length === 0 ? (
          <EmptyState
            title="No agents paired"
            description="Pair an AI agent to allow it to access your apps."
            action={
              <button
                onClick={() => setShowAgentDialog(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Add an agent
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {agents.map((agent: any) => (
              <Link
                key={agent.id}
                to={`/agents/${agent.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  {(agent.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{agent.name || 'Unnamed'}</div>
                  <div className="text-xs text-muted-foreground">
                    {agent.lastSeenAt ? `Last seen ${new Date(agent.lastSeenAt).toLocaleString()}` : 'Never connected'}
                  </div>
                </div>
                <StatusBadge status={agent.status === 'revoked' ? 'revoked' : 'active'} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <ConnectAppDialog open={showConnectDialog} onClose={() => setShowConnectDialog(false)} />
      <AddAgentDialog open={showAgentDialog} onClose={() => setShowAgentDialog(false)} />
    </div>
  );
}
