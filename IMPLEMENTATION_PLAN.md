# KeepAI Implementation Plan

> **Goal**: Simple, lovable, complete v1 — a safe gate for AI agents to access user services (Gmail, Notion) via e2e encrypted nostr RPC.
>
> **Status**: Phase 7 complete. React SPA with all pages, TanStack Query hooks, SSE real-time updates, Tailwind + Radix components.

---

## Phase 1: Monorepo Foundation ✅
> Get the build toolchain working so all packages can compile.

- [x] **Root config files** — `package.json` (npm workspaces), `turbo.json`, `tsconfig.base.json`, `.gitignore`
- [x] **packages/proto scaffold** — `package.json`, `tsconfig.json`, `src/index.ts`
- [x] **packages/db scaffold** — `package.json`, `tsconfig.json`, `tsup.config.ts` (with better-sqlite3 external)
- [x] **packages/connectors scaffold** — `package.json`, `tsconfig.json`, `tsup.config.ts` (with secrets.build.json injection)
- [x] **packages/nostr-rpc scaffold** — `package.json`, `tsconfig.json`, `tsup.config.ts`
- [x] **apps/keepd scaffold** — `package.json`, `tsconfig.json`, `tsup.config.ts` (with secrets injection)
- [x] **apps/keepai scaffold** — `package.json`, `tsconfig.json`, `tsup.config.ts` (dual ESM+CJS, CLI shebang)
- [x] **apps/ui scaffold** — `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` (frontend+electron build modes)
- [x] **apps/electron scaffold** — `package.json`, `esbuild.main.mjs`, `electron-builder.yml` (at repo root)
- [x] **Verify `turbo build` succeeds** — all 8 packages build clean, 7.8s total

## Phase 2: Shared Types & Database ✅
> Build the leaf packages everything else depends on.

- [x] **proto: types** — `RPCRequest`, `RPCResponse`, `RPCError`, `PermissionMetadata`, `PolicyDecision`, `Policy`, `PolicyRule`, connector interfaces (`Connector`, `ConnectorMethod`, `ParamSchema`, `OAuthCredentials`), DB row types (`Agent`, `PendingPairing`, `Connection`, `RpcRequest`, `ApprovalEntry`, `AuditEntry`), `PairingCode`, `SSEEventType`
- [x] **proto: errors** — `ClassifiedError`, `AuthError`, `PermissionError`, `NetworkError`, `LogicError`, `InternalError`, `classifyHttpError`, `classifyFileError`, `ensureClassified`, `isClassifiedError`, `isErrorType`
- [x] **proto: constants** — `EVENT_KINDS`, `PROTOCOL_VERSION`, `SOFTWARE_VERSION`, `DEFAULT_RELAYS`, `TIMEOUTS`, `DEFAULT_POLICY`, `EXIT_CODES`, `CLEANUP`
- [x] **db: KeepDB class** — WAL + foreign_keys + `user_version` migration runner
- [x] **db: migration v1** — All 7 tables + indexes
- [x] **db: AgentStore** — create, getById, getByPubkey, getByKeepdPubkey, getByName, list, updateLastSeen, revoke, delete
- [x] **db: PairingStore** — create, getBySecret, getByKeepdPubkey, list, delete, expireOld
- [x] **db: ConnectionStore** — upsert, getById, listByService, listAll, updateStatus, updateLastUsed, delete
- [x] **db: RpcRequestStore** — tryInsert (dedup by event_id), updateStatus, cleanupOld
- [x] **db: ApprovalStore** — create, getById, listPending, resolve, expireOld, cleanupResolved
- [x] **db: AuditStore** — log, list (with filters), count (with filters), cleanupOld
- [x] **db: SettingsStore** — get, set, delete, getAll
- [x] **db: KeepDBApi facade** — composes all 7 stores
- [x] **Tests** — 54 tests passing (28 proto + 26 db)

## Phase 3: Nostr RPC ✅
> The core communication layer between agents and daemon.

