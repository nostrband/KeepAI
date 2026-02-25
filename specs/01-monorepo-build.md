# 01 - Monorepo Structure & Build Pipeline

## Overview

Copy monorepo structure and build config from `../keep.ai`. That project uses
npm workspaces + Turbo and it took significant effort to get working correctly,
especially for the electron build with native modules.

## Source: What to Copy from ../keep.ai

### Root Config Files (copy and adapt)

| File | Adapt how |
|------|-----------|
| `package.json` | Change name/version, update workspaces list, strip unused deps |
| `turbo.json` | Same structure, update task definitions if needed |
| `tsconfig.base.json` | Update path aliases for new package names |
| `electron-builder.yml` | Update appId, productName, native module list |
| `.gitignore` | Copy as-is |
| `.github/workflows/release.yml` | Copy and adapt for KeepAI electron builds |
| `Dockerfile` | Adapt for keepd (simpler - no web frontend build step in server) |
| `docker-compose.yml` | Adapt for keepd |

### Build Patterns to Preserve

- **Turbo** for build orchestration with `dependsOn: ["^build"]`
- **tsup** for all packages (ESM + CJS dual output)
- **Vite** for ui (with `build:frontend` and `build:electron` modes)
- **esbuild** for electron main/preload processes
- **electron-builder** for packaging desktop app

### Key Lessons from ../keep.ai

1. Native modules (sqlite3, etc.) must be `extraResources` in electron-builder, not in asar
2. External modules in esbuild config for electron main process
3. Web app needs separate build modes for server-served vs electron-embedded
4. OAuth secrets injected at build time via `secrets.build.json` or env vars
5. Root-level deps needed for electron-builder to find native modules

## Directory Structure

```
clawkeep/
├── apps/
│   ├── keepd/                    # Daemon server
│   │   ├── src/
│   │   │   ├── server.ts         # Fastify server setup
│   │   │   ├── start.ts          # Entry point
│   │   │   └── routes/
│   │   │       ├── connections.ts # OAuth management routes
│   │   │       ├── agents.ts     # Agent pairing routes
│   │   │       ├── policies.ts   # Policy management routes
│   │   │       ├── queue.ts      # Approval queue routes
│   │   │       └── logs.ts       # Audit log routes
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── ui/                       # Web UI (ui)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   ├── keepai/                   # CLI + SDK
│   │   ├── src/
│   │   │   ├── index.ts          # SDK entry
│   │   │   ├── cli.ts            # CLI entry (bin)
│   │   │   ├── client.ts         # NostrRPC client
│   │   │   └── commands/
│   │   │       ├── init.ts
│   │   │       ├── run.ts
│   │   │       ├── help.ts
│   │   │       └── status.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── electron/                 # Desktop app
│       ├── src/
│       │   ├── main.ts
│       │   └── preload.ts
│       ├── public/               # Built ui copied here
│       ├── assets/
│       ├── package.json
│       ├── tsconfig.json
│       └── esbuild.main.mjs
│
├── packages/
│   ├── proto/                    # Shared types, schemas, constants
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts          # Core type definitions
│   │   │   ├── errors.ts         # Error classification
│   │   │   ├── permissions.ts    # Policy/permission types
│   │   │   └── rpc.ts            # RPC message types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── db/                       # Database layer (better-sqlite3)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── database.ts       # DB class, migration runner
│   │   │   ├── stores/           # Store classes
│   │   │   └── migrations/       # Sequential migrations
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── connectors/               # Service connectors (Gmail, Notion)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── manager.ts        # ConnectionManager
│   │   │   ├── oauth.ts          # OAuth handler
│   │   │   ├── store.ts          # Credential file store
│   │   │   ├── types.ts
│   │   │   ├── executor.ts       # Request execution + perm metadata
│   │   │   ├── help.ts           # Help text generation
│   │   │   └── services/
│   │   │       ├── gmail.ts      # Gmail connector + methods
│   │   │       └── notion.ts     # Notion connector + methods
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── nostr-rpc/                # E2E encrypted RPC over nostr
│       ├── src/
│       │   ├── index.ts
│       │   ├── rpc-caller.ts     # Client-side RPC
│       │   ├── rpc-handler.ts    # Server-side RPC handler
│       │   ├── encryption.ts     # NIP-44 v3 encryption
│       │   ├── stream-writer.ts  # Streaming (from keep.ai sync)
│       │   ├── stream-reader.ts
│       │   ├── transport.ts      # Nostr relay communication
│       │   └── pairing.ts        # Pairing protocol
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── docs/
│   └── dev/                      # These spec files
│
├── package.json                  # Root workspace config
├── turbo.json                    # Build orchestration
├── tsconfig.base.json            # Shared TS config
├── electron-builder.yml          # Electron packaging
├── Dockerfile                    # Docker build for keepd
├── docker-compose.yml
├── secrets.build.json            # OAuth secrets (gitignored)
└── .gitignore
```

