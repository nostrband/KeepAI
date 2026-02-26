# Dashboard Page (Current State)

**Route:** `/`

## Purpose
Overview page showing a summary of the three main entities: pending approvals, connected services, and paired agents. It's the landing page after login.

## Why It Exists
Gives the user a quick glance at what needs attention (approvals) and the current state of their setup (which services are connected, which agents are paired). Saves the user from visiting three separate pages to get basic status.

## Main Focus
Pending approvals are the most time-sensitive — they appear at the top (conditionally, only when there are any). Connected services and paired agents are always shown below.

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  [Shield] Pending Approvals                          View all ->       |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Gmail icon] Gmail — gmail_search_messages                       |  |
|  | Agent: my-assistant   Account: user@gmail.com        12s ago     |  |
|  |                                          [Approve]  [Deny]       |  |
|  | > Request details                                                |  |
|  +------------------------------------------------------------------+  |
|  +------------------------------------------------------------------+  |
|  | [Gmail icon] Gmail — gmail_send_draft                            |  |
|  | Agent: my-assistant   Account: user@gmail.com         1m ago     |  |
|  |                                          [Approve]  [Deny]       |  |
|  +------------------------------------------------------------------+  |
|  (max 3 cards shown, "+N more" link if > 3)                           |
|                                                                        |
|  ───────────────────────────────────────────────────────────────────   |
|                                                                        |
|  [Plug] Connected Services                         + Connect ->        |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Gmail] user@gmail.com                                           |  |
|  |         Gmail                                    * Connected     |  |
|  +------------------------------------------------------------------+  |
|  +------------------------------------------------------------------+  |
|  | [Notion] workspace-name                                          |  |
|  |          Notion                                  * Connected     |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  ── or if no connections: ──                                           |
|                                                                        |
|        No services connected                                           |
|        Connect Gmail or Notion to get started.                         |
|                      [+ Connect a service]                             |
|                                                                        |
|  ───────────────────────────────────────────────────────────────────   |
|                                                                        |
|  [Bot] Paired Agents                               + Add agent ->     |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | (M)  my-assistant                                                |  |
|  |      Last seen 2/26/2026, 10:30 AM                * Active      |  |
|  +------------------------------------------------------------------+  |
|  +------------------------------------------------------------------+  |
|  | (C)  code-reviewer                                               |  |
|  |      Never connected                              * Active      |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  ── or if no agents: ──                                                |
|                                                                        |
|        No agents paired                                                |
|        Pair an AI agent to allow it to access your services.           |
|                       [+ Add an agent]                                 |
|                                                                        |
+------------------------------------------------------------------------+
```

## Elements & Actions

### Section: Pending Approvals (conditional — hidden when empty)
- Shows up to 3 `ApprovalCard` components
- Each card has Approve / Deny buttons (inline actions)
- "View all" link -> `/approvals`
- "+N more" link if more than 3 -> `/approvals`

### Section: Connected Services
- Header: icon + title + "+ Connect" link -> `/connections`
- Each connection is a clickable row -> `/connections`
- Shows: service icon, account ID, service name, StatusBadge (connected/error)
- Empty state: title + description + "Connect a service" button -> `/connections`

### Section: Paired Agents
- Header: icon + title + "+ Add agent" link -> `/agents`
- Each agent is a clickable row -> `/agents/:id`
- Shows: avatar (first letter), name, last seen, StatusBadge (active/revoked)
- Empty state: title + description + "Add an agent" button -> `/agents`

## Data Dependencies
- `useConnections()` — list of connected service accounts
- `useAgents()` — list of paired agents
- `useQueue()` — pending approval requests
- `useApproveRequest()` / `useDenyRequest()` — mutations for approval cards
