# Connections Page (Current State)

**Route:** `/connections`

## Purpose
Manage OAuth connections to external services (Gmail, Notion). Users can connect new services, test existing connections, and disconnect accounts.

## Why It Exists
KeepAI acts as a credential vault — agents never see raw OAuth tokens. This page is where the user sets up and maintains the service accounts that agents can access through KeepAI.

## Main Focus
The list of currently connected accounts, with the ability to add new ones. Each connection shows its health status and provides test/disconnect actions.

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  Connections                                   [+ Connect service]     |
|                                                                        |
|  ── Service Picker (shown on button click, inline panel): ──          |
|  +------------------------------------------------------------------+  |
|  | Choose a service to connect:                                     |  |
|  |                                                                  |  |
|  | [Gmail icon] Gmail     [Notion icon] Notion                      |  |
|  |                                                                  |  |
|  | Cancel                                                           |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  ── Connection List: ──                                                |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | [Gmail]  user@gmail.com                                          |  |
|  |          Gmail — last used 2/26/2026, 9:15 AM                    |  |
|  |                                    * Connected   [Spin] [Trash]  |  |
|  +------------------------------------------------------------------+  |
|  +------------------------------------------------------------------+  |
|  | [Notion] workspace-name                                          |  |
|  |          Notion                                                  |  |
|  |                                    * Connected   [Spin] [Trash]  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  ── or if no connections: ──                                           |
|                                                                        |
|             [Plug icon large]                                          |
|        No services connected                                           |
|    Connect Gmail or Notion to allow                                    |
|    your AI agents to access them.                                      |
|          [+ Connect a service]                                         |
|                                                                        |
+------------------------------------------------------------------------+
```

## Elements & Actions

### Page Header
- Title: "Connections"
- Action button: "+ Connect service" — toggles service picker panel

### Service Picker (conditional inline panel)
- Shown when "Connect service" is clicked
- Two buttons: Gmail, Notion (hardcoded `AVAILABLE_SERVICES`)
- On click: calls `POST /api/connections/{service}/connect`, receives OAuth URL
- Opens URL in system browser (Electron) or new tab (web)
- "Cancel" link dismisses the picker

### Connection List
- Each connection row shows:
  - Service icon (left)
  - Account ID (bold) + service name + last used timestamp
  - StatusBadge: "Connected" (green) or "Error" (red)
  - Test button (RefreshCw icon) — calls `POST /api/connections/{service}/{accountId}/check`. Spins while loading.
  - Disconnect button (Trash2 icon) — `confirm()` dialog, then `DELETE /api/connections/{service}/{accountId}`. Red hover.

### Empty State
- Large Plug icon + title + description + CTA button

## Data Dependencies
- `useConnections()` — list of connections
- `useConnectService()` — mutation: initiate OAuth flow
- `useDisconnectService()` — mutation: remove connection
- `useCheckConnection()` — mutation: test connection health

## Notes
- OAuth callback is handled server-side (keepd). After the user authorizes in the browser, the connection appears in the list via SSE event `connection_updated` which invalidates the query cache.
- No inline feedback on check success/failure currently — just the spinning icon state.