- [x] **nostr-rpc: nip44-v3 encryption** — copied from ../keep.ai, version 0x3, 4-byte payload size, ~1MB max
- [x] **nostr-rpc: PeerEncryption** — wraps nip44-v3 with cached conversation key, encrypt/decrypt/encryptJSON/decryptJSON
- [x] **nostr-rpc: transport** — `NostrTransport` wrapping SimplePool (publish, publishEvent with signing, subscribe, close)
- [x] **nostr-rpc: pairing** — `generatePairingCode()` (base64url encode), `parsePairingCode()` (with validation), `generateKeypair()`, `generateSecret()`, `isProtocolCompatible()`
- [x] **nostr-rpc: rpc-caller** — `RPCCaller.call(method, params)` → publish REQUEST, subscribe for READY/REJECT/RESPONSE, timeout handling. `RPCCallError` class.
- [x] **nostr-rpc: rpc-handler** — `RPCHandler.listen(pubkeys)` → subscribe for REQUEST events, decrypt, protocol version check, dedup via callback, route to handler, send RESPONSE/REJECT. `updateSubscription()` for dynamic changes.
- [x] **proto: sub-path exports** — added `./types.js`, `./constants.js`, `./errors.js` sub-path exports with multi-entry tsup build
- [x] **Tests** — 28 tests (NIP-44 round-trip, PeerEncryption bidirectional, pairing encode/decode/validation, keypair/secret generation, protocol compatibility)
- **Note**: Streaming (StreamWriter/StreamReader) deferred — V1 uses inline request/response only. Can add in V2.

## Phase 4: Connectors (Gmail + Notion) ✅
> OAuth + service execution. OAuth infrastructure adapted from ../keep.ai, new connector method registries.

- [x] **connectors: OAuth types** — `types.ts` with ConnectionId, OAuthConfig, OAuthCredentials, Connection, ServiceDefinition, TokenResponse, ConnectionDb interface; `parseConnectionId()`/`formatConnectionId()` helpers
- [x] **connectors: OAuthHandler** — auth URL generation, code exchange, token refresh, token revocation; `tokenResponseToCredentials()` with metadata extraction; `classifyOAuthError()` for proper error classification
- [x] **connectors: CredentialStore** — file-based storage at `{basePath}/connectors/{service}/{encodedAccountId}.json`; atomic writes via tmp file + rename; 0o600 permissions; base64url account ID encoding; save/load/delete/exists/listByService/listAll
- [x] **connectors: ConnectionManager** — OAuth flow orchestration (startOAuthFlow, completeOAuthFlow); credential management with auto-refresh and dedup; CSRF state protection with TTL + cleanup; reconcile file↔DB state; disconnect with optional token revocation; redirect URI validation (localhost only)
- [x] **connectors: db-adapter** — `ConnectionDbAdapter` bridging snake_case DB (via `DbConnectionStore` interface) to camelCase API (`ConnectionDb` interface)
- [x] **connectors: credentials** — `getGoogleCredentials()`, `getNotionCredentials()`, `getCredentialsForService()`, `hasCredentialsForService()`; build-time injection via `__GOOGLE_*`/`__NOTION_*` + env var override
- [x] **connectors: Google service def** — `gmailService` with Google OAuth config (scopes: gmail.modify + userinfo.email), `fetchGoogleProfile()`, profile-based account ID extraction, display name extraction
- [x] **connectors: Notion service def** — `notionService` with Notion OAuth config (Basic auth, no refresh, no scopes), workspace_id-based account ID extraction
- [x] **connectors: Gmail connector** — 15 methods (messages.list/get/send/trash/modify, drafts.create/list/get/send, labels.list/get, threads.list/get/modify, profile.get); full param schemas with types, defaults, enums; human-readable descriptions; `buildRawEmail()` for email composition
- [x] **connectors: Notion connector** — 8 methods (databases.query/retrieve, pages.create/retrieve/update, blocks.children.list/append, search); Notion API v2022-06-28; full param schemas
- [x] **connectors: ConnectorExecutor** — register, getConnector, getRegisteredServices, extractPermMetadata (validates service + method), execute, getHelp (all or per-service), getMethodHelp
- [x] **connectors: help text generation** — `help(method?)` on each connector returning ServiceHelp with method schemas, examples, descriptions
- [x] **Tests** — 42 tests (ConnectionId, OAuthHandler URL generation, tokenResponseToCredentials, CredentialStore CRUD + permissions, service definitions, Gmail 15-method connector, Notion 8-method connector, ConnectorExecutor registry)
- **Notes**: tsup config uses `external: ['@keepai/proto']` to avoid rootDir DTS issues; source imports use `@keepai/proto` (main barrel) not sub-path imports

