# Logs Page (Current State)

**Route:** `/logs`

## Purpose
Audit trail of all agent requests — both auto-processed (allowed/denied by policy) and manually approved/denied. Provides full visibility into what agents have been doing.

## Why It Exists
The user needs to see a history of all agent activity for security auditing, debugging, and understanding agent behavior. This is the only place to see completed/denied requests (the approvals page only shows pending ones).

## Main Focus
The data table — sortable columns showing time, service, method, agent, status, and duration. Each row can be expanded to see the full request/response JSON.

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  Logs                                              247 total entries   |
|                                                                        |
|  [Filter by service...] [Filter by agent...]                           |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | Time          | Service | Method              | Agent    | St | Dur |
|  |---------------------------------------------------------------|  |
|  | 2/26 10:30 AM | Gmail   | gmail_search_msgs   | my-asst  | OK | 45ms|
|  |---------------------------------------------------------------|  |
|  | 2/26 10:29 AM | Gmail   | gmail_read_message  | my-asst  | OK | 32ms|
|  |---------------------------------------------------------------|  |
|  | 2/26 10:28 AM | Gmail   | gmail_send_draft    | my-asst  | DN |  — |
|  |  +------------------------------------------------------------+  |  |
|  |  | {                                                          |  |  |
|  |  |   "id": "abc123",                                         |  |  |
|  |  |   "service": "gmail",                                     |  |  |
|  |  |   "method": "gmail_send_draft",                           |  |  |
|  |  |   "agent_name": "my-asst",                                |  |  |
|  |  |   "response_status": "denied",                            |  |  |
|  |  |   ...                                                     |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |---------------------------------------------------------------|  |
|  | 2/26 10:25 AM | Notion  | notion_search       | code-rev | OK |120ms|
|  |---------------------------------------------------------------|  |
|  | ...                                                           |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  [<- Previous]          1-50 of 247          [Next ->]                 |
|                                                                        |
|  ── or if no logs: ──                                                  |
|                                                                        |
|             [ScrollText icon large]                                    |
|           No log entries                                               |
|    Request logs will appear here once                                  |
|    agents start making requests.                                       |
|                                                                        |
+------------------------------------------------------------------------+
```

## Elements & Actions

### Page Header
- Title: "Logs"
- Total count: "{N} total entries" (right-aligned, muted)

### Filters
- Service filter: text input, placeholder "Filter by service..."
- Agent filter: text input, placeholder "Filter by agent..."
- Both reset pagination to offset 0 on change
- Currently plain text inputs (not dropdowns) — user types service/agent name

### Data Table
- Columns: Time | Service | Method | Agent | Status | Duration | expand chevron
- **Time:** formatted datetime, small text, nowrap
- **Service:** icon + name
- **Method:** monospace, small text
- **Agent:** agent name or "—"
- **Status:** color-coded text — green for "success", red for "denied", yellow for other
- **Duration:** "Nms" or "—"
- **Expand:** chevron down/up icon
- Rows are clickable — clicking toggles expanded detail view
- Expanded view: full JSON of the log entry in a `<pre>` block with gray background

### Pagination
- Shown only when `total > limit` (default limit = 50)
- Previous / Next buttons (disabled at boundaries)
- Center: "{offset+1}-{min(offset+limit, total)} of {total}"

### Empty State
- Large ScrollText icon + title + description

## Data Dependencies
- `useLogs(filters)` — returns `{ entries, total }` with filters: service, agent, limit, offset

## Query Parameters
- `/logs?agent={agentId}` — pre-filter by agent (linked from agent detail page)
  - **Note:** The URL query param is not currently read — the filter only uses local state. This is a bug.

## Notes
- Missing `key` prop on the React fragment wrapping table rows (the `<>` around `<tr>` and expanded `<tr>`) — React warning in dev
- Filter inputs are raw text, not select dropdowns — user must know exact service/agent names
- No date range filter
- No sorting — entries come in server default order (newest first presumably)
- No export/download functionality
