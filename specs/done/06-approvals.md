# Approvals Page (Current State)

**Route:** `/approvals`

## Purpose
Full approval queue — shows all pending agent requests that require manual user approval. The user can approve or deny each request.

## Why It Exists
When an agent makes a request that matches a policy rule with action `"ask"`, the request is queued here. This is the core security interaction: the user reviews what an agent wants to do and decides whether to allow it. This page is the dedicated, full-screen version of the approval preview shown on the dashboard.

## Main Focus
The list of pending approval cards. Each card shows enough context for the user to make an informed decision, with prominent Approve/Deny buttons.

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  Approvals                                                             |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Gmail icon] Gmail — gmail_send_draft                            |  |
|  | Send an email draft to recipient@example.com                     |  |
|  | Agent: my-assistant  Account: user@gmail.com    30s ago          |  |
|  |                                          [Approve]  [Deny]       |  |
|  | ────                                                             |  |
|  | > Request details                                                |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Notion icon] Notion — notion_create_page                        |  |
|  | Agent: code-reviewer  Account: workspace       2m ago            |  |
|  |                                          [Approve]  [Deny]       |  |
|  | ────                                                             |  |
|  | > Request details                                                |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  ── or if no pending approvals: ──                                     |
|                                                                        |
|             [ShieldCheck icon large]                                   |
|          No pending approvals                                          |
|    When an agent requests an action that                               |
|    requires approval, it will appear here.                             |
|                                                                        |
+------------------------------------------------------------------------+
```

## Elements & Actions

### Page Title
- "Approvals" (no action button — new approvals arrive via SSE)

### Approval Card (reusable `ApprovalCard` component)
Each card contains:

**Header row:**
- Service icon + "Service — method_name" (bold, truncated)
- Description text (if provided by the agent request)

**Metadata row:**
- Agent name
- Account ID
- Relative timestamp ("30s ago", "2m ago")

**Action buttons (right-aligned):**
- **Approve** — green button, calls `POST /api/queue/{id}/approve`
- **Deny** — red button, calls `POST /api/queue/{id}/deny`
- Both disable while either mutation is pending

**Expandable details (optional):**
- Only shown if `item.params` has content
- "Request details" toggle with chevron
- Expands to show full JSON of request params in a monospace `<pre>` block
- Max height 192px with scroll

### Empty State
- Large ShieldCheck icon + title + description
- No action button (approvals arrive automatically)

## Data Dependencies
- `useQueue()` — pending approval list (refetches every 5s + SSE invalidation)
- `useApproveRequest()` — mutation: approve
- `useDenyRequest()` — mutation: deny

## Notes
- After approve/deny, the queue query is invalidated and the card disappears
- SSE events `approval_request` and `approval_resolved` keep the list in sync across tabs
- The queue also updates the header badge count and Electron tray badge
- No filtering or sorting options currently — all pending items shown in server order
- No confirmation dialog for approve/deny — single click executes
