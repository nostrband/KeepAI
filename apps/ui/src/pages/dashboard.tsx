import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Bot, Plus, ShieldCheck, Loader2 } from 'lucide-react';
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

function WelcomeScreen({
  onConnectApp,
  onAddAgent,
}: {
  onConnectApp: () => void;
  onAddAgent: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
      {/* Background shield watermark */}
      <svg
        className="absolute pointer-events-none select-none opacity-[0.04]"
        style={{ width: '420px', height: '420px' }}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          className="text-primary"
          fill="currentColor"
        />
      </svg>

      <div className="relative z-10 text-center max-w-md mx-auto px-4">
        <h1 className="text-2xl font-bold tracking-tight mb-3">
          Welcome to KeepAI
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Give AI agents controlled access to your Gmail and other
          services&nbsp;&mdash; without sharing your passwords, tokens, or
          content with anyone. Your credentials never leave your device.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          To get started, connect your apps and pair your agents.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onAddAgent}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover transition-colors"
          >
            <Bot className="w-4 h-4" />
            Add agent
          </button>
          <button
            onClick={onConnectApp}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent transition-colors"
          >
            <Plug className="w-4 h-4" />
            Add app
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: queue } = useQueue();
  const approveMutation = useApproveRequest();
  const denyMutation = useDenyRequest();
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);

  const pendingApprovals = queue ?? [];
  const isLoading = connectionsLoading || agentsLoading;
  const isEmpty =
    !isLoading &&
    (!connections || connections.length === 0) &&
    (!agents || agents.length === 0) &&
    pendingApprovals.length === 0;

  const content = isLoading ? (
    <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
      <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
    </div>
  ) : isEmpty ? (
    <WelcomeScreen
      onConnectApp={() => setShowConnectDialog(true)}
      onAddAgent={() => setShowAgentDialog(true)}
    />
  ) : (
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
            description="Connect your apps to get started."
            action={
              <button
                onClick={() => setShowConnectDialog(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
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
                to={`/apps/${conn.service}/${encodeURIComponent(conn.accountId)}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-[#D1CBC4] transition-all"
              >
                <ServiceIcon service={conn.service} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{conn.accountId}</div>
                  <div className="text-xs text-muted-foreground">{serviceName(conn.service)}</div>
                </div>
                <StatusBadge status={conn.status === 'connected' ? 'active' : conn.status === 'paused' ? 'paused' : 'error'} />
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
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
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
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-[#D1CBC4] transition-all"
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
                <StatusBadge status={agent.status === 'revoked' ? 'revoked' : agent.status === 'paused' ? 'paused' : 'active'} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <>
      {content}
      <ConnectAppDialog open={showConnectDialog} onClose={() => setShowConnectDialog(false)} />
      <AddAgentDialog open={showAgentDialog} onClose={() => setShowAgentDialog(false)} />
    </>
  );
}
