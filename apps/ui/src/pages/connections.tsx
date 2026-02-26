import { useState } from 'react';
import { Plug, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useConnections, useConnectService, useDisconnectService, useCheckConnection } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { StatusBadge } from '../components/status-badge';
import { EmptyState } from '../components/empty-state';

const AVAILABLE_SERVICES = ['gmail', 'notion'];

export function ConnectionsPage() {
  const { data: connections, isLoading } = useConnections();
  const connectMutation = useConnectService();
  const disconnectMutation = useDisconnectService();
  const checkMutation = useCheckConnection();
  const [showPicker, setShowPicker] = useState(false);

  const handleConnect = async (service: string) => {
    setShowPicker(false);
    try {
      const result = await connectMutation.mutateAsync(service);
      if (result.authUrl) {
        // In Electron, open OAuth URL in system browser (not in-app window)
        if ((window as any).electronAPI?.openExternal) {
          (window as any).electronAPI.openExternal(result.authUrl);
        } else {
          window.open(result.authUrl, '_blank');
        }
      }
    } catch {
      // error toast shown by global mutation handler
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Connections</h1>
        <button
          onClick={() => setShowPicker(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Connect service
        </button>
      </div>

      {/* Service Picker */}
      {showPicker && (
        <div className="mb-6 p-4 border border-border rounded-lg bg-card">
          <h3 className="text-sm font-medium mb-3">Choose a service to connect:</h3>
          <div className="flex gap-3">
            {AVAILABLE_SERVICES.map((svc) => (
              <button
                key={svc}
                onClick={() => handleConnect(svc)}
                disabled={connectMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                <ServiceIcon service={svc} />
                <span className="text-sm font-medium">{serviceName(svc)}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Connection List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading connections...</div>
      ) : !connections || connections.length === 0 ? (
        <EmptyState
          icon={<Plug className="w-12 h-12" />}
          title="No services connected"
          description="Connect Gmail or Notion to allow your AI agents to access them."
          action={
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Connect a service
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {connections.map((conn: any) => (
            <div
              key={`${conn.service}:${conn.account_id}`}
              className="flex items-center gap-3 p-4 border border-border rounded-lg"
            >
              <ServiceIcon service={conn.service} className="w-6 h-6" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{conn.account_id}</div>
                <div className="text-sm text-muted-foreground">
                  {serviceName(conn.service)}
                  {conn.last_used_at && ` — last used ${new Date(conn.last_used_at).toLocaleString()}`}
                </div>
              </div>
              <StatusBadge status={conn.status === 'active' ? 'connected' : 'error'} />
              <button
                onClick={() => checkMutation.mutate({ service: conn.service, accountId: conn.account_id })}
                disabled={checkMutation.isPending}
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Test connection"
              >
                <RefreshCw className={`w-4 h-4 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Disconnect ${conn.account_id}?`)) {
                    disconnectMutation.mutate({ service: conn.service, accountId: conn.account_id });
                  }
                }}
                disabled={disconnectMutation.isPending}
                className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Disconnect"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