## Phase 5: Daemon (keepd) ✅
> The central hub. Fastify HTTP API + nostr RPC handler + policy engine + approval queue.

- [x] **keepd: Fastify server** — `createServer()` on localhost:9090, CORS, `@fastify/static` for UI, SPA fallback for non-API routes
- [x] **keepd: connection routes** — GET /api/connections (list), GET /api/connections/services, POST /api/connections/:service/connect (start OAuth), GET /api/connections/:service/callback (OAuth callback with HTML response), DELETE /api/connections/:service/:accountId (disconnect), POST .../check (test connection)
- [x] **keepd: AgentManager** — createPairing (generates keypair + secret, encodes pairing code), completePairing (verifies secret, moves from pending_pairings to agents), getAgentByKeepdPubkey, getActiveKeepdPubkeys (agents + pending pairings), touchAgent, revokeAgent, cleanupExpiredPairings
- [x] **keepd: agent routes** — GET /api/agents (list), POST /api/agents/new?name=... (pairing code), GET /api/agents/:agentId (detail), DELETE /api/agents/:agentId (revoke + delete policies)
- [x] **keepd: PolicyEngine** — `evaluate(agentPubkey, metadata)` → allow/deny/ask; file-based policies at `{dataDir}/agents/{pubkey}/policies/{service}.json`; mtime-based cache; atomic writes with 0o600 perms; path traversal prevention; `createDefaults()` on pairing; `deleteAgentPolicies()` on revoke
- [x] **keepd: policy routes** — GET /api/agents/:agentId/policies (all), GET /api/agents/:agentId/policies/:service (one), PUT .../policies/:service (validate + save)
- [x] **keepd: ApprovalQueue** — write request to temp file → SHA-256 hash → DB insert → SSE emit → poll DB every 500ms → verify hash on approve → cleanup temp files; hash-verification-based tamper detection
- [x] **keepd: approval routes** — GET /api/queue (pending), POST /api/queue/:id/approve, POST /api/queue/:id/deny
- [x] **keepd: AuditLogger** — logs every request with agent info, metadata, policy action, approval status, response status, duration; filters by agent, service, date range
- [x] **keepd: log routes** — GET /api/logs with query params (agent, service, from, to, limit, offset); returns entries + total count
- [x] **keepd: SSE endpoint** — GET /api/events with text/event-stream, heartbeat every 30s, event types: approval_request, approval_resolved, pairing_completed, request_completed
- [x] **keepd: config/status routes** — GET/PUT /api/config (settings store), GET /api/status (agents count, connections count, pending approvals, SSE clients)
- [x] **keepd: RPCRouter** — full pipeline: getAgentKeys (agents + pending pairings) → handleRequest → route (pair/ping/help/service methods) → validate account → extractPermMetadata → policy check → approval flow → execute connector → audit → respond
- [x] **keepd: pairing flow** — POST /api/agents/new → keypair + secret → pending_pairings → subscription update; RPC "pair" → verify secret → create agent → default policies → SSE emit → subscription update
- [x] **keepd: cleanup jobs** — setInterval(5min): expire pairings, expire approvals, cleanup resolved approvals (7d), cleanup rpc_requests (1h), cleanup audit log (30d)
- [x] **keepd: server startup sequence** — 16-step: data dir → SQLite + migrate → CredentialStore → DbBridge → ConnectionManager (register services, reconcile) → ConnectorExecutor → SSE → AgentManager → PolicyEngine → ApprovalQueue → AuditLogger → RPCRouter → RPCHandler (listen) → Fastify (CORS, routes, static) → cleanup timer
- [x] **keepd: DB bridge** — `createDbBridge()` wrapping sync @keepai/db ConnectionStore in async DbConnectionStore for ConnectionManager; handles JSON metadata serialization
- [x] **Tests** — 30 tests (AgentManager lifecycle/pairing/revocation, PolicyEngine rule matching/caching/defaults/path safety, ApprovalQueue approve/deny/timeout/hash verification, AuditLogger logging/filtering/counting, SSEBroadcaster, DB bridge)

