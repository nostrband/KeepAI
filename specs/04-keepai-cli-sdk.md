# 04 - keepai CLI + SDK

## Overview

keepai is an npm package that AI agents use to access services through KeepAI.
It works two ways:
1. **CLI**: `npx keepai <command>` — for agents with shell access
2. **SDK**: `import { KeepAI } from 'keepai'` — for agentic frameworks

Published to npm as `keepai` (package name). Monorepo path: `apps/keepai/`.

## CLI Commands

### `npx keepai init <code>`

Pair with a KeepAI daemon.

```
$ npx keepai init eyJwdWJrZXkiOiI...
✓ Connected to KeepAI daemon
✓ Paired successfully
✓ Gmail (user@gmail.com) — available
✓ Notion (My Workspace) — available

Config saved to ~/.keepai/client/config.json
Run 'npx keepai help' to see available services.
```

Agent name is chosen by the user in the ui when generating the pairing code.
The agent never learns its name or internal ID — reduces social engineering
surface via prompt injection.

What happens:
1. Decode pairing code → { pubkey, relays, secret }
2. Generate keypair (if not existing in ~/.keepai/client/identity.json)
3. Connect to nostr relays
4. Send "pair" RPC with { secret }
5. On success: save config.json with keepd pubkey + relays
6. Send "help" RPC to list available services
7. Print summary

If already paired, warn and ask to overwrite or add additional daemon connection
(future: multi-daemon support).

### `npx keepai help`

List available services and their methods.

```
$ npx keepai help
Connected to KeepAI daemon

Available services:

  gmail
    accounts: user@gmail.com, work@gmail.com
    messages.list    — List messages matching a query
    messages.get     — Get a message by ID
    messages.send    — Send an email
    drafts.create    — Create a draft email
    labels.list      — List all labels
    threads.list     — List email threads
    threads.get      — Get a thread by ID

  notion
    accounts: My Workspace (abc123-def456-...), Team Space (789abc-...)
    databases.query  — Query a database
    pages.create     — Create a new page
    pages.update     — Update a page
    blocks.children.list   — List child blocks of a block/page
    blocks.children.append — Append blocks to a page
    search           — Search across the workspace
```

### `npx keepai help <service>`

Detailed help for a service, formatted for LLM consumption.

```
$ npx keepai help gmail
# Gmail Service

Connected accounts: user@gmail.com, work@gmail.com

## messages.list
List messages matching a query.

Parameters:
  --account (required)  Account email address
  --q                   Gmail search query (e.g., "from:bob is:unread")
  --maxResults          Max messages to return (default: 10, max: 100)
  --labelIds            Comma-separated label IDs to filter by
  --pageToken           Token for next page of results

Example:
  npx keepai run gmail messages.list --account=user@gmail.com --q="is:unread" --maxResults=5

Returns: { messages: [{ id, threadId, snippet, ... }], nextPageToken? }

## messages.get
Get a single message by ID.

Parameters:
  --account (required)  Account email address
  --id (required)       Message ID
  --format              Response format: "full" | "metadata" | "minimal" (default: "full")

Example:
  npx keepai run gmail messages.get --account=user@gmail.com --id=18e5a1b2c3d4e5f6

Returns: { id, threadId, labelIds, snippet, payload: { headers, body, parts }, ... }

... (more methods)
```

### `npx keepai run <service> <method> [options]`

Execute a service operation.

```
$ npx keepai run gmail messages.list --account=user@gmail.com --q="is:unread" --maxResults=5
{
  "messages": [
    { "id": "18e5a1b2c3d4e5f6", "threadId": "...", "snippet": "Hey, about the meeting..." },
    ...
  ]
}
```

Options:
- `--account=<id>` — Required for most methods. Account ID (email for Gmail,
  workspace ID for Notion) or display name (resolved by keepd). See `help` output.
- `--params=<json>` — Alternative: pass all params as JSON string.
- `--timeout=<ms>` — Override default timeout.
- `--raw` — Output raw JSON without formatting.
- Individual method params as `--key=value` flags.

**Param resolution**: Individual flags override fields in `--params` JSON.

**Output**: JSON to stdout. Errors to stderr with non-zero exit code.

