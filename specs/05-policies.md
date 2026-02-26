# Policies Page (Current State)

**Route:** `/agents/:agentId/policies`

## Purpose
Edit per-service access policies for a specific agent. Policies control what each agent is allowed to do: auto-allow, auto-deny, or require manual approval.

## Why It Exists
The core security feature of KeepAI. Without policies, every request would need manual approval. Policies let users define rules like "allow all reads, ask for writes, deny deletes" per service, per agent.

## Main Focus
The visual policy editor — one card per connected service, each with a default action selector and a list of operation-specific rules. A raw JSON editor is available as an alternative.

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  <- Back to my-assistant                                               |
|                                                                        |
|  Policies for my-assistant                                             |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Gmail icon] Gmail                               [Raw JSON]      |  |
|  |                                                                  |  |
|  | ── Visual Mode: ──                                               |  |
|  |                                                                  |  |
|  | Default action:      [v Allow v]                                 |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | read:              [v Allow v]                              |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | write:             [v Ask   v]                              |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | delete:            [v Ask   v]                              |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  |                                  [Rotate] Reset   [Save] Save   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Notion icon] Notion                             [Raw JSON]      |  |
|  |                                                                  |  |
|  | Default action:      [v Ask   v]                                 |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | read:              [v Allow v]                              |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | write:             [v Ask   v]                              |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | delete:            [v Ask   v]                              |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  |                                  [Rotate] Reset   [Save] Save   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  ── or: "No services connected. Connect a service first ──            |
|      to configure policies."                                           |
|                                                                        |
+------------------------------------------------------------------------+

=== Raw JSON Mode (toggled per service): ===

+------------------------------------------------------------------+
| [Gmail icon] Gmail                                  [Visual]     |
|                                                                  |
| +--------------------------------------------------------------+ |
| | {                                                            | |
| |   "default": "allow",                                       | |
| |   "rules": [                                                | |
| |     { "operations": ["read"], "action": "allow" },          | |
| |     { "operations": ["write"], "action": "ask" },           | |
| |     { "operations": ["delete"], "action": "ask" }           | |
| |   ]                                                          | |
| | }                                                            | |
| +--------------------------------------------------------------+ |
| Invalid JSON (shown if parse fails)                              |
|                                                  [Save] Save     |
+------------------------------------------------------------------+
```

## Elements & Actions

### Back Link
- "<- Back to {agent name}" — navigates to `/agents/:agentId`

### Page Title
- "Policies for {agent name}"

### Per-Service Policy Card
One card per connected service (derived from `useConnections()`):

**Header:**
- Service icon + service name (bold)
- "Raw JSON" / "Visual" toggle link (top right)

**Visual Mode:**
- Default action: `<select>` with Allow / Deny / Ask options
- Rules list: each rule shows operation name(s) + action `<select>`
  - Operations come from `rule.operations` or `rule.methods` arrays
  - Each rendered in a subtle background row
- Reset button: reverts to `DEFAULT_POLICY` (read=allow, write=ask, delete=ask)
- Save button: calls `PUT /api/agents/{agentId}/policies/{service}`

**Raw JSON Mode:**
- `<textarea>` (h-40, monospace) pre-filled with current policy JSON
- Error message if invalid JSON
- Save button: parses JSON, saves if valid

### Empty State
- Text: "No services connected. Connect a service first to configure policies."

## Data Dependencies
- `useAgent(agentId)` — agent name for breadcrumb and title
- `usePolicies(agentId)` — all policies (Record<service, policy>)
- `useConnections()` — determines which service cards to show
- `useSavePolicy()` — mutation: save policy for a specific service

## Default Policy Structure
```json
{
  "default": "ask",
  "rules": [
    { "operations": ["read"], "action": "allow" },
    { "operations": ["write"], "action": "ask" },
    { "operations": ["delete"], "action": "ask" }
  ]
}
```

## Notes
- The visual/raw toggle is a single `showRaw` state — toggling it affects all services at once (likely a bug — probably should be per-service)
- Reset only affects local state, does not save to server
- No "add rule" or "remove rule" functionality in visual mode — only edit existing rules
- The service list comes from connections, not from policies — if a policy exists for a service that's no longer connected, it won't show up here
