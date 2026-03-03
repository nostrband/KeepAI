import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useConnections, useDisconnectService, useCheckConnection } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { StatusBadge } from '../components/status-badge';
import { EmptyState } from '../components/empty-state';
import { PageTitle } from '../components/page-title';
import { ConnectAppDialog } from '../components/connect-app-dialog';

export function ConnectionsPage() {
  const { data: connections, isLoading } = useConnections();
  const disconnectMutation = useDisconnectService();
  const checkMutation = useCheckConnection();
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageTitle>Apps</PageTitle>
        <button
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add app
        </button>
      </div>

      <ConnectAppDialog open={showDialog} onClose={() => setShowDialog(false)} />

      {/* Connection List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading apps...</div>
      ) : !connections || connections.length === 0 ? (
        <EmptyState
          icon={<Plug className="w-12 h-12" />}
          title="No apps connected"
          description="Connect Gmail or Notion to allow your AI agents to access them."
          action={
            <button
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
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
              key={`${conn.service}:${conn.accountId}`}
              to={`/apps/${conn.service}/${encodeURIComponent(conn.accountId)}`}
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ServiceIcon service={conn.service} className="w-6 h-6" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{conn.accountId}</div>
                <div className="text-sm text-muted-foreground">
                  {serviceName(conn.service)}
                  {conn.lastUsedAt && ` — last used ${new Date(conn.lastUsedAt).toLocaleString()}`}
                </div>
              </div>
              <StatusBadge status={conn.status === 'connected' ? 'active' : conn.status === 'paused' ? 'paused' : 'error'} />
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); checkMutation.mutate({ service: conn.service, accountId: conn.accountId }); }}
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
                    disconnectMutation.mutate({ service: conn.service, accountId: conn.accountId });
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
