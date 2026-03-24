import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, RotateCcw, ChevronRight } from 'lucide-react';
import { useAgent } from '../hooks/use-agents';
import { usePolicies, useSavePolicy, useServiceMethods } from '../hooks/use-policies';
import { useConnections } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { PageTitle } from '../components/page-title';
import { PolicySwitch } from '../components/policy-switch';
import { TooltipRoot, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { cn } from '../lib/cn';

// --- Types matching PolicyV2 from @keepai/proto ---

type PolicyAction = 'allow' | 'deny' | 'ask';
type CategoryAction = PolicyAction | 'custom';
type OperationType = 'read' | 'write' | 'delete';

interface MethodPolicy {
  action: PolicyAction;
}

interface GroupPolicy {
  action: CategoryAction;
  methods?: Record<string, MethodPolicy>;
}

interface CategoryPolicy {
  action: CategoryAction;
  groups?: Record<string, GroupPolicy>;
}

interface PolicyV2State {
  version: 2;
  default: PolicyAction;
  categories: {
    read: CategoryPolicy;
    write: CategoryPolicy;
    delete: CategoryPolicy;
  };
}

// --- Defaults ---

const OPS: OperationType[] = ['read', 'write', 'delete'];

const DEFAULT_CATEGORY_ACTIONS: Record<OperationType, PolicyAction> = {
  read: 'allow',
  write: 'ask',
  delete: 'ask',
};

const DEFAULT_POLICY_V2: PolicyV2State = {
  version: 2,
  default: 'ask',
  categories: {
    read: { action: 'allow' },
    write: { action: 'ask' },
    delete: { action: 'ask' },
  },
};

// --- Migration from V1 ---

function migratePolicy(policy: any): PolicyV2State {
  if (policy?.version === 2) return policy;
  // V1 format: { default, rules: [{ operations, action }] }
  const actions: Record<string, PolicyAction> = { ...DEFAULT_CATEGORY_ACTIONS };
  for (const rule of policy?.rules ?? []) {
    for (const op of rule.operations ?? []) {
      actions[op] = rule.action;
    }
  }
  return {
    version: 2,
    default: policy?.default ?? 'ask',
    categories: {
      read: { action: actions.read },
      write: { action: actions.write },
      delete: { action: actions.delete },
    },
  };
}

// --- Method tree types ---

interface MethodInfo {
  name: string;
  description: string;
  operationType: string;
}

interface GroupInfo {
  name: string;
  description?: string;
  methods: MethodInfo[];
}

/** Build a tree: category → group[] → method[] from the service methods response */
function buildMethodTree(
  data: { groups: Record<string, { description?: string; methods: MethodInfo[] }> } | undefined
): Record<OperationType, GroupInfo[]> {
  const tree: Record<OperationType, GroupInfo[]> = { read: [], write: [], delete: [] };
  if (!data) return tree;

  for (const [groupName, group] of Object.entries(data.groups)) {
    const byOp: Record<string, MethodInfo[]> = {};
    for (const m of group.methods) {
      if (!byOp[m.operationType]) byOp[m.operationType] = [];
      byOp[m.operationType].push(m);
    }
    for (const op of OPS) {
      if (byOp[op]?.length) {
        tree[op].push({
          name: groupName,
          description: group.description,
          methods: byOp[op],
        });
      }
    }
  }
  return tree;
}

/** Auto-populate groups/methods for a category when switching to custom */
function populateCategory(
  existing: CategoryPolicy,
  groups: GroupInfo[],
  defaultAction: PolicyAction,
): CategoryPolicy {
  const existingGroups = existing.groups ?? {};
  const newGroups: Record<string, GroupPolicy> = {};

  for (const group of groups) {
    if (existingGroups[group.name]) {
      // Preserve existing group policy, but ensure new methods get defaults
      const eg = existingGroups[group.name];
      if (eg.action === 'custom' && eg.methods) {
        const newMethods: Record<string, MethodPolicy> = {};
        for (const m of group.methods) {
          newMethods[m.name] = eg.methods[m.name] ?? { action: defaultAction };
        }
        // Preserve policies for methods that may have been removed from connector
        for (const [name, mp] of Object.entries(eg.methods)) {
          if (!newMethods[name]) newMethods[name] = mp;
        }
        newGroups[group.name] = { ...eg, methods: newMethods };
      } else {
        newGroups[group.name] = eg;
      }
    } else {
      newGroups[group.name] = { action: defaultAction };
    }
  }

  // Preserve policies for groups that may have been removed from connector
  for (const [name, gp] of Object.entries(existingGroups)) {
    if (!newGroups[name]) newGroups[name] = gp;
  }

  return { action: 'custom', groups: newGroups };
}

/** Auto-populate methods for a group when switching to custom */
function populateGroup(
  existing: GroupPolicy,
  methods: MethodInfo[],
  defaultAction: PolicyAction,
): GroupPolicy {
  const existingMethods = existing.methods ?? {};
  const newMethods: Record<string, MethodPolicy> = {};

  for (const m of methods) {
    newMethods[m.name] = existingMethods[m.name] ?? { action: defaultAction };
  }
  // Preserve removed method policies
  for (const [name, mp] of Object.entries(existingMethods)) {
    if (!newMethods[name]) newMethods[name] = mp;
  }

  return { action: 'custom', methods: newMethods };
}

// --- OP labels ---

const OP_LABELS: Record<OperationType, string> = {
  read: 'Read',
  write: 'Write',
  delete: 'Delete',
};

const OP_DESCRIPTIONS: Record<OperationType, string> = {
  read: 'All methods that read data — list, get, search, download',
  write: 'All methods that write data — create, update, send, modify',
  delete: 'All methods that delete data — delete, trash, remove',
};

const NAME_CLASS = 'underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 cursor-pointer';

// --- Change detection ---

function categoryChanged(local: CategoryPolicy | undefined, server: CategoryPolicy | undefined): boolean {
  return JSON.stringify(local) !== JSON.stringify(server);
}

function groupChanged(local: GroupPolicy | undefined, server: GroupPolicy | undefined): boolean {
  return JSON.stringify(local) !== JSON.stringify(server);
}

function methodChanged(local: PolicyAction | undefined, server: PolicyAction | undefined): boolean {
  return local !== server;
}

function ChangedDot() {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 cursor-default" />
      </TooltipTrigger>
      <TooltipContent side="right">Changed</TooltipContent>
    </TooltipRoot>
  );
}

