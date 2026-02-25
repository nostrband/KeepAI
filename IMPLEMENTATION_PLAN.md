# KeepAI Implementation Plan

> **Goal**: Simple, lovable, complete v1 — a safe gate for AI agents to access user services (Gmail, Notion) via e2e encrypted nostr RPC.
>
> **Status**: Phase 4 complete. Connectors (Gmail + Notion) with OAuth, credential store, connection manager, and executor implemented and tested.

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

## Phase 5: Daemon (keepd)
> The central hub. Fastify HTTP API + nostr RPC handler + policy engine + approval queue.

- [ ] **keepd: Fastify server** — `createServer()` on localhost:9090, CORS, static file serving → [specs/03-keepd.md]
- [ ] **keepd: connection routes** — GET/POST/DELETE /api/connections/* (6 routes, reuse ConnectorManager) → [specs/03-keepd.md]
- [ ] **keepd: AgentManager** — createPairing, completePairing, getAgentByKeepdPubkey, listAgents, revokeAgent, touchAgent → [specs/03-keepd.md]
- [ ] **keepd: agent routes** — list, new (generate pairing code), get detail, revoke at /api/agents/* → [specs/03-keepd.md]
- [ ] **keepd: PolicyEngine** — `evaluate(agentPubkey, metadata)` → allow/deny/ask; file-based policies with mtime caching + fs.watch; `savePolicy()` with atomic write; `createDefaults()` → [specs/07-permissions.md]
- [ ] **keepd: policy routes** — GET/PUT /api/agents/:agentId/policies/:service → [specs/03-keepd.md]
- [ ] **keepd: ApprovalQueue** — write temp file → SHA-256 hash → DB insert → SSE emit → DB poll 500ms → verify hash on approval → execute → cleanup → [specs/07-permissions.md]
- [ ] **keepd: approval routes** — list pending, approve, deny at /api/queue/* → [specs/03-keepd.md]
- [ ] **keepd: AuditLogger** — log every request with all fields → [specs/03-keepd.md]
- [ ] **keepd: log routes** — GET /api/logs with filters (agent, service, method, date range, status) → [specs/03-keepd.md]
- [ ] **keepd: SSE endpoint** — `/api/events` emitting approval_request, approval_resolved, pairing_completed, agent_connected, agent_disconnected, request_completed → [specs/03-keepd.md]
- [ ] **keepd: config/status routes** — GET/PUT /api/config, GET /api/status → [specs/03-keepd.md]
- [ ] **keepd: RPC handler** — decrypt → identify agent → route (pair/ping/help/service) → validate → extractPermMetadata → policy check → approval flow → execute connector → audit → respond → [specs/03-keepd.md]
- [ ] **keepd: pairing flow** — POST /api/agents/new → keypair + secret → pending_pairings → nostr subscription update → return code; RPC "pair" → verify secret → create agent → delete pending → SSE emit → [specs/03-keepd.md]
- [ ] **keepd: cleanup jobs** — every 5 min: expire pairings, expire approvals, clean resolved approvals (7d), clean audit log (30d) → [specs/09-database.md]
- [ ] **keepd: server startup sequence** — 14-step: data dir → DB → migration → settings → connectors → reconcile → register connectors → agent manager → policy engine → approval queue → audit logger → RPC handler → nostr subscribe → static files → [specs/03-keepd.md]
- [ ] **Verify keepd starts, HTTP API responds, SSE connects**

## Phase 6: CLI & SDK (keepai)
> Agent-facing tool. Pairs with daemon, makes RPC calls.

- [ ] **keepai: local storage** — config.json + identity.json management at ~/.keepai/client/ with 0o600 perms → [specs/04-keepai-cli-sdk.md]
- [ ] **keepai: SDK KeepAI class** — `init(pairingCode)`, `status()`, `help(service?)`, `run(service, method, params)`, `disconnect()`; events: waiting_approval, connected, disconnected → [specs/04-keepai-cli-sdk.md]
- [ ] **keepai: CLI init command** — decode pairing code, generate keypair, send "pair" RPC, save config, send "help", print services → [specs/04-keepai-cli-sdk.md]
- [ ] **keepai: CLI run command** — `npx keepai run <service> <method> [options]`; --account, --params, --timeout, --raw; JSON stdout, errors stderr → [specs/04-keepai-cli-sdk.md]
- [ ] **keepai: CLI help command** — list services/methods or detailed per-method help; LLM-friendly markdown → [specs/04-keepai-cli-sdk.md]
- [ ] **keepai: CLI status command** — check connection, list services/accounts → [specs/04-keepai-cli-sdk.md]
- [ ] **keepai: CLI disconnect command** — remove local identity and config → [specs/04-keepai-cli-sdk.md]
- [ ] **keepai: exit codes** — 0=success, 1=general, 2=not paired, 3=permission denied, 4=approval timeout, 5=service error → [specs/04-keepai-cli-sdk.md]
- [ ] **Verify first end-to-end flow**: keepd running → `npx keepai init <code>` → `npx keepai run gmail messages.list` → response

## Phase 7: UI (React SPA)
> Management interface. All state via TanStack Query + keepd HTTP API.

- [ ] **ui: Vite + Tailwind + Radix setup** — vite.config.ts (two build modes), tailwind.config, CSS variables (copy from ../keep.ai), main.tsx, queryClient → [specs/05-ui.md]
- [ ] **ui: App shell + routing** — React Router, top bar (logo left, approval badge + menu right), page layout → [specs/05-ui.md]
- [ ] **ui: useSSE hook** — subscribe to /api/events, trigger TanStack Query invalidation → [specs/05-ui.md]
- [ ] **ui: Dashboard page** — pending approvals, connected services, paired agents, quick actions → [specs/05-ui.md]
- [ ] **ui: Connections page** — list with connect/disconnect/test; service picker dialog; OAuth flow → [specs/05-ui.md]
- [ ] **ui: Connection detail page** — status, usage stats, disconnect → [specs/05-ui.md]
- [ ] **ui: Agents page** — list with add/revoke; "Add Agent" pairing dialog (name → code → wait for SSE → success) → [specs/05-ui.md]
- [ ] **ui: Agent detail page** — info, per-service policy summary, recent requests, revoke → [specs/05-ui.md]
- [ ] **ui: Policies page** — visual policy editor per service; default action dropdown; per-operation rules; raw JSON toggle; save/reset → [specs/05-ui.md]
- [ ] **ui: Approvals page** — real-time pending cards (agent, service, method, account, description, time, expandable details, approve/deny); SSE-driven; badge count → [specs/05-ui.md]
- [ ] **ui: Logs page** — searchable/filterable table; expandable rows → [specs/05-ui.md]
- [ ] **ui: Settings page** — relay URLs, approval timeout, OAuth callback port, about → [specs/05-ui.md]
- [ ] **ui: shared components** — StatusBadge, ServiceIcon, AgentAvatar, ApprovalCard, PolicyEditor, LogTable, CodeBlock, EmptyState → [specs/05-ui.md]
- [ ] **Verify UI builds in both modes; dashboard loads from keepd**

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
