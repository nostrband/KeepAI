# 07 - Permission & Policy System

## Overview

Each paired agent gets its own set of policies governing what it can access.
Policies are stored as JSON files on disk — editable by CLI tools and power users,
manageable via ui for everyone.

Default: allow reads, ask for writes/deletes.

## Policy Storage

### File Location

```
~/.keepai/server/agents/<agent-pubkey>/policies/<service>.json
```

Agent pubkey (hex) is used as the directory name — always unique, filesystem-safe,
and matches the `agent_pubkey` field in the DB.

Example:
```
~/.keepai/server/agents/a1b2c3d4.../policies/gmail.json
~/.keepai/server/agents/a1b2c3d4.../policies/notion.json
~/.keepai/server/agents/e5f6a7b8.../policies/gmail.json
```

### Policy File Format

```json
{
  "default": "ask",
  "rules": [
    {
      "operations": ["read"],
      "action": "allow"
    },
    {
      "operations": ["write"],
      "action": "ask"
    },
    {
      "operations": ["delete"],
      "action": "deny"
    }
  ]
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `default` | `"allow" \| "deny" \| "ask"` | Fallback if no rule matches |
| `rules` | `Rule[]` | Ordered list of rules (first match wins) |
| `rules[].operations` | `string[]` | Operation types: `"read"`, `"write"`, `"delete"` |
| `rules[].action` | `"allow" \| "deny" \| "ask"` | What to do when matched |
| `rules[].methods` | `string[]` | (Optional) Specific method names, e.g. `["messages.send"]` |
| `rules[].accounts` | `string[]` | (Optional) Specific account IDs |

### Default Policy (created on agent pairing)

```json
{
  "default": "ask",
  "rules": [
    {
      "operations": ["read"],
      "action": "allow"
    },
    {
      "operations": ["write", "delete"],
      "action": "ask"
    }
  ]
}
```

This means: reads auto-allowed, writes and deletes require user approval.

### Examples

**Fully trusted agent (allow everything):**
```json
{
  "default": "allow",
  "rules": []
}
```

**Read-only agent (deny all writes):**
```json
{
  "default": "deny",
  "rules": [
    {
      "operations": ["read"],
      "action": "allow"
    }
  ]
}
```

**Allow reads, allow specific writes, ask for rest:**
```json
{
  "default": "ask",
  "rules": [
    {
      "operations": ["read"],
      "action": "allow"
    },
    {
      "operations": ["write"],
      "methods": ["drafts.create"],
      "action": "allow"
    }
  ]
}
```

**Per-account policy:**
```json
{
  "default": "deny",
  "rules": [
    {
      "operations": ["read"],
      "accounts": ["work@gmail.com"],
      "action": "allow"
    }
  ]
}
```

## Policy Engine

```typescript
class PolicyEngine {
  private dataDir: string;  // ~/.keepai/server

  // Evaluate a request against policies
  evaluate(agentPubkey: string, metadata: PermissionMetadata): PolicyDecision {
    const policy = this.loadPolicy(agentPubkey, metadata.service);
    return this.match(policy, metadata);
  }

  // Load policy from disk (with caching + file watcher for live updates)
  private loadPolicy(agentPubkey: string, service: string): Policy {
    const path = `${this.dataDir}/agents/${agentPubkey}/policies/${service}.json`;
    // Read file, parse JSON, validate schema
    // If file doesn't exist, return default policy
    // Cache with file mtime check for invalidation
  }

  // Match request against policy rules
  private match(policy: Policy, metadata: PermissionMetadata): PolicyDecision {
    for (const rule of policy.rules) {
      if (this.ruleMatches(rule, metadata)) {
        return rule.action;  // "allow" | "deny" | "ask"
      }
    }
    return policy.default;
  }

  private ruleMatches(rule: PolicyRule, metadata: PermissionMetadata): boolean {
    // Check operation type
    if (!rule.operations.includes(metadata.operationType)) return false;

    // Check specific methods (if rule specifies them)
    if (rule.methods && !rule.methods.includes(metadata.method)) return false;

    // Check specific accounts (if rule specifies them)
    if (rule.accounts && !rule.accounts.includes(metadata.accountId)) return false;

    return true;
  }

  // Save policy (from ui or CLI)
  savePolicy(agentPubkey: string, service: string, policy: Policy): void {
    const path = `${this.dataDir}/agents/${agentPubkey}/policies/${service}.json`;
    // Validate policy schema
    // Write atomically (temp file + rename)
    // Invalidate cache
  }

  // Create default policies for a new agent
  createDefaults(agentPubkey: string, services: string[]): void {
    for (const service of services) {
      this.savePolicy(agentPubkey, service, DEFAULT_POLICY);
    }
  }
}

type PolicyDecision = "allow" | "deny" | "ask";
```

## Request Evaluation Flow

```
RPC Request arrives
        │
        ▼
