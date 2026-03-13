import { useState, useEffect } from 'react';
import { Copy, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { useCreateAgent, useAgent, useCancelPairing } from '../hooks/use-agents';
import { CodeBlock } from './code-block';

interface AddAgentDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddAgentDialog({ open, onClose }: AddAgentDialogProps) {
  const createMutation = useCreateAgent();
  const cancelMutation = useCancelPairing();
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState('openclaw');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingId, setPairingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);

  const { data: pairedAgent } = useAgent(pairingId ?? '');

  useEffect(() => {
    if (pairedAgent && pairingId) {
      setConnected(true);
    }
  }, [pairedAgent, pairingId]);

  const handleCreate = async () => {
    if (!agentName.trim()) return;
    try {
      const result = await createMutation.mutateAsync({
        name: agentName.trim(),
        type: agentType === 'other' ? '' : agentType,
      });
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
    handleClose();
  };

  const handleClose = () => {
    setAgentName('');
    setAgentType('openclaw');
    setPairingCode(null);
    setPairingId(null);
    setCopied(false);
    setConnected(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        {!pairingCode ? (
          <>
            <h2 className="text-lg font-semibold mb-4">Add Agent</h2>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value)}
              className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-foreground bg-transparent mb-3"
            >
              <option value="openclaw">OpenClaw</option>
              <option value="codex">Codex</option>
              <option value="claude">Claude</option>
              <option value="nanoclaw">NanoClaw</option>
              <option value="other">Other</option>
            </select>
            <label className="block text-sm font-medium mb-1">Agent name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. my-assistant"
              className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!agentName.trim() || createMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
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
                onClick={handleClose}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
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
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
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
  );
}
