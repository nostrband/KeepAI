# 00 - Architecture Overview

## Product Vision

KeepAI is a safe gate for AI agents to access user services (Gmail, Notion, etc.).
The user runs KeepAI desktop app on their trusted device, connects their accounts,
and gives remote AI agents controlled, policy-governed access through an e2e encrypted
channel over nostr relays.

## Components

### keepd — Daemon (`@keepai/daemon`)

Background service that:
- Holds OAuth credentials for connected services (Gmail, Notion)
- Manages paired agent identities and per-agent policies
- Listens for incoming RPC requests from agents over nostr (e2e encrypted)
- Checks policies, queues approval requests, executes service calls
- Serves HTTP API for ui on localhost
- Pushes real-time events to ui via SSE (approval requests, agent activity)

Runs as part of the KeepAI desktop electron app. Can also be packaged standalone
(npm package, Docker container) for advanced deployment scenarios.

### ui — Web UI (`@keepai/ui`, dir: `apps/ui`)

React SPA that:
- Manages OAuth connections (connect/disconnect Gmail, Notion accounts)
- Manages paired agents (create pairing codes, name agents, revoke access)
- Configures per-agent per-service policies (allow/deny/ask for read/write)
- Shows real-time approval queue (approve/deny pending agent requests)
- Shows request logs and audit trail
- Shows active agent sessions

Served by keepd on localhost. Embedded in electron app. Could also be deployed
as standalone SPA pointing at a remote keepd instance (future).

### keepai — Agent CLI + SDK (`@keepai/cli`, npm package name: `keepai`)

Used by AI agents to access services through KeepAI:
- CLI: `npx keepai init <code>`, `npx keepai run gmail messages.list ...`, `npx keepai help`
- SDK: `import { KeepAI } from 'keepai'` for agentic frameworks

Communicates with keepd over e2e encrypted nostr RPC. Stores persistent identity
(keypair) and connection config in `~/.keepai/client/`.

### electron — Desktop App (`@keepai/electron`)

Electron app that bundles keepd + ui:
- Runs keepd as embedded server
- Loads ui in browser window
- Sits in system tray (background operation)
- Provides native OS integrations (notifications for approval requests)

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  User's trusted device (desktop/laptop)                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  KeepAI Desktop (Electron)                              │     │
│  │                                                         │     │
│  │  ┌──────────┐  localhost HTTP + SSE   ┌──────────┐     │     │
│  │  │  ui   │◄─────────────────────►│  keepd    │     │     │
│  │  │  (React)  │                        │  (Node)   │     │     │
│  │  └──────────┘                        │           │     │     │
│  │                                       │  ┌──────┐│     │     │
│  │                                       │  │SQLite││     │     │
│  │                                       │  └──────┘│     │     │
│  │                                       │  ┌──────┐│     │     │
│  │                                       │  │Creds ││     │     │
│  │                                       │  │Files ││     │     │
│  │                                       │  └──────┘│     │     │
│  │                                       └────┬─────┘     │     │
│  └────────────────────────────────────────────┼───────────┘     │
│                                               │                  │
└───────────────────────────────────────────────┼──────────────────┘
                                                │
                              e2e encrypted     │    OAuth API calls
                              nostr RPC         │    (googleapis, notion)
                                                │
                    ┌───────────────────┐       │    ┌───────────────┐
                    │   Nostr Relays    │       ├───►│  Gmail API    │
                    └───────┬───────────┘       │    └───────────────┘
                            │                   │    ┌───────────────┐
                            │                   └───►│  Notion API   │
              ┌─────────────┼─────────────┐          └───────────────┘
              │             │             │
      ┌───────┴──┐  ┌──────┴───┐  ┌──────┴───┐
      │ Agent 1  │  │ Agent 2  │  │ Agent 3  │
      │"openclaw"│  │ "claude" │  │ "custom" │
      │          │  │          │  │          │
      │npx keepai│  │npx keepai│  │KeepAI SDK│
      └──────────┘  └──────────┘  └──────────┘
      (remote machine, sandbox, docker, etc.)
```

## Key Flows

### 1. Setup Flow
1. User installs KeepAI desktop app
2. Opens ui, connects Gmail account (OAuth popup)
3. Connects Notion workspace (OAuth popup)
4. Creates agent pairing: names it "openclaw", gets pairing code

### 2. Agent Pairing Flow
1. User tells agent: "run `npx keepai init eyJwdWJrZXkiOiJhYmMx...`"
2. Agent runs the command → stores persistent keypair in `~/.keepai/client/`
3. keepai sends test request to keepd over nostr
4. keepd verifies pairing code, registers agent identity
5. Agent confirmed as paired, can now make requests

### 3. Request Flow
1. Agent runs: `npx keepai run gmail messages.list --account=user@gmail.com`
2. keepai connects to keepd via e2e encrypted nostr RPC
3. keepd receives request, extracts permission metadata:
   `{agent: "openclaw", service: "gmail", method: "messages.list", opType: "read", account: "user@gmail.com"}`
4. keepd checks policy → "read" is "allow" for this agent → auto-approved
5. keepd executes Gmail API call with stored credentials
6. keepd streams response back to agent over nostr

### 4. Write Request with Approval
1. Agent runs: `npx keepai run gmail messages.send --account=user@gmail.com --params='{...}'`
2. keepd receives request, extracts metadata: opType = "write"
3. Policy says "write" = "ask" → enters approval flow:
   a. Write request to temp file, compute hash
   b. Store in approval queue DB: {hash, agent, service, method, status: "pending"}
   c. Push to ui via SSE + desktop notification
4. User sees: "openclaw wants to send email via user@gmail.com — [Approve] [Deny]"
5. User approves → keepd verifies temp file hash matches DB → executes → responds
6. If user doesn't respond within timeout (default 5 min) → error back to agent

## File Layout

```
~/.keepai/client/                   # Agent-side (where keepai CLI runs)
  config.json                       # Connection to keepd (pubkey, relays)
  identity.json                     # Agent's keypair (0o600)

~/.keepai/server/                   # Daemon-side (user's trusted device)
  keepai.db                         # SQLite database (agents, keypairs, queue, audit log)
  settings.json                     # Daemon config (port, relays, timeouts)
  connectors/
    gmail/
      user@gmail.com.json           # OAuth credentials (0o600)
    notion/
      workspace_id.json             # OAuth credentials (0o600)
  agents/
    <agent-pubkey>/                 # Agent's nostr pubkey (hex) as dir name
      policies/
        gmail.json                  # Per-service policy config
        notion.json
  temp/                             # Temp files for approval queue
  debug.log                         # Debug log file
```

## V1 Scope

- 2 connectors: Gmail, Notion
- Per-agent per-service policies (read=allow, write=ask as default)
- E2E encrypted nostr RPC
- Desktop electron app with tray
- npx CLI for agents
- SDK library for agentic frameworks
- Approval queue with real-time UI
- Request audit log

## Non-Goals for V1

- HTTPS/TLS for remote keepd deployment
- Database encryption at rest (plain SQLite for now)
- OS keystore integration for credentials
- Telegram/Slack approval channels (SSE + desktop notifications only)
- Fine-grained resource-level policies (e.g., "only emails from X")
- Rate limiting per agent
