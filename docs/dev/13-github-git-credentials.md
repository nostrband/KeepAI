# 13 — GitHub Git Credential Support

**Status:** Planned
**Depends on:** Switching from GitHub OAuth App to GitHub App

## Problem

Agents doing local development need `git push` credentials. The MCP `push_files` tool creates a single API commit — it doesn't preserve local commit history, authorship, or merge structure. Real development workflows need actual git credentials.

KeepAI cannot hand its own OAuth token to agents — that bypasses per-operation approval and gives full access to all repos.

## Solution: GitHub App + Scoped Installation Tokens

GitHub Apps have two independent auth paths:

1. **User OAuth tokens** — used by KeepAI for MCP calls (existing flow, unchanged)
2. **Installation tokens** — generated server-side, scopeable to specific repos and permissions, expire in 1 hour

### Architecture

```
keepd (desktop)              KeepAI server              GitHub
  |                              |                        |
  |-- "sign JWT for app" ------>|                        |
  |                              |-- sign(private_key)    |
  |<-- JWT (10min ttl) ---------|                        |
  |                                                       |
  |-- POST /installations/{id}/access_tokens ----------->|
  |   Bearer: {jwt}                                       |
  |   { repos: ["owner/repo"], permissions: {contents:write} }
  |<-- scoped token (1hr, one repo, write-only) ---------|
  |                                                       |
  |-- return to agent's git credential helper             |
```

### Key properties

- **Private key stays on KeepAI server** — not distributed with desktop app
- **User OAuth token stays on desktop** — never sent to KeepAI server
- **KeepAI server is a stateless JWT signer** — doesn't see repos, permissions, or user tokens
- **Installation tokens are scoped** — specific repos, specific permissions, 1 hour TTL
- **Agent never sees KeepAI's OAuth token** — only gets the short-lived scoped token

### Signing service

The KeepAI server endpoint is minimal:

- Receives: request to sign a JWT for the KeepAI GitHub App
- Returns: JWT signed with the app's private key (10 minute TTL)
- Stateless — could be a single serverless function
- Should authenticate keepd instances (e.g. via nostr key signature) to prevent abuse

### Agent workflow

1. Agent configures git: `git -c credential.helper='!npx keepai credential-helper' push`
2. Git asks the credential helper for auth
3. `keepai credential-helper` sends RPC to keepd: "need git creds for `github.com/owner/repo`"
4. keepd checks policies (allowed repos, approval if needed)
5. keepd requests JWT from KeepAI signing server
6. keepd creates scoped installation token via GitHub API (specific repo, `contents:write`)
7. Returns token to credential helper
8. Git pushes with the scoped token
9. Token expires in 1 hour

### New RPC method

```
method: "git_credential"
service: "github"
params: {
  remote_url: "https://github.com/owner/repo.git"
}
```

Policy controls:
- Per-agent allowed repository patterns (e.g. `owner/*`, `owner/specific-repo`)
- Operation type: `write` (requires approval by default policy)
- Audit log entry for each credential issued

### Prerequisites

1. **Switch to GitHub App** — register KeepAI as a GitHub App instead of OAuth App
   - Same OAuth flow for user tokens (MCP calls)
   - Enables installation token generation
   - Fine-grained permissions model
   - Current code needs minimal changes (just client_id/secret swap)

2. **KeepAI signing server** — deploy a JWT signing endpoint with the app's private key

3. **`keepai credential-helper`** — new CLI subcommand implementing git's credential helper protocol

### Migration from OAuth App

The switch from OAuth App to GitHub App is backwards-compatible for existing functionality:
- Same OAuth authorize/token endpoints
- Same MCP endpoint (`api.githubcopilot.com/mcp/`)
- User tokens work identically
- Only change: new client_id/secret in `secrets.build.json`
- Users need to re-authorize (one-time)