## Phase 6: CLI & SDK (keepai) ✅
> Agent-facing tool. Pairs with daemon, makes RPC calls.

- [x] **keepai: local storage** — `storage.ts` with config.json + identity.json at ~/.keepai/client/ (or $KEEPAI_CONFIG_DIR); 0o600 perms via atomic tmp+rename; loadIdentity/saveIdentity/loadConfig/saveConfig/deleteStorage/isPaired/getConfigDir
- [x] **keepai: SDK KeepAI class** — `sdk.ts` with static `init(pairingCode)` (decode → keypair → pair RPC → save → help), `run(service, method, params)`, `help(service?)`, `status()`, `disconnect()`, `close()`; KeepAIError with code + exitCode; RPCCallError mapping to exit codes
- [x] **keepai: CLI init command** — commander-based; decode pairing code, generate keypair, send "pair" RPC, save config, fetch services, print summary
- [x] **keepai: CLI run command** — `npx keepai run <service> <method>` with --account, --params (JSON), --timeout, --raw; supports --key=value extra flags; JSON stdout, errors stderr
- [x] **keepai: CLI help command** — list all services or per-service method help with padded formatting
- [x] **keepai: CLI status command** — check pairing, display daemon status, list services/accounts
- [x] **keepai: CLI disconnect command** — remove local identity and config
- [x] **keepai: exit codes** — 0=success, 1=general, 2=not paired, 3=permission denied, 4=approval timeout, 5=service error (from @keepai/proto EXIT_CODES)
- [x] **keepai: tsup dual config** — separate configs for index.ts (ESM+CJS+DTS) and cli.ts (ESM only with shebang banner)
- [x] **keepai: SDK exports** — index.ts re-exports KeepAI, KeepAIError, storage functions and types
- [x] **Tests** — 25 tests (getConfigDir env override, Identity CRUD + perms + nested dirs, Config CRUD + perms, isPaired logic, deleteStorage + idempotent, KeepAIError construction, KeepAI constructor variants, disconnect, status when unpaired, run/help when unpaired)
- [ ] **Verify first end-to-end flow**: keepd running → `npx keepai init <code>` → `npx keepai run gmail messages.list` → response (deferred to Phase 9)

## Phase 7: UI (React SPA) ✅
> Management interface. All state via TanStack Query + keepd HTTP API.

