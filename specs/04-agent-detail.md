# Agent Detail Page (Current State)

**Route:** `/agents/:agentId`

## Purpose
Show all information about a single agent: metadata, policy summary, and recent activity. Allows revoking the agent.

## Why It Exists
After selecting an agent from the list, the user needs a place to see the full profile — when it was created, its cryptographic identity, what policies govern it, and what it's been doing recently. It's also the only place to revoke an agent.

## Main Focus
Agent identity and status at the top, followed by policies and recent activity. The revoke action is available but intentionally secondary (outline destructive button).

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  <- Back to agents                                                     |
|                                                                        |
|  (M) my-assistant                                [Trash] Revoke        |
|      * Active                                                          |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | DETAILS                                                          |  |
|  |                                                                  |  |
|  | Agent ID        a1b2c3d4e5f6...                                  |  |
|  | Public Key      npub1abc123def456...                              |  |
|  | Paired          2/20/2026, 10:00 AM                              |  |
|  | Last Seen       2/26/2026, 10:30 AM                              |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Shield] POLICIES                            Edit policies ->    |  |
|  |                                                                  |  |
|  |  [Gmail icon] Gmail                          default: allow      |  |
|  |  [Notion icon] Notion                        default: ask        |  |
|  |                                                                  |  |
|  |  ── or: "No policies configured." ──                             |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Activity] RECENT ACTIVITY                   View all ->         |  |
|  |                                                                  |  |
|  |  [Gmail] gmail_search_messages  success  45ms  2/26, 10:30 AM   |  |
|  |  [Gmail] gmail_read_message     success  32ms  2/26, 10:29 AM   |  |
|  |  [Gmail] gmail_send_draft       denied         2/26, 10:28 AM   |  |
|  |  ...                                                             |  |
|  |                                                                  |  |
|  |  ── or: "No requests yet." ──                                    |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

## Elements & Actions

### Back Link
- "<- Back to agents" — navigates to `/agents`

### Agent Header
- Avatar circle (large, 48px) with first letter
- Agent name (h1, bold)
- StatusBadge below name
- Revoke button (top right): outline destructive style, `confirm()` dialog, calls `DELETE /api/agents/{agentId}`, navigates to `/agents` on success
- Revoke button hidden if agent is already revoked

### Details Card
- Section heading: "DETAILS" (uppercase, muted)
- 2-column definition list:
  - Agent ID — mono, truncated
  - Public Key — mono, truncated
  - Paired — formatted datetime
  - Last Seen — formatted datetime or "Never"

### Policies Card
- Section heading: "POLICIES" with Shield icon
- "Edit policies" link -> `/agents/:agentId/policies`
- Lists each service with icon + name + default action label
- Each service row has subtle background (`bg-accent/30`)
- Shows "No policies configured." if empty

### Recent Activity Card
- Section heading: "RECENT ACTIVITY" with Activity icon
- "View all" link -> `/logs?agent={agentId}`
- Shows last 10 log entries (compact rows):
  - Service icon + method (mono) + status badge (green/red) + duration (ms) + timestamp
- Shows "No requests yet." if empty

## Data Dependencies
- `useAgent(agentId)` — single agent details
- `usePolicies(agentId)` — all policies for this agent
- `useLogs({ agent: agentId, limit: '10' })` — recent activity
- `useRevokeAgent()` — mutation: revoke agent

## Navigation From Here
- Back to agents list: `/agents`
- Edit policies: `/agents/:agentId/policies`
- View all logs: `/logs?agent={agentId}`
