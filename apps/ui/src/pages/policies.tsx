import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useAgent } from '../hooks/use-agents';
import { usePolicies, useSavePolicy } from '../hooks/use-policies';
import { useConnections } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from '../components/service-icon';

type Action = 'allow' | 'deny' | 'ask';

interface PolicyState {
  default: Action;
  rules: Array<{
    operations?: string[];
    methods?: string[];
    action: Action;
  }>;
}

const DEFAULT_POLICY: PolicyState = {
  default: 'ask',
  rules: [
    { operations: ['read'], action: 'allow' },
    { operations: ['write'], action: 'ask' },
    { operations: ['delete'], action: 'ask' },
  ],
};

function ActionSelect({ value, onChange }: { value: Action; onChange: (v: Action) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Action)}
      className="px-2 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="allow">Allow</option>
      <option value="deny">Deny</option>
      <option value="ask">Ask</option>
    </select>
  );
}

export function PoliciesPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { data: agent } = useAgent(agentId!);
  const { data: serverPolicies, isLoading } = usePolicies(agentId!);
  const { data: connections } = useConnections();
  const saveMutation = useSavePolicy();

  const [localPolicies, setLocalPolicies] = useState<Record<string, PolicyState>>({});
  const [showRaw, setShowRaw] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [rawError, setRawError] = useState('');

  // Initialize local state from server
  useEffect(() => {
    if (serverPolicies) {
      setLocalPolicies(serverPolicies as Record<string, PolicyState>);
    }
  }, [serverPolicies]);

  const connectedServices = [...new Set(connections?.map((c: any) => c.service) ?? [])];

  const updatePolicy = (service: string, policy: PolicyState) => {
    setLocalPolicies((prev) => ({ ...prev, [service]: policy }));
  };

  const handleSave = async (service: string) => {
    try {
      await saveMutation.mutateAsync({
        agentId: agentId!,
        service,
        policy: localPolicies[service] ?? DEFAULT_POLICY,
      });
    } catch {
      // error toast shown by global mutation handler
    }
  };

  const handleReset = (service: string) => {
    setLocalPolicies((prev) => ({ ...prev, [service]: DEFAULT_POLICY }));
  };

  const handleSaveRaw = async (service: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setRawError('Invalid JSON');
      return;
    }
    setRawError('');
    try {
      await saveMutation.mutateAsync({ agentId: agentId!, service, policy: parsed });
      setLocalPolicies((prev) => ({ ...prev, [service]: parsed }));
    } catch {
      // error toast shown by global mutation handler
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div>
      <Link to={`/agents/${agentId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to {agent?.name || 'agent'}
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        Policies for {agent?.name || 'agent'}
      </h1>

      {connectedServices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No services connected. Connect a service first to configure policies.
        </p>
      ) : (
        <div className="space-y-6">
          {connectedServices.map((service: string) => {
            const policy = localPolicies[service] ?? DEFAULT_POLICY;
            return (
              <div key={service} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ServiceIcon service={service} />
                    <span className="font-semibold">{serviceName(service)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowRaw(!showRaw);
                        setRawJson(JSON.stringify(policy, null, 2));
                        setRawError('');
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showRaw ? 'Visual' : 'Raw JSON'}
                    </button>
                  </div>
                </div>

                {showRaw ? (
                  <div>
                    <textarea
                      value={rawJson}
                      onChange={(e) => setRawJson(e.target.value)}
                      className="w-full h-40 px-3 py-2 text-sm font-mono border border-input rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {rawError && <p className="text-sm text-destructive mt-1">{rawError}</p>}
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => handleSaveRaw(service)}
                        disabled={saveMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-muted-foreground w-32">Default action:</span>
                      <ActionSelect
                        value={policy.default}
                        onChange={(v) => updatePolicy(service, { ...policy, default: v })}
                      />
                    </div>

                    <div className="space-y-2">
                      {(policy.rules ?? []).map((rule, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-accent/30">
                          <span className="text-sm w-32">
                            {rule.operations?.join(', ') || rule.methods?.join(', ') || 'All'}:
                          </span>
                          <ActionSelect
                            value={rule.action}
                            onChange={(v) => {
                              const newRules = [...(policy.rules ?? [])];
                              newRules[i] = { ...newRules[i], action: v };
                              updatePolicy(service, { ...policy, rules: newRules });
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => handleReset(service)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-accent text-muted-foreground"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                      <button
                        onClick={() => handleSave(service)}
                        disabled={saveMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