- [x] **ui: Tailwind 4 + Radix + PostCSS setup** — postcss.config.mjs with @tailwindcss/postcss; index.css with @theme directive for semantic colors (primary/secondary/muted/destructive/accent), CSS variables, border radius tokens; HSL-based theming
- [x] **ui: Entry point + providers** — main.tsx with React.StrictMode, QueryClientProvider (5s staleTime, 60s gcTime), BrowserRouter (frontend) / HashRouter (electron) based on __ELECTRON__ define
- [x] **ui: App shell + routing** — App.tsx with Header + Routes; 8 routes (/, /connections, /agents, /agents/:agentId, /agents/:agentId/policies, /approvals, /logs, /settings); max-w-5xl centered layout
- [x] **ui: Header component** — top bar with "KeepAI" logo, pending approval badge (from useQueue), Radix DropdownMenu with nav items (Dashboard, Connections, Agents, Approvals, Logs) + separator + Settings; lucide-react icons; active route highlighting
- [x] **ui: useSSE hook** — EventSource on /api/events; listeners for approval_request, approval_resolved, pairing_completed, request_completed, connection_updated → queryClient.invalidateQueries; auto-reconnect on error
- [x] **ui: API client** — lib/api.ts with typed request() wrapper; all endpoints: connections (list, services, connect, disconnect, check), agents (list, get, create, revoke), policies (list, get, save), queue (list, approve, deny), logs (list with params), config (get, save), status
- [x] **ui: Query keys** — lib/query-keys.ts factory: connections, services, agents, agent(id), policies(agentId), policy(agentId, service), queue, logs(params), config, status
- [x] **ui: TanStack Query hooks** — use-connections (5 hooks), use-agents (4 hooks), use-queue (3 hooks with 5s refetchInterval), use-logs, use-config (3 hooks with 30s status refetch), use-policies (3 hooks); all with proper invalidation on mutation success
- [x] **ui: Dashboard page** — pending approvals (top 3 with approve/deny), connected services list with StatusBadge, paired agents list with avatars; empty states with CTAs; links to relevant pages
- [x] **ui: Connections page** — service picker (Gmail/Notion), connection list with status/last-used, test connection (RefreshCw spinner), disconnect with confirmation; window.open for OAuth redirect
- [x] **ui: Agents page** — agent list with avatars and status; "Add Agent" modal dialog (name input → generate code → display `npx keepai init <code>` with copy button → waiting state)
- [x] **ui: Agent detail page** — agent info (ID, pubkey, paired date, last seen), per-service policy summary with ServiceIcon, edit policies link, revoke button with confirmation → navigate to /agents
- [x] **ui: Policies page** — per-connected-service policy cards; default action ActionSelect (allow/deny/ask); operation-specific rules (read/write/delete); raw JSON toggle with textarea; save + reset buttons
- [x] **ui: Approvals page** — pending approval cards (ApprovalCard component) with service icon, method, description, timeAgo, agent name, approve/deny buttons; real-time via SSE + 5s polling
- [x] **ui: Logs page** — filterable table (service, agent text inputs); expandable rows (full JSON detail); pagination (previous/next with offset/limit); timestamp, service icon, method, agent, status (color-coded), duration columns
- [x] **ui: Settings page** — daemon status card (agents, connections, pending approvals, SSE clients), config form (relay URLs textarea, approval timeout input), save button, about section (version 0.1.0)
- [x] **ui: Shared components** — StatusBadge (connected/online/active/pending/offline/error/revoked with color dots), ServiceIcon (Gmail=Mail red, Notion=FileText, default=Globe), EmptyState (icon + title + description + action), ApprovalCard (service icon, method, description, timeAgo, approve/deny), CodeBlock (mono pre), cn() utility (clsx + tailwind-merge)
- [x] **Verify UI builds in both modes** — frontend (384KB JS + 20KB CSS) and electron; all 8 packages build; 179 tests pass

## Phase 8: Electron Desktop App
> Bundle keepd + UI into a desktop app with tray and notifications.

- [ ] **electron: main.ts** — start keepd, create window (1000x700, hidden initially), create tray, SSE notification listener, dock hide (macOS) → [specs/08-electron.md]
- [ ] **electron: preload.ts** — expose API_ENDPOINT, electronAPI (getVersion, getPlatform, onNavigateTo, showNotification, updateTrayBadge) → [specs/08-electron.md]
- [ ] **electron: esbuild config** — main.cjs + preload.cjs, externals: electron + better-sqlite3 → [specs/08-electron.md]
- [ ] **electron: builder config** — electron-builder.yml, extraResources for better-sqlite3, platform targets → [specs/08-electron.md]
- [ ] **electron: tray** — context menu (Open, Pending Approvals count, Quit), single click toggle, badge → [specs/08-electron.md]
- [ ] **electron: notifications** — SSE listener in main process, OS notifications on approval_request, click navigates to /approvals → [specs/08-electron.md]
- [ ] **electron: window behavior** — close → minimize to tray, external nav blocked, OAuth in external browser → [specs/08-electron.md]
- [ ] **electron: build script** — turbo build → copy ui dist → esbuild → electron-builder → [specs/08-electron.md]
- [ ] **Verify electron app launches, shows UI, tray works, notifications fire**

## Phase 9: Polish & Integration Testing
> End-to-end validation and final polish.

- [ ] **E2E test: full agent lifecycle** — start keepd → connect Gmail in UI → pair agent via CLI → agent runs gmail.messages.list → response received
- [ ] **E2E test: approval flow** — agent sends write request → UI shows approval card → user approves → agent receives response
- [ ] **E2E test: policy deny** — set policy to deny writes → agent attempts write → gets permission denied error
- [ ] **E2E test: Notion connector** — connect Notion → agent queries database → response received
- [ ] **Error handling review** — verify all error paths: expired pairing, revoked agent, expired approval, service error, network error
- [ ] **Audit log review** — verify all operations logged with correct fields
- [ ] **Cleanup job verification** — verify expired pairings/approvals cleaned up
- [ ] **Desktop notification review** — verify approval notifications work in electron