## Package Dependency Graph

```
@keepai/proto (leaf — no deps)
     ↑
     ├── @keepai/db
     ├── @keepai/connectors
     └── @keepai/nostr-rpc
              ↑
              ├── apps/keepd (depends on: proto, db, connectors, nostr-rpc)
              ├── apps/keepai (depends on: proto, nostr-rpc)
              └── apps/ui (depends on: proto)

apps/electron (depends on: keepd, ui)
```

## Root package.json

```jsonc
{
  "name": "keepai",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "clean": "turbo run clean",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.6.0",
    "typescript": "^5.2.0"
  },
  // Root deps needed for electron-builder to find native modules
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

## turbo.json

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "public/**", "build/**"],
      "cache": false,
      "env": ["BUILD_GMAIL_SECRET", "BUILD_GOOGLE_CLIENT_ID",
              "BUILD_NOTION_CLIENT_ID", "BUILD_NOTION_CLIENT_SECRET"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": { "cache": false },
    "type-check": { "dependsOn": ["^build"] }
  }
}
```

## tsconfig.base.json Path Aliases

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@keepai/proto/*": ["packages/proto/src/*"],
      "@keepai/db/*": ["packages/db/src/*"],
      "@keepai/connectors/*": ["packages/connectors/src/*"],
      "@keepai/nostr-rpc/*": ["packages/nostr-rpc/src/*"],
      "@keepai/daemon/*": ["apps/keepd/src/*"],
      "@keepai/ui/*": ["apps/ui/src/*"],
      "@keepai/cli/*": ["apps/keepai/src/*"]
    }
  }
}
```

## Secret Injection

Same pattern as ../keep.ai: OAuth client IDs and secrets loaded at build time.

**For development**: `secrets.build.json` at repo root (gitignored):
```json
{
  "GOOGLE_CLIENT_ID": "...",
  "GOOGLE_CLIENT_SECRET": "...",
  "NOTION_CLIENT_ID": "...",
  "NOTION_CLIENT_SECRET": "..."
}
```

**For CI/Docker**: Environment variables override:
```
BUILD_GMAIL_SECRET, BUILD_GOOGLE_CLIENT_ID,
BUILD_NOTION_CLIENT_ID, BUILD_NOTION_CLIENT_SECRET
```

**For custom deployments (Docker)**: Runtime env vars that override build-time values:
```
KEEPAI_GOOGLE_CLIENT_ID, KEEPAI_GOOGLE_CLIENT_SECRET,
KEEPAI_NOTION_CLIENT_ID, KEEPAI_NOTION_CLIENT_SECRET
```

This allows Docker users to provide their own OAuth app credentials.

Injected via tsup `define` option in keepd's tsup.config.ts (same as ../keep.ai
apps/server/tsup.config.ts — copy that pattern).

## Build Flow

```
turbo run build
  1. @keepai/proto          → tsup → dist/
  2. @keepai/db             → tsup → dist/  (depends on proto)
  3. @keepai/connectors     → tsup → dist/  (depends on proto)
  4. @keepai/nostr-rpc      → tsup → dist/  (depends on proto)
  5. apps/ui               → vite → dist/frontend/, dist/electron/
  6. apps/keepai            → tsup → dist/  (depends on proto, nostr-rpc)
  7. apps/keepd             → tsup → dist/  (depends on proto, db, connectors, nostr-rpc)
  8. apps/electron          → esbuild main/preload → copy ui/dist/electron → public/
```

## Electron Build

```bash
# From repo root:
npx electron-builder --config electron-builder.yml
```

Copy electron-builder.yml from ../keep.ai and adapt:
- Change appId to `ai.keepai.app`
- Change productName to `KeepAI`
- Update extraResources: replace sqlite3/crsqlite with better-sqlite3
- Remove quickjs-related entries (not needed)
- Keep the general structure (files, asar, extraResources patterns)

## Dev Workflow

```bash
# Install deps
npm install

# Dev mode (all packages watch + rebuild)
npm run dev

# Or run specific apps:
turbo run dev --filter=@keepai/daemon
turbo run dev --filter=@keepai/ui      # apps/ui
turbo run dev --filter=@keepai/cli    # apps/keepai
```
