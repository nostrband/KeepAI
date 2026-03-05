# 14 — OAuth Connection UX

## Problem

When the user clicks a service button (Gmail/GitHub/Notion) in the Connect App dialog:
1. The modal closes immediately
2. After a delay, the browser opens for OAuth authorization
3. No indication in the app that a connection is in progress
4. After authorizing in browser, "Connected" page shown but no feedback in desktop app
5. User returns to app — new connection row appears with no fanfare

## Solution

Replace the fire-and-forget flow with a multi-step stateful dialog that guides the user through the entire OAuth lifecycle.

## Dialog States

```
select -> redirecting -> waiting -> connected
```

### 1. `select` (current screen)
- Service picker: Gmail, GitHub, Notion buttons
- On click: set `pendingService`, transition to `redirecting`

### 2. `redirecting`
- Service icon + "Connecting to <Service>"
- Text: "You will be redirected to your browser to authorize on <Service>"
- Fires `connectMutation.mutateAsync(service)` to get `authUrl`
- On success: open browser, transition to `waiting`
- On error: show error, allow retry or close
- X button to dismiss

### 3. `waiting`
- Spinner + "Please confirm the connection in your browser"
- X button to dismiss (stores `pendingService` so re-show works)

### 4. `connected`
- Green `CheckCircle2` icon + "<Service> Connected"
- Same visual pattern as agent pairing success in `add-agent-dialog.tsx`
- "Done" button to close

## Re-show Behavior

If user dismisses during `redirecting`/`waiting` and the OAuth callback completes:
- Parent watches `useConnections()` list via `useEffect`
- When a new connection appears for `pendingService`, re-open dialog in `connected` state
- Clear `pendingService` when dialog is closed from `connected` state

## System Notification

Native OS notification (Electron `Notification`) when OAuth completes, matching the pattern used for approval requests. Triggered from Electron main process SSE listener on `connection_updated` event with `action === 'connected'`.

## File Changes

### `apps/ui/src/components/connect-app-dialog.tsx`
Rewrite to 4-step state machine. New props:
- `pendingService?: string | null` — when set, forces dialog open in `connected` state
- `onConnected?: (service: string) => void` — called when connection completes (parent fires notification)
- `onPendingService?: (service: string | null) => void` — reports pending service to parent for re-show tracking

### `apps/ui/src/hooks/use-oauth-flow.ts` (new)
Shared hook for both `connections.tsx` and `dashboard.tsx`:
- Manages `pendingService` state
- Watches connections list for new entries matching `pendingService`
- Fires system notification via `window.electronAPI?.showNotification()`
- Returns `{ showDialog, pendingService, openDialog, closeDialog, connectedService }`

### `apps/ui/src/pages/connections.tsx`
Replace manual `showDialog` state with `useOAuthFlow()` hook.

### `apps/ui/src/pages/dashboard.tsx`
Same — use `useOAuthFlow()` hook.

### `apps/electron/src/main.ts`
Add `connection_updated` handler in `handleSSEEvent()`:
```ts
if (event === 'connection_updated') {
  const data = JSON.parse(dataStr);
  if (data.action === 'connected' && Notification.isSupported()) {
    new Notification({
      title: 'KeepAI',
      body: `${data.serviceName || data.service} connected`,
      icon: path.join(__dirname, '..', 'build', 'icon.png'),
    }).show();
  }
}
```

### `apps/keepd/src/routes/connections.ts`
Add `serviceName` to SSE broadcast:
```ts
sse?.broadcast('connection_updated', { service, serviceName, action: 'connected' });
```
