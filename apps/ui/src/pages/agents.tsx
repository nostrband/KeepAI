import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, Copy, Check } from 'lucide-react';
import { useAgents, useCreateAgent } from '../hooks/use-agents';
import { StatusBadge } from '../components/status-badge';
import { EmptyState } from '../components/empty-state';
import { CodeBlock } from '../components/code-block';

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const createMutation = useCreateAgent();
  const [showDialog, setShowDialog] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!agentName.trim()) return;
    try {
      const result = await createMutation.mutateAsync(agentName.trim());
      setPairingCode(result.code);
    } catch (err) {
      console.error('Create agent failed:', err);
    }
  };

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(`npx keepai init ${pairingCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setAgentName('');
    setPairingCode(null);
    setCopied(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
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
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-2">Pairing Code</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Tell your agent to run this command:
                </p>
                <div className="relative">
                  <CodeBlock>npx keepai init {pairingCode}</CodeBlock>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-gray-200"
                    title="Copy command"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Waiting for agent to connect... The pairing code expires in 5 minutes.
                </p>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={closeDialog}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Done
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
                  Paired {new Date(agent.created_at).toLocaleDateString()}
                  {agent.last_seen_at && ` — last seen ${new Date(agent.last_seen_at).toLocaleString()}`}
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
