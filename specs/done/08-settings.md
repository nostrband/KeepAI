# Settings Page (Current State)

**Route:** `/settings`

## Purpose
System configuration and runtime status. Lets the user configure nostr relay URLs and approval timeout, and see basic system health metrics.

## Why It Exists
KeepAI communicates with remote agents via nostr relays — the user may need to change which relays are used. The approval timeout controls how long the system waits before auto-denying a pending request. The status section provides a quick health check.

## Main Focus
Configuration editing (relays + timeout). The status section is informational and read-only.

## UI Diagram

```
+------------------------------------------------------------------------+
| HEADER                                                                  |
+------------------------------------------------------------------------+
|                                                                        |
|  Settings                                                              |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | STATUS                                                           |  |
|  |                                                                  |  |
|  | Agents               3                                          |  |
|  | Connections           2                                          |  |
|  | Pending Approvals     1                                          |  |
|  | SSE Clients           1                                          |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | CONFIGURATION                                                    |  |
|  |                                                                  |  |
|  | Nostr Relay URLs                                                 |  |
|  | +--------------------------------------------------------------+ |  |
|  | | wss://relay.damus.io                                         | |  |
|  | | wss://relay.nostr.band                                       | |  |
|  | |                                                              | |  |
|  | +--------------------------------------------------------------+ |  |
|  | Comma-separated list of nostr relay URLs for agent communication |  |
|  |                                                                  |  |
|  | Approval Timeout (seconds)                                       |  |
|  | [300_______]                                                     |  |
|  | How long to wait for approval before timing out.                 |  |
|  | Default: 300 seconds (5 minutes).                                |  |
|  |                                                                  |  |
|  |                                                    [Save] Save   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | ABOUT                                                            |  |
|  |                                                                  |  |
|  | Version           0.1.0                                          |  |
|  | Project           KeepAI — Safe gate for AI agents               |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

## Elements & Actions

### Status Card (read-only)
- Section heading: "STATUS" (uppercase, muted)
- 2-column definition list:
  - Agents — count of paired agents
  - Connections — count of connected services
  - Pending Approvals — count of items in queue
  - SSE Clients — count of active event stream connections
- Data refreshes every 30 seconds (`refetchInterval: 30_000`)

### Configuration Card
- Section heading: "CONFIGURATION" (uppercase, muted)

**Nostr Relay URLs:**
- `<textarea>` (3 rows, monospace)
- Helper text: "Comma-separated list of nostr relay URLs for agent communication."
- Note: helper text says comma-separated but the textarea layout suggests one-per-line

**Approval Timeout:**
- `<input type="number">` (w-32)
- Helper text: "How long to wait for approval before timing out. Default: 300 seconds (5 minutes)."

**Save button:**
- Calls `PUT /api/config` with `{ relays, approvalTimeout }`
- Shows "Saving..." while pending

### About Card (read-only)
- Section heading: "ABOUT" (uppercase, muted)
- Version: 0.1.0 (hardcoded)
- Project: "KeepAI — Safe gate for AI agents" (hardcoded)

## Data Dependencies
- `useConfig()` — current config (relays, approvalTimeout)
- `useStatus()` — runtime stats (refetches every 30s)
- `useSaveConfig()` — mutation: save config

## Notes
- Relay format is ambiguous — textarea suggests newlines but helper says comma-separated
- Version is hardcoded, not read from package.json or server
- No restart/reload button for the daemon
- No validation on relay URLs or timeout value
- Config changes may require daemon restart to take effect (not indicated in UI)