**Exit codes**:
- 0: Success
- 1: General error
- 2: Not paired / connection error
- 3: Permission denied
- 4: Approval timeout (user didn't respond)
- 5: Service error (API failure)

### `npx keepai status`

Check connection status.

```
$ npx keepai status
Daemon: connected (last seen 2s ago)
Services:
  gmail: 2 accounts (user@gmail.com, work@gmail.com)
  notion: 1 account (My Workspace)
```

### `npx keepai disconnect`

Remove pairing and local identity.

```
$ npx keepai disconnect
Disconnected from KeepAI daemon.
Removed local identity from ~/.keepai/client/
```

## SDK API

```typescript
import { KeepAI } from 'keepai';

// Initialize from stored config (default: ~/.keepai/client/)
const keep = new KeepAI();

// Or initialize with explicit config
const keep = new KeepAI({
  configDir: '/custom/path/.keepai',
  // Or provide connection details directly:
  daemonPubkey: '...',
  relays: ['wss://...'],
  privateKey: '...',
});

// Check connection
const status = await keep.status();
// { paired: true, services: { gmail: [...], notion: [...] } }

// Get help (all services)
const help = await keep.help();
// { services: { gmail: { accounts: [...], methods: [...] }, ... } }

// Get help for specific service
const gmailHelp = await keep.help('gmail');
// { accounts: [...], methods: [{ name, description, params, example, returns }] }

// Execute a service operation
const result = await keep.run('gmail', 'messages.list', {
  account: 'user@gmail.com',
  q: 'is:unread',
  maxResults: 5,
});

// Error handling
try {
  const result = await keep.run('gmail', 'messages.send', {
    account: 'user@gmail.com',
    to: 'bob@example.com',
    subject: 'Hello',
    body: 'Hi Bob!',
  });
} catch (err) {
  if (err.code === 'approval_timeout') {
    // User didn't approve in time
  } else if (err.code === 'permission_denied') {
    // Policy denies this operation
  }
}

// Pair programmatically (name chosen by user in ui, not here)
await KeepAI.init(pairingCode, { configDir: '~/.keepai' });

// Disconnect
await keep.disconnect();
```

### SDK Events

```typescript
// For long-running operations or streaming responses
const keep = new KeepAI();

keep.on('waiting_approval', (info) => {
  console.log(`Waiting for user to approve: ${info.description}`);
});

keep.on('connected', () => { ... });
keep.on('disconnected', () => { ... });
```

## Local Storage

### `~/.keepai/client/config.json`

```json
{
  "daemonPubkey": "abc123...",
  "relays": ["wss://relay1.getkeep.ai", "wss://relay2.getkeep.ai"],
  "pairedAt": 1708900000
}
```

### `~/.keepai/client/identity.json`

```json
{
  "privateKey": "hex_encoded_secp256k1_private_key",
  "publicKey": "hex_encoded_secp256k1_public_key"
}
```

File permissions: 0o600 (owner read/write only).

## Package Configuration

### package.json

```jsonc
{
  "name": "keepai",
  "version": "0.1.0",
  "description": "KeepAI - Safe gate for AI agents to access your services",
  "bin": {
    "keepai": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "dependencies": {
    "@keepai/proto": "...",
    "@keepai/nostr-rpc": "...",
    "commander": "^12.0.0"
  }
}
```

### tsup.config.ts

```typescript
export default defineConfig([
  {
    entry: ['src/index.ts'],      // SDK entry
    format: ['esm', 'cjs'],
    dts: true,
  },
  {
    entry: ['src/cli.ts'],        // CLI entry
    format: ['esm'],
    banner: { js: '#!/usr/bin/env node' },
  },
]);
```

## Implementation Notes

- CLI uses `commander` for argument parsing (same as ../keep.ai CLI)
- All RPC calls go through `@keepai/nostr-rpc` RpcCaller
- Identity (keypair) generated using `nostr-tools` (same as ../keep.ai)
- Config dir detection: `KEEPAI_CONFIG_DIR` env var > `~/.keepai/client/` default
- The package should be lightweight — minimal dependencies for fast `npx` cold start
- Consider bundling nostr-tools and noble-* into the CLI build to minimize install time
