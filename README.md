# KeepAI

## Local API hub for AI agents

KeepAI is a desktop app that gives AI agents controlled access to your Gmail and other services — without sharing your passwords, OAuth tokens, keys or content with anyone.

**Your credentials never leave your device.** All communication between your agent's device and your desktop device is **end-to-end encrypted**. Your OAuth credentials and encryption keys are stored locally on your devices, our servers cannot access your credentials or content. KeepAI acts as a secure gateway: agents send requests from agent's device, you set the rules for what's allowed, and KeepAI executes API calls on your behalf from your trusted device.

> **Status:** Beta — functional with Gmail support. More connectors coming soon.

Website: [https://www.getkeep.ai](https://www.getkeep.ai)

## How It Works

```
Your desktop device                        Your agent device (MacMini, VPS, Docker)
┌──────────────────────────┐               ┌──────────────────────┐
│  KeepAI Desktop          │  E2E encrypted│  AI agent            │
│                          │◄─────────────►│                      │
│  OAuth credentials       │ via nostr     │  npx keepai run ...  │
│  Policy rules            │   relays      │  or KeepAI SDK       │
│  Approval queue          │               │                      │
│  Audit log               │               └──────────────────────┘
└──────┬───────────────────┘
       │ API calls from
       │ YOUR trusted device
       ▼
  Gmail API, ...
```

1. **Connect your accounts** — Sign in to Gmail through the KeepAI desktop app (standard OAuth, credentials stay on your machine)
2. **Pair an AI agent** — Create a pairing code in the app, give it to your agent
3. **Set policies** — Choose what each agent can do: reads auto-allowed, writes require your approval, etc.
4. **Agent makes requests** — The agent calls your services through KeepAI. You see every request, approve sensitive ones, and can revoke access anytime

## Privacy & Security

- **Local credentials** — OAuth tokens are stored in `~/.keepai/` with strict file permissions (0600). They never leave your device.
- **End-to-end encryption** — Agent-to-device communication uses NIP-44 encryption (ChaCha20-Poly1305). Relay operators cannot read your data.
- **Standard relays** — KeepAI uses standard [nostr](https://nostr.com) relays to transmit encrypted data between your devices.
- **Approve writes by default** — By default, read operations are auto-allowed while writes and deletes require your explicit approval via desktop notification.
- **Full audit trail** — Every request is logged so you can review what your agents have accessed.

## Components

| Component | What it does |
|-----------|-------------|
| **Desktop App** | Electron app that runs on your trusted machine — manages connections, agents, policies, and approvals |
| **CLI** (`npx keepai`) | Command-line tool that agents use to access your services remotely |
| **SDK** (`import { KeepAI } from 'keepai'`) | JavaScript/TypeScript library for building agents that use KeepAI programmatically |

## Getting Started

### 1. Install the Desktop App

Download from [getkeep.ai](https://www.getkeep.ai) or build from source:

```bash
git clone https://github.com/nostrband/KeepAI.git
cd clawkeep
npm install
npm run build
npm start --workspace=@keepai/electron
```

### 2. Connect Your Accounts

Open the app and click **Connect** next to Gmail. You'll go through the standard OAuth flow — KeepAI stores the resulting tokens locally on your device.

### 3. Create an Agent

Click **Add Agent**, give it a name (e.g. "my-assistant"), and copy the pairing code.

### 4. Set Up the Agent (Remote Side)

On the machine where your AI agent runs:

```bash
npx keepai init <pairing-code>
```

This pairs the agent with your KeepAI instance. The agent generates its own keypair and stores it in `~/.keepai/client/`.

### 5. Use the Agent

```bash
# List Gmail messages
npx keepai run gmail messages.list --account=you@gmail.com

# Read a specific message
npx keepai run gmail messages.get --account=you@gmail.com --params='{"id": "msg_id"}'

# Send an email (will require your approval)
npx keepai run gmail messages.send --account=you@gmail.com --params='{"to": "friend@example.com", "subject": "Hello", "body": "Hi there!"}'
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx keepai init <code>` | Pair with a KeepAI instance using a pairing code |
| `npx keepai run <service> <method>` | Execute a service method (e.g. `gmail messages.list`) |
| `npx keepai help [service] [method]` | Show available services, methods, and their parameters |
| `npx keepai status` | Check connection to your KeepAI instance |
| `npx keepai disconnect` | Remove pairing and delete local identity |

Use `npx keepai run <service> --help` to see all available methods for a service.

## Using the SDK

For building agents in JavaScript/TypeScript:

```typescript
import { KeepAI } from 'keepai'

const keepai = new KeepAI()

// List recent emails
const messages = await keepai.run('gmail', 'messages.list', {
  account: 'you@gmail.com'
})
```

## Policies

Each agent gets its own set of policies per service. The defaults are:

| Operation | Default |
|-----------|---------|
| **Read** (list, get, search) | Auto-allow |
| **Write** (send, create, update) | Ask for approval |
| **Delete** (trash, remove) | Ask for approval |

You can customize these per agent in the desktop app's **Policies** tab.

When a write or delete requires approval, you'll get a desktop notification. Open the app to review the request details and approve or deny it. Agents wait up to 5 minutes for your response.

## Supported Services

| Service | Operations |
|---------|-----------|
| **Gmail** | List messages, read messages, search, send emails, manage labels, trash/untrash |

## Building from Source

Requires Node.js 22+ and npm 10.9+.

```bash
git clone https://github.com/nostrband/KeepAI.git
cd clawkeep
npm install
npm run build
```

To run in development mode:

```bash
npm run dev        # Watch all packages
```

## License

[AGPL-3.0](LICENSE)
