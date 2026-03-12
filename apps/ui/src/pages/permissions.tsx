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
      className="px-2 py-1 text-sm border border-input rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-foreground"
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

  // Key: connectionId → PolicyState
  const [localPolicies, setLocalPolicies] = useState<Record<string, PolicyState>>({});

  // Build a map of service:accountId → connectionId for lookup
  const connectionByKey = new Map<string, any>();
  for (const conn of connections ?? []) {
    connectionByKey.set(`${conn.service}:${conn.accountId}`, conn);
  }

  // Initialize local state from server policy entries
  useEffect(() => {
    if (serverPolicies && connections) {
      const map: Record<string, PolicyState> = {};
      for (const entry of serverPolicies as any[]) {
        const conn = connectionByKey.get(`${entry.service}:${entry.accountId}`);
        if (conn) {
          map[conn.id] = entry.policy;
        }
      }
      setLocalPolicies(map);
    }
  }, [serverPolicies, connections]);

  // Get connected accounts
  const connectedAccounts = (connections ?? [])
    .filter((c: any) => c.status === 'connected');

  const updatePolicy = (connectionId: string, policy: PolicyState) => {
    setLocalPolicies((prev) => ({ ...prev, [connectionId]: policy }));
  };

  const handleSave = async (connectionId: string) => {
    try {
      await saveMutation.mutateAsync({
        agentId: agentId!,
        connectionId,
        policy: localPolicies[connectionId] ?? DEFAULT_POLICY,
      });
    } catch {
      // error toast shown by global mutation handler
    }
  };

  const handleReset = (connectionId: string) => {
    setLocalPolicies((prev) => ({ ...prev, [connectionId]: DEFAULT_POLICY }));
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
          {connectedAccounts.map((conn: any) => {
            const policy = localPolicies[conn.id] ?? DEFAULT_POLICY;
            return (
              <div key={conn.id} className="border border-border rounded-xl p-4 bg-card shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ServiceIcon service={conn.service} />
                    <Link to={`/apps/${conn.id}`} className="font-semibold hover:underline">
                      {serviceName(conn.service)}
                    </Link>
                    <Link to={`/apps/${conn.id}`} className="text-xs text-muted-foreground hover:underline">
                      {conn.accountId}
                    </Link>
                  </div>
                </div>

                  <div>
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
                                updatePolicy(conn.id, { ...policy, rules: actionsToPolicyRules(newActions) });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => handleReset(conn.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg hover:bg-accent text-muted-foreground"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                      <button
                        onClick={() => handleSave(conn.id)}
                        disabled={saveMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