ConnectorExecutor.extractPermMetadata()
→ { service: "gmail", accountId: "user@gmail.com",
    method: "messages.send", operationType: "write",
    description: "Send email to bob@example.com" }
        │
        ▼
PolicyEngine.evaluate(agentPubkey, metadata)
        │
        ├─── "allow" ──► Execute immediately
        │
        ├─── "deny"  ──► Return error: permission_denied
        │
        └─── "ask"   ──► Enter approval flow
                              │
                              ▼
                         ApprovalQueue.enqueue()
                         1. Write request to temp file
                         2. Hash temp file (SHA-256)
                         3. Store in DB: { id, hash, metadata, status: "pending" }
                         4. Emit SSE: "approval_request"
                         5. Emit desktop notification (if electron)
                              │
                              ▼
                         Poll DB every 500ms for status change
                         (or timeout after 5 min → error: approval_timeout)
                              │
                              ▼
                         User clicks [Approve] (via UI, or future Telegram/Slack)
                         1. Read temp file, verify hash matches DB
                         2. Update DB: status = "approved"
                              │
                              ▼
                         RPC handler's next poll sees status != "pending"
                         → Execute request (or return error if denied)
                         Log to audit
                         Return response
```

## Approval Queue Details

### Database Schema

```sql
CREATE TABLE approval_queue (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  service TEXT NOT NULL,
  method TEXT NOT NULL,
  account_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  temp_file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, denied, expired
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT,  -- 'user', 'timeout'
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Temp File Security

The temp file + hash pattern prevents a compromised process from modifying the
request between policy check and execution:

1. Request JSON written to `~/.keepai/server/temp/<request_id>.json`
2. SHA-256 hash computed and stored in DB
3. On approval, file is re-read and hash verified
4. If hash mismatch → reject with `internal_error`, log alert

This is defense-in-depth for a future scenario where the trusted device is partially
compromised (e.g., another process has write access to temp dir).

### Approval UI Card

ui shows each pending approval as a card:

```
┌──────────────────────────────────────────────────┐
│  🤖 openclaw wants to send an email              │
│                                                  │
│  Service: Gmail                                  │
│  Account: user@gmail.com                         │
│  Action:  Send email to bob@example.com          │
│  Subject: "Meeting tomorrow"                     │
│                                                  │
│  Waiting: 45s                                    │
│                                                  │
│  [▼ Show full request]                           │
│                                                  │
│  [  Deny  ]                    [ ✓ Approve ]     │
└──────────────────────────────────────────────────┘
```

## Policy File Watching

PolicyEngine watches policy files for changes (via fs.watch or polling):
- When a file is modified externally (e.g., user edits with vim), cache is invalidated
- Next policy evaluation reads fresh file
- This enables CLI-based policy management alongside ui

## Integration with keepd

In keepd's request processing pipeline:

```typescript
// In the RPC request handler
async function handleServiceRequest(
  agent: Agent,
  request: RPCRequest,
  executor: ConnectorExecutor,
  policyEngine: PolicyEngine,
  approvalQueue: ApprovalQueue,
  auditLogger: AuditLogger
): Promise<RPCResponse> {
  // 1. Extract permission metadata
  const meta = executor.extractPermMetadata(
    request.service, request.method, request.params, request.account
  );

  // 2. Check policy
  const decision = policyEngine.evaluate(agent.agentPubkey, meta);

  if (decision === "deny") {
    auditLogger.log({ ...meta, agent, decision, approved: false });
    return { id: request.id, error: { code: "permission_denied", message: "..." } };
  }

  if (decision === "ask") {
    // Writes to DB + emits SSE, then polls DB every 500ms until
    // status changes or timeout (5 min). DB is the source of truth —
    // approval can come from UI, future Telegram/Slack, or any channel
    // that writes to the approval_queue table.
    const result = await approvalQueue.requestApproval(agent, meta, request);
    if (result === "denied" || result === "expired") {
      auditLogger.log({ ...meta, agent, decision, approved: false });
      const code = result === "expired" ? "approval_timeout" : "permission_denied";
      return { id: request.id, error: { code, message: "..." } };
    }
  }

  // 3. Execute
  try {
    const result = await executor.execute(
      request.service, request.method, request.params, request.account
    );
    auditLogger.log({ ...meta, agent, decision, approved: true, status: "success" });
    return { id: request.id, result };
  } catch (err) {
    auditLogger.log({ ...meta, agent, decision, approved: true, status: "error", error: err });
    return { id: request.id, error: classifyError(err) };
  }
}
```

## Future Extensions (Not V1)

- **Resource-level policies**: "only allow reading emails from @company.com"
- **Rate limiting**: "max 100 requests per hour per agent"
- **Spending limits**: "max $X of API usage per day"
- **Approval memory**: "remember this approval for 1 hour" (reduces notification fatigue)
- **Telegram/Slack approval channel**: alternative to desktop UI
- **Policy templates**: pre-built policies like "read-only", "full-trust", "cautious"
