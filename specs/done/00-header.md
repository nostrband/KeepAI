# Header / Navigation (Current State)

## Purpose
Global navigation bar present on every page. Provides branding, page switching, and a persistent notification badge for pending approvals.

## Why It Exists
The header is the only navigation mechanism. Without a sidebar or tab bar, the hamburger dropdown is the sole way to move between pages. The approval badge ensures time-sensitive approval requests are visible from any page.

## UI Diagram

```
+------------------------------------------------------------------------+
| KeepAI                                    [Shield 3]  [= Menu]         |
+------------------------------------------------------------------------+
                                                  ^          ^
                                                  |          |
                                          Approval badge   Hamburger
                                          (only if > 0)   dropdown

Dropdown (on Menu click):
+--------------------+
| > Dashboard        |
|   Connections      |
|   Agents           |
|   Approvals   [3]  |
|   Logs             |
| ────────────────── |
|   Settings         |
+--------------------+
```

## Elements

### Logo ("KeepAI")
- Text link, navigates to `/` (Dashboard)
- `text-lg font-semibold`

### Approval Badge
- Only visible when `pendingCount > 0`
- Shield icon + blue pill with count
- Clicking navigates to `/approvals`

### Hamburger Menu
- Radix `DropdownMenu`, opens on click
- 5 main nav items + separator + Settings
- Current page highlighted with `bg-accent font-medium`
- Approvals item shows badge pill inline when count > 0

## Navigation Items
| Label       | Route          | Icon          |
|-------------|----------------|---------------|
| Dashboard   | `/`            | LayoutDashboard |
| Connections | `/connections` | Plug          |
| Agents      | `/agents`      | Bot           |
| Approvals   | `/approvals`   | ShieldCheck   |
| Logs        | `/logs`        | ScrollText    |
| Settings    | `/settings`    | Settings      |

## Data Dependencies
- `useQueue()` — polls pending approvals every 5s for badge count
