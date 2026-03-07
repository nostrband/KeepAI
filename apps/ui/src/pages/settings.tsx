import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useConfig, useSaveConfig, useStatus } from '../hooks/use-config';
import { PageTitle } from '../components/page-title';

const electronAPI = (window as any).electronAPI;

export function SettingsPage() {
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: status } = useStatus();
  const saveMutation = useSaveConfig();

  const [relays, setRelays] = useState('');
  const [approvalTimeout, setApprovalTimeout] = useState('');
  const [autoLaunch, setAutoLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    if (config) {
      setRelays(config.relays || '');
      setApprovalTimeout(config.approvalTimeout || '300');
    }
  }, [config]);

  useEffect(() => {
    electronAPI?.getAutoLaunch?.().then((v: boolean) => setAutoLaunch(v));
  }, []);

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
        <div className="border border-border rounded-xl p-4 bg-card shadow-sm mb-6">
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
      <div className="border border-border rounded-xl p-4 bg-card shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Configuration</h2>

        {configLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {autoLaunch !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Start at login</label>
                  <p className="text-xs text-muted-foreground">
                    Automatically start KeepAI minimized when you log in.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoLaunch}
                  onClick={() => {
                    const next = !autoLaunch;
                    setAutoLaunch(next);
                    electronAPI?.setAutoLaunch?.(next);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    autoLaunch ? 'bg-primary' : 'bg-input'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      autoLaunch ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Nostr Relay URLs</label>
              <textarea
                value={relays}
                onChange={(e) => setRelays(e.target.value)}
                placeholder="wss://relay.example.com (one per line)"
                rows={3}
                className="w-full px-4 py-3 text-sm border border-input rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-foreground font-mono"
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
                className="w-32 px-4 py-3 text-sm border border-input rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How long to wait for approval before timing out. Default: 300 seconds (5 minutes).
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="border border-border rounded-xl p-4 bg-card shadow-sm">
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
