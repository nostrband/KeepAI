import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useConfig, useSaveConfig, useStatus } from '../hooks/use-config';
import { PageTitle } from '../components/page-title';

export function SettingsPage() {
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: status } = useStatus();
  const saveMutation = useSaveConfig();

  const [relays, setRelays] = useState('');
  const [approvalTimeout, setApprovalTimeout] = useState('');

  useEffect(() => {
    if (config) {
      setRelays(config.relays || '');
      setApprovalTimeout(config.approvalTimeout || '300');
    }
  }, [config]);

  const handleSave = () => {
    saveMutation.mutate({
      relays,
      approvalTimeout,
    });
  };

  return (
    <div>
      <PageTitle>Settings</PageTitle>

      {/* Status */}
      {status && (
        <div className="border border-border rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Agents</dt>
            <dd>{status.agents?.paired ?? 0} / {status.agents?.total ?? 0}</dd>
            <dt className="text-muted-foreground">Apps</dt>
            <dd>{status.connections?.connected ?? 0} / {status.connections?.total ?? 0}</dd>
            <dt className="text-muted-foreground">Pending Approvals</dt>
            <dd>{status.pendingApprovals ?? 0}</dd>
            <dt className="text-muted-foreground">SSE Clients</dt>
            <dd>{status.sseClients ?? 0}</dd>
          </dl>
        </div>
      )}

      {/* Configuration */}
      <div className="border border-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Configuration</h2>

        {configLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nostr Relay URLs</label>
              <textarea
                value={relays}
                onChange={(e) => setRelays(e.target.value)}
                placeholder="wss://relay.example.com (one per line)"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of nostr relay URLs for agent communication.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Approval Timeout (seconds)</label>
              <input
                type="number"
                value={approvalTimeout}
                onChange={(e) => setApprovalTimeout(e.target.value)}
                className="w-32 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How long to wait for approval before timing out. Default: 300 seconds (5 minutes).
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Version</dt>
          <dd>0.1.0</dd>
          <dt className="text-muted-foreground">Project</dt>
          <dd>KeepAI — Safe gate for AI agents</dd>
        </dl>
      </div>
    </div>
  );
}
