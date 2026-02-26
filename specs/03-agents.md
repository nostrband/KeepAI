# Agents Page (Current State)

**Route:** `/agents`

## Purpose
List all paired agents and create new agent pairings. This is the entry point for the agent management flow.

## Why It Exists
Agents are the remote AI processes that access user's services through KeepAI. This page lets the user see all agents they've authorized and initiate new pairings by generating a one-time code.

## Main Focus
The agent list — showing who is paired, their status, and when they were last active. The "Add agent" flow is secondary (modal dialog).

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  Agents                                            [+ Add agent]      |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | (M)  my-assistant                                     * Active   |  |
|  |      Paired 2/20/2026 — last seen 2/26/2026, 10:30 AM           |  |
|  +------------------------------------------------------------------+  |
|  +------------------------------------------------------------------+  |
|  | (C)  code-reviewer                                    * Active   |  |
|  |      Paired 2/22/2026 — last seen 2/25/2026, 3:00 PM            |  |
|  +------------------------------------------------------------------+  |
|  +------------------------------------------------------------------+  |
|  | (O)  old-bot                                          * Revoked  |  |
|  |      Paired 1/15/2026                                            |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  ── or if no agents: ──                                                |
|                                                                        |
|             [Bot icon large]                                           |
|          No agents paired                                              |
|    Pair an AI agent to allow it to                                     |
|    access your connected services securely.                            |
|            [+ Add an agent]                                            |
|                                                                        |
+------------------------------------------------------------------------+

=== Pairing Dialog (modal, step 1 — name input): ===

+----------------------------------------------+
|  Add Agent                                   |
|                                              |
|  Agent name                                  |
|  [my-assistant________________]              |
|                                              |
|                    [Cancel]  [Generate Code]  |
+----------------------------------------------+

=== Pairing Dialog (modal, step 2 — code display): ===

+----------------------------------------------+
|  Pairing Code                                |
|                                              |
|  Tell your agent to run this command:        |
|                                              |
|  +----------------------------------------+  |
|  | npx keepai init abc123def456    [Copy]  |  |
|  +----------------------------------------+  |
|                                              |
|  Waiting for agent to connect...             |
|  The pairing code expires in 5 minutes.      |
|                                              |
|                                     [Done]   |
+----------------------------------------------+
```

## Elements & Actions

### Page Header
- Title: "Agents"
- Action button: "+ Add agent" — opens pairing dialog modal

### Agent List
- Each row is a `<Link>` -> `/agents/:id`
- Shows: avatar circle (first letter of name), agent name, "Paired {date}" + optional "last seen {datetime}", StatusBadge (active/revoked)
- Hover: light background highlight

### Pairing Dialog (two-step modal)
**Step 1 — Name Input:**
- Text input for agent name, placeholder "e.g. my-assistant"
- Enter key submits
- Cancel button: closes modal
- "Generate Code" button: calls `POST /api/agents/new?name={name}`, receives `{ code, id }`

**Step 2 — Code Display:**
- Shows the command: `npx keepai init {code}` in a CodeBlock
- Copy button (top-right of code block): copies command to clipboard, shows checkmark for 2s
- Info text: "Waiting for agent to connect... The pairing code expires in 5 minutes."
- "Done" button: closes modal

### Empty State
- Large Bot icon + title + description + CTA button

## Data Dependencies
- `useAgents()` — list of all agents
- `useCreateAgent()` — mutation: create agent + get pairing code

## Notes
- The modal is a custom implementation (not Radix Dialog) — fixed overlay + centered card
- After agent pairs (via `pairing_completed` SSE event), the agents query is invalidated and the new agent appears in the list
- Currently no visual indication in the dialog that the agent has successfully connected — user must close and check the list