// --- Connection Policy Card ---

function ConnectionPolicyCard({
  conn,
  policy,
  serverPolicy,
  onChange,
  onSave,
  onReset,
  saving,
}: {
  conn: any;
  policy: PolicyV2State;
  serverPolicy: PolicyV2State;
  onChange: (policy: PolicyV2State) => void;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
}) {
  const { data: methodsData } = useServiceMethods(conn.service);
  const methodTree = useMemo(() => buildMethodTree(methodsData), [methodsData]);
  const hasChanges = JSON.stringify(policy) !== JSON.stringify(serverPolicy);

  const updateCategory = (op: OperationType, action: CategoryAction) => {
    const cat = policy.categories[op];
    let newCat: CategoryPolicy;

    if (action === 'custom') {
      newCat = populateCategory(cat, methodTree[op], DEFAULT_CATEGORY_ACTIONS[op]);
    } else {
      // Preserve groups for future custom switch-back
      newCat = { ...cat, action };
    }

    onChange({
      ...policy,
      categories: { ...policy.categories, [op]: newCat },
    });
  };

  const updateGroup = (op: OperationType, groupName: string, action: CategoryAction) => {
    const cat = policy.categories[op];
    const groups = { ...cat.groups };
    const existing = groups[groupName] ?? { action: DEFAULT_CATEGORY_ACTIONS[op] };

    if (action === 'custom') {
      const groupMethods = methodTree[op].find((g) => g.name === groupName)?.methods ?? [];
      groups[groupName] = populateGroup(existing, groupMethods, DEFAULT_CATEGORY_ACTIONS[op]);
    } else {
      groups[groupName] = { ...existing, action };
    }

    onChange({
      ...policy,
      categories: { ...policy.categories, [op]: { ...cat, groups } },
    });
  };

  const updateMethod = (op: OperationType, groupName: string, methodName: string, action: PolicyAction) => {
    const cat = policy.categories[op];
    const groups = { ...cat.groups };
    const group = { ...groups[groupName] };
    const methods = { ...group.methods };
    methods[methodName] = { action };
    group.methods = methods;
    groups[groupName] = group;

    onChange({
      ...policy,
      categories: { ...policy.categories, [op]: { ...cat, groups } },
    });
  };

  return (
    <div className="border border-border rounded-xl p-4 bg-card shadow-sm">
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

      <div className="space-y-1">
        {OPS.map((op) => {
          const cat = policy.categories[op];
          const serverCat = serverPolicy.categories[op];
          return (
            <CategoryRow
              key={op}
              op={op}
              category={cat}
              serverCategory={serverCat}
              methodTree={methodTree[op]}
              onCategoryChange={(action) => updateCategory(op, action)}
              onGroupChange={(groupName, action) => updateGroup(op, groupName, action)}
              onMethodChange={(groupName, methodName, action) => updateMethod(op, groupName, methodName, action)}
            />
          );
        })}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg hover:bg-accent text-muted-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          onClick={onSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>
    </div>
  );
}

// --- Category Row ---

function CategoryRow({
  op,
  category,
  serverCategory,
  methodTree,
  onCategoryChange,
  onGroupChange,
  onMethodChange,
}: {
  op: OperationType;
  category: CategoryPolicy;
  serverCategory: CategoryPolicy;
  methodTree: GroupInfo[];
  onCategoryChange: (action: CategoryAction) => void;
  onGroupChange: (groupName: string, action: CategoryAction) => void;
  onMethodChange: (groupName: string, methodName: string, action: PolicyAction) => void;
}) {
  const isCustom = category.action === 'custom';
  const changed = categoryChanged(category, serverCategory);

  return (
    <div>
      <div className="flex items-center gap-3 p-2 rounded-md bg-accent/30">
        <ChevronRight
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            isCustom ? 'rotate-90' : '',
            methodTree.length === 0 ? 'invisible' : ''
          )}
        />
        <TooltipRoot>
          <TooltipTrigger asChild>
            <button className={cn('text-sm font-medium w-20 text-left', NAME_CLASS)}>
              {OP_LABELS[op]}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="start">
            <p className="font-medium">{OP_LABELS[op]}</p>
            <p className="mt-0.5 text-muted-foreground">{OP_DESCRIPTIONS[op]}</p>
          </TooltipContent>
        </TooltipRoot>
        <PolicySwitch value={category.action} onChange={onCategoryChange} showCustom={methodTree.length > 0} />
        {changed && <ChangedDot />}
      </div>

      {isCustom && methodTree.length > 0 && (
        <div className="ml-6 border-l border-border">
          {methodTree.map((group) => {
            const gp = category.groups?.[group.name] ?? { action: DEFAULT_CATEGORY_ACTIONS[op] };
            const serverGp = serverCategory.groups?.[group.name] ?? { action: DEFAULT_CATEGORY_ACTIONS[op] };
            return (
              <GroupRow
                key={group.name}
                group={group}
                groupPolicy={gp}
                serverGroupPolicy={serverGp}
                defaultAction={DEFAULT_CATEGORY_ACTIONS[op]}
                serverDefaultAction={(serverCategory.action !== 'custom' ? serverCategory.action : DEFAULT_CATEGORY_ACTIONS[op]) as PolicyAction}
                onGroupChange={(action) => onGroupChange(group.name, action)}
                onMethodChange={(methodName, action) => onMethodChange(group.name, methodName, action)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Group Row ---

function GroupRow({
  group,
  groupPolicy,
  serverGroupPolicy,
  defaultAction,
  serverDefaultAction,
  onGroupChange,
  onMethodChange,
}: {
  group: GroupInfo;
  groupPolicy: GroupPolicy;
  serverGroupPolicy: GroupPolicy;
  defaultAction: PolicyAction;
  serverDefaultAction: PolicyAction;
  onGroupChange: (action: CategoryAction) => void;
  onMethodChange: (methodName: string, action: PolicyAction) => void;
}) {
  const isCustom = groupPolicy.action === 'custom';
  const changed = groupChanged(groupPolicy, serverGroupPolicy);

  return (
    <div>
      <div className="flex items-center gap-3 py-1.5 pl-3 pr-2">
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            isCustom ? 'rotate-90' : ''
          )}
        />
        <TooltipRoot>
          <TooltipTrigger asChild>
            <button className={cn('text-sm text-muted-foreground w-28 truncate text-left', NAME_CLASS)}>
              {group.name}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="start">
            <p className="font-medium">{group.name}</p>
            {group.description && <p className="mt-0.5 text-muted-foreground">{group.description}</p>}
            <p className="mt-1 text-muted-foreground">Methods: {group.methods.length}</p>
          </TooltipContent>
        </TooltipRoot>
        <PolicySwitch value={groupPolicy.action} onChange={onGroupChange} />
        {changed && <ChangedDot />}
      </div>

      {isCustom && (
        <div className="ml-10 border-l border-border/50">
          {group.methods.map((method) => {
            const mp = groupPolicy.methods?.[method.name];
            const action = mp?.action ?? defaultAction;
            const serverMp = serverGroupPolicy.methods?.[method.name];
            const serverAction = serverMp?.action ?? serverDefaultAction;
            const mChanged = methodChanged(action, serverAction);
            return (
              <div key={method.name} className="flex items-center gap-3 py-1 pl-3 pr-2">
                <span className="w-3.5" />
                <TooltipRoot>
                  <TooltipTrigger asChild>
                    <button className={cn('text-xs text-muted-foreground w-28 truncate text-left', NAME_CLASS)}>
                      {method.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    <p className="font-medium">{method.name}</p>
                    <p className="mt-0.5 text-muted-foreground">{method.description}</p>
                  </TooltipContent>
                </TooltipRoot>
                <PolicySwitch
                  value={action}
                  onChange={(v) => onMethodChange(method.name, v as PolicyAction)}
                  showCustom={false}
                />
                {mChanged && <ChangedDot />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export function PermissionsPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { data: agent } = useAgent(agentId!);
  const { data: serverPolicies, isLoading } = usePolicies(agentId!);
  const { data: connections } = useConnections();
  const saveMutation = useSavePolicy();

  const [localPolicies, setLocalPolicies] = useState<Record<string, PolicyV2State>>({});
  const [savedPolicies, setSavedPolicies] = useState<Record<string, PolicyV2State>>({});

  const connectionByKey = new Map<string, any>();
  for (const conn of connections ?? []) {
    connectionByKey.set(`${conn.service}:${conn.accountId}`, conn);
  }

  useEffect(() => {
    if (serverPolicies && connections) {
      const map: Record<string, PolicyV2State> = {};
      for (const entry of serverPolicies as any[]) {
        const conn = connectionByKey.get(`${entry.service}:${entry.accountId}`);
        if (conn) {
          map[conn.id] = migratePolicy(entry.policy);
        }
      }
      setLocalPolicies(map);
      setSavedPolicies(map);
    }
  }, [serverPolicies, connections]);

  const connectedAccounts = (connections ?? []).filter((c: any) => c.status === 'connected');

  const handleSave = async (connectionId: string) => {
    try {
      await saveMutation.mutateAsync({
        agentId: agentId!,
        connectionId,
        policy: localPolicies[connectionId] ?? DEFAULT_POLICY_V2,
      });
    } catch {
      // error toast shown by global handler
    }
  };

  const handleReset = (connectionId: string) => {
    setLocalPolicies((prev) => ({ ...prev, [connectionId]: DEFAULT_POLICY_V2 }));
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
          {connectedAccounts.map((conn: any) => (
            <ConnectionPolicyCard
              key={conn.id}
              conn={conn}
              policy={localPolicies[conn.id] ?? DEFAULT_POLICY_V2}
              serverPolicy={savedPolicies[conn.id] ?? DEFAULT_POLICY_V2}
              onChange={(p) => setLocalPolicies((prev) => ({ ...prev, [conn.id]: p }))}
              onSave={() => handleSave(conn.id)}
              onReset={() => handleReset(conn.id)}
              saving={saveMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
