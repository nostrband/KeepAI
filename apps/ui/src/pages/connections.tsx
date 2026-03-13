import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useConnections, useDisconnectService, useCheckConnection } from '../hooks/use-connections';
import { useBilling } from '../hooks/use-billing';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { StatusBadge } from '../components/status-badge';
import { EmptyState } from '../components/empty-state';
import { PageTitle } from '../components/page-title';
import { ConnectAppDialog } from '../components/connect-app-dialog';
import { UpgradeDialog } from '../components/upgrade-dialog';
import { AppActivityBadge } from '../components/app-activity-badge';
import { useOAuthFlow } from '../hooks/use-oauth-flow';
import { useAppActivity } from '../hooks/use-agent-activity';

export function ConnectionsPage() {
  const { data: connections, isLoading } = useConnections();
  const { data: billing } = useBilling();
  const disconnectMutation = useDisconnectService();
  const checkMutation = useCheckConnection();
  const { showDialog, connectedService, connectionFailure, openDialog, closeDialog } = useOAuthFlow();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const appActivities = useAppActivity();

  const handleAddApp = () => {
    if (billing) {
      const activeCount = (connections ?? []).length;
      if (activeCount >= billing.plan.max_apps) {
        setShowUpgrade(true);
        return;
      }
    }
    openDialog();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageTitle>Apps</PageTitle>
        <button
          onClick={handleAddApp}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
        >
          <Plus className="w-4 h-4" />
          Add app
        </button>
      </div>

      <ConnectAppDialog
        open={showDialog}
        onClose={closeDialog}
        connectedService={connectedService}
        connectionFailure={connectionFailure}
      />
      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} resourceType="apps" />

      {/* Connection List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading apps...</div>
      ) : !connections || connections.length === 0 ? (
        <EmptyState
          icon={<Plug className="w-12 h-12" />}
          title="No apps connected"
          description="Connect your apps to allow AI agents to access them."
          action={
            <button
              onClick={handleAddApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
            >
              <Plus className="w-4 h-4" />
              Add an app
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {connections.map((conn: any) => (
            <Link
              key={conn.id}
              to={`/apps/${conn.id}`}
              className="flex items-center gap-3 p-4 border border-border rounded-xl bg-card shadow-sm hover:shadow-md hover:border-[#D1CBC4] transition-all"
            >
              <ServiceIcon service={conn.service} className="w-6 h-6" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{conn.accountId}</div>
                <div className="text-sm text-muted-foreground">
                  {serviceName(conn.service)}
                  {conn.lastUsedAt && ` — last used ${new Date(conn.lastUsedAt).toLocaleString()}`}
                </div>
              </div>
              <AppActivityBadge activity={appActivities.get(`${conn.service}:${conn.accountId}`)} />
              <StatusBadge status={conn.status === 'connected' && conn.offline ? 'offline' : conn.status === 'connected' ? 'active' : conn.status === 'paused' ? 'paused' : 'error'} />
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); checkMutation.mutate({ connectionId: conn.id }); }}
                disabled={checkMutation.isPending}
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Test connection"
              >
                <RefreshCw className={`w-4 h-4 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm(`Disconnect ${conn.accountId}?`)) {
                    disconnectMutation.mutate({ connectionId: conn.id, service: conn.service });
                  }
                }}
                disabled={disconnectMutation.isPending}
                className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Disconnect"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
