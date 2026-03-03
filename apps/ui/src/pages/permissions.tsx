import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, RotateCcw } from 'lucide-react';
import { useAgent } from '../hooks/use-agents';
import { usePolicies, useSavePolicy } from '../hooks/use-policies';
import { useConnections } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { PageTitle } from '../components/page-title';

type Action = 'allow' | 'deny' | 'ask';

interface PolicyState {
  default: Action;
  rules: Array<{
    operations?: string[];
    methods?: string[];
    action: Action;
  }>;
}

const DEFAULT_ACTIONS: Record<string, Action> = {
  read: 'allow',
  write: 'ask',
  delete: 'ask',
};

const OPS = ['read', 'write', 'delete'] as const;

// Extract per-operation action from policy rules
function policyToActions(policy: PolicyState): Record<string, Action> {
  const actions: Record<string, Action> = { ...DEFAULT_ACTIONS };
  for (const rule of policy.rules ?? []) {
    for (const op of rule.operations ?? []) {
      actions[op] = rule.action;
    }
  }
  return actions;
}

// Group operations with the same action into rules
function actionsToPolicyRules(actions: Record<string, Action>): PolicyState['rules'] {
  const grouped = new Map<Action, string[]>();
  for (const op of OPS) {
    const action = actions[op] ?? 'ask';
    if (!grouped.has(action)) grouped.set(action, []);
    grouped.get(action)!.push(op);
  }
  return Array.from(grouped.entries()).map(([action, operations]) => ({ operations, action }));
}

const DEFAULT_POLICY: PolicyState = {
  default: 'ask',
  rules: actionsToPolicyRules(DEFAULT_ACTIONS),
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

export function PermissionsPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { data: agent } = useAgent(agentId!);
  const { data: serverPolicies, isLoading } = usePolicies(agentId!);
  const { data: connections } = useConnections();
  const saveMutation = useSavePolicy();

  // Key: "service:accountId" → PolicyState
  const [localPolicies, setLocalPolicies] = useState<Record<string, PolicyState>>({});
  const [showRaw, setShowRaw] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState('');
  const [rawError, setRawError] = useState('');

  // Initialize local state from server policy entries
  useEffect(() => {
    if (serverPolicies) {
      const map: Record<string, PolicyState> = {};
      for (const entry of serverPolicies as any[]) {
        const key = `${entry.service}:${entry.accountId}`;
        map[key] = entry.policy;
      }
      setLocalPolicies(map);
    }
  }, [serverPolicies]);

  // Get connected accounts as (service, accountId) pairs
  const connectedAccounts = (connections ?? [])
    .filter((c: any) => c.status === 'connected')
    .map((c: any) => ({ service: c.service, accountId: c.accountId }));

  const updatePolicy = (key: string, policy: PolicyState) => {
    setLocalPolicies((prev) => ({ ...prev, [key]: policy }));
  };

  const handleSave = async (service: string, accountId: string) => {
    const key = `${service}:${accountId}`;
    try {
      await saveMutation.mutateAsync({
        agentId: agentId!,
        service,
        accountId,
        policy: localPolicies[key] ?? DEFAULT_POLICY,
      });
    } catch {
      // error toast shown by global mutation handler
    }
  };

  const handleReset = (key: string) => {
    setLocalPolicies((prev) => ({ ...prev, [key]: DEFAULT_POLICY }));
  };

  const handleSaveRaw = async (service: string, accountId: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setRawError('Invalid JSON');
      return;
    }
    setRawError('');
    const key = `${service}:${accountId}`;
    try {
      await saveMutation.mutateAsync({ agentId: agentId!, service, accountId, policy: parsed });
      setLocalPolicies((prev) => ({ ...prev, [key]: parsed }));
    } catch {
      // error toast shown by global mutation handler
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div>
      <PageTitle>Permissions for {agent?.name || 'agent'}</PageTitle>

      {connectedAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No apps connected. Connect an app first to configure permissions.
        </p>
      ) : (
        <div className="space-y-6">
          {connectedAccounts.map(({ service, accountId }: { service: string; accountId: string }) => {
            const key = `${service}:${accountId}`;
            const policy = localPolicies[key] ?? DEFAULT_POLICY;
            const isShowingRaw = showRaw === key;
            return (
              <div key={key} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ServiceIcon service={service} />
                    <Link to={`/apps/${service}/${encodeURIComponent(accountId)}`} className="font-semibold hover:underline">
                      {serviceName(service)}
                    </Link>
                    <Link to={`/apps/${service}/${encodeURIComponent(accountId)}`} className="text-xs text-muted-foreground hover:underline">
                      {accountId}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isShowingRaw) {
                          setShowRaw(null);
                        } else {
                          setShowRaw(key);
                          setRawJson(JSON.stringify(policy, null, 2));
                          setRawError('');
                        }
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isShowingRaw ? 'Visual' : 'Raw JSON'}
                    </button>
                  </div>
                </div>

                {isShowingRaw ? (
                  <div>
                    <textarea
                      value={rawJson}
                      onChange={(e) => setRawJson(e.target.value)}
                      className="w-full h-40 px-3 py-2 text-sm font-mono border border-input rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {rawError && <p className="text-sm text-destructive mt-1">{rawError}</p>}
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => handleSaveRaw(service, accountId)}
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
                        onChange={(v) => updatePolicy(key, { ...policy, default: v })}
                      />
                    </div>

                    <div className="space-y-2">
                      {OPS.map((op) => {
                        const actions = policyToActions(policy);
                        return (
                          <div key={op} className="flex items-center gap-3 p-2 rounded-md bg-accent/30">
                            <span className="text-sm w-32 capitalize">{op}:</span>
                            <ActionSelect
                              value={actions[op]}
                              onChange={(v) => {
                                const newActions = { ...actions, [op]: v };
                                updatePolicy(key, { ...policy, rules: actionsToPolicyRules(newActions) });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => handleReset(key)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-accent text-muted-foreground"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                      <button
                        onClick={() => handleSave(service, accountId)}
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
