import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, Copy, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { useAgents, useCreateAgent, useAgent, useCancelPairing } from '../hooks/use-agents';
import { StatusBadge } from '../components/status-badge';
import { EmptyState } from '../components/empty-state';
import { CodeBlock } from '../components/code-block';
import { PageTitle } from '../components/page-title';

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const createMutation = useCreateAgent();
  const cancelMutation = useCancelPairing();
  const [showDialog, setShowDialog] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingId, setPairingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);

  // Watch for pairing completion via useAgent — returns data once agent is created
  const { data: pairedAgent } = useAgent(pairingId ?? '');

  useEffect(() => {
    if (pairedAgent && pairingId) {
      setConnected(true);
    }
  }, [pairedAgent, pairingId]);

  const handleCreate = async () => {
    if (!agentName.trim()) return;
    try {
      const result = await createMutation.mutateAsync(agentName.trim());
      setPairingCode(result.code);
      setPairingId(result.id);
    } catch {
      // error toast shown by global mutation handler
    }
  };

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(`npx keepai init ${pairingCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (pairingId) {
      try { await cancelMutation.mutateAsync(pairingId); } catch { /* ignore */ }
    }
    closeDialog();
  };

  const closeDialog = () => {
    setShowDialog(false);
    setAgentName('');
    setPairingCode(null);
    setPairingId(null);
    setCopied(false);
    setConnected(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageTitle>Agents</PageTitle>
        <button
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add agent
        </button>
      </div>

      {/* Pairing Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            {!pairingCode ? (
              <>
                <h2 className="text-lg font-semibold mb-4">Add Agent</h2>
                <label className="block text-sm font-medium mb-1">Agent name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. my-assistant"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={closeDialog}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!agentName.trim() || createMutation.isPending}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Generate Code'}
                  </button>
                </div>
              </>
            ) : connected ? (
              <>
                <div className="flex flex-col items-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                  <h2 className="text-lg font-semibold mb-1">Agent Connected</h2>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{agentName}</span> has been paired successfully.
                  </p>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={closeDialog}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-2">Pairing Code</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Tell your agent to run this command:
                </p>
                <CodeBlock>npx keepai init {pairingCode}</CodeBlock>
                <div className="flex items-center gap-2 mt-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Waiting for agent to connect...
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  The pairing code expires in 5 minutes.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy command
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Agent List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading agents...</div>
      ) : !agents || agents.length === 0 ? (
        <EmptyState
          icon={<Bot className="w-12 h-12" />}
          title="No agents paired"
          description="Pair an AI agent to allow it to access your connected services securely."
          action={
            <button
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
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
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
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
              <StatusBadge status={agent.status === 'revoked' ? 'revoked' : 'active'} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
