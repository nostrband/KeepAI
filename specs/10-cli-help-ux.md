# 10 - CLI Progressive Disclosure UX

## Problem

A user (human or AI agent) is told "use `npx keepai` to access gmail". They
know nothing about the tool, nothing about gmail API shape, and have no docs.
The CLI itself is their only guide. Every level of `help` must teach them
exactly enough to take the next step.

## Design Principles

1. **Every dead end shows a way forward.** No output should leave the user
   wondering "now what?". Always end with a hint for the next command.
2. **Wrong invocations are help opportunities.** Running a command with missing
   params should show what's needed, not just "error: missing params".
3. **Copy-paste examples at every level.** A user should never have to
   mentally assemble a command from a parameter table alone.
4. **No knowledge assumed.** Don't say "Gmail search query" without showing
   the syntax. Don't say "label IDs" without showing how to find them.
5. **Progressive depth.** Each level adds detail, nothing is overwhelming.

## The Journey

### Level 0: `npx keepai` (no arguments)

The very first thing someone types. Must orient them immediately.

```
KeepAI - safe gate for AI agents to access services

Commands:
  init <code>              Pair with a KeepAI daemon
  run <service> <method>   Call a service method
  help [service] [method]  Explore available services and methods
  status                   Check connection status
  disconnect               Remove pairing

Run 'npx keepai help' to see available services.
```

Key points:
- `help` command shows it accepts optional `[service]` and `[method]` args —
  the user immediately sees the drill-down pattern.
- Final line tells them the exact next command.

### Level 1: `npx keepai help` (list services)

User now wants to know what's available.

```
Available services:

  gmail    Email — read, send, draft, organize
           Accounts: user@gmail.com

  notion   Documents & databases — read, create, search
           Accounts: My Workspace

Run 'npx keepai help <service>' to see methods.
Example: npx keepai help gmail
```

Key points:
- Each service has a human-readable summary of capabilities, not just a name.
- Connected accounts shown inline — user immediately knows which identities
  are available without a separate command.
- The hint at the bottom includes a concrete example, not just the pattern.

### Level 2: `npx keepai help gmail` (service methods)

User picked gmail. Show all methods, grouped logically, with enough info
to pick the right one.

```
Gmail — user@gmail.com

  messages
    list        Search messages          (q, maxResults)
    get         Get message by ID        (id)
    send        Send a new email         (to, subject, body)
    trash       Move message to trash    (id)
    modify      Add/remove labels        (id, addLabelIds, removeLabelIds)

  drafts
    list        List draft emails        (maxResults)
    get         Get draft by ID          (id)
    create      Create a draft email     (to, subject, body)
    send        Send an existing draft   (id)

  threads
    list        Search threads           (q, maxResults)
    get         Get thread with messages (id)
    modify      Add/remove labels        (id, addLabelIds, removeLabelIds)

  labels
    list        List all labels          ()
    get         Get label details        (id)

  profile
    get         Get account info         ()

Run 'npx keepai help gmail <method>' for parameters and examples.
Example: npx keepai help gmail drafts.create
```

Key points:
- Methods are grouped by resource with a visual hierarchy — not a flat list.
- The parenthesized params after each method are a preview of the key
  parameters. This is critical — the user can often skip Level 3 entirely
  because they can see `(to, subject, body)` and guess the command.
- The hint shows the full drill-down pattern with a relevant example.

### Level 3: `npx keepai help gmail drafts.create` (method details)

User wants to create a draft. This is the deepest help level. Must contain
everything needed to construct the command.

```
gmail drafts.create — Create a draft email

Parameters:
  to         string   required   Recipient email (comma-separated for multiple)
  subject    string   required   Subject line
  body       string   required   Email body (plain text)
  cc         string              CC recipients (comma-separated)
  bcc        string              BCC recipients (comma-separated)

Examples:
  npx keepai run gmail drafts.create --to=bob@example.com --subject="Hello" --body="Hi Bob"
  npx keepai run gmail drafts.create --params '{"to": "bob@example.com", "subject": "Hello", "body": "Hi Bob"}'

Response:
  {
    "id": "r-123456789",
    "message": { "id": "abc123", "threadId": "abc123", "labelIds": ["DRAFT"] }
  }

Use the returned 'id' with 'gmail drafts.send' to send the draft.

See also: gmail drafts.list, gmail drafts.send, gmail messages.send
```

Key points:
- Parameters shown as a clean table: name, type, required/optional, description.
- Two example forms: named flags (easier to read) and --params JSON (for
  programmatic use). Both must be valid and copy-pasteable.
- Example response shown — user knows what to expect and how to use the
  output (e.g. the `id` field feeds into `drafts.send`).
- "See also" links related methods — guides the user's next exploration.
- No assumed knowledge: says "comma-separated for multiple" instead of
  just "recipients".

### Special case: methods with query syntax

Some methods accept query languages the user wouldn't know. The help must
teach them inline.

```
gmail messages.list — Search messages

Parameters:
  q            string   optional   Search query (see syntax below)
  maxResults   number   optional   Max results to return (default: 10, max: 100)
  labelIds     string   optional   Comma-separated label IDs to filter by
  pageToken    string   optional   Token for next page (from previous response)

Query syntax for 'q':
  from:user@example.com          Messages from a sender
  to:user@example.com            Messages to a recipient
  subject:meeting                Word in subject line
  "exact phrase"                 Exact phrase match
  is:unread                      Unread messages
  is:starred                     Starred messages
  has:attachment                 Has attachments
  after:2024/01/15               Sent after date
  before:2024/02/01              Sent before date
  label:important                Has label
  Combine with spaces (AND) or use OR:
    from:alice subject:meeting
    from:alice OR from:bob

Examples:
  npx keepai run gmail messages.list --q="is:unread" --maxResults=5
  npx keepai run gmail messages.list --q="from:alice@example.com subject:report"
  npx keepai run gmail messages.list --q="after:2024/01/01 has:attachment"

Response:
  {
    "messages": [
      { "id": "abc123", "threadId": "def456", "snippet": "Hey, about the..." }
    ],
    "nextPageToken": "token123"
  }

To get the full message, use the 'id' with: npx keepai run gmail messages.get --id=abc123
When 'nextPageToken' is present, pass it as --pageToken to get the next page.
```

Key points:
- Query syntax is documented right there, not behind a link.
- Multiple examples showing different query patterns.
- Explains pagination inline — user learns about `nextPageToken` and how to
  use it without having to discover it by accident.
- Tells them the next logical step (get full message by ID).

### Special case: methods with ID parameters

When a method needs an ID, explain how to obtain it.

```
gmail messages.get — Get a message by ID

Parameters:
  id       string   required   Message ID (from messages.list or threads.get)

Examples:
  npx keepai run gmail messages.get --id=18e5a1b2c3d4e5f6

  Find a message ID first:
    npx keepai run gmail messages.list --q="from:alice" --maxResults=1

Response:
  {
    "id": "18e5a1b2c3d4e5f6",
    "threadId": "18e5a1b2c3d4e5f6",
    "from": "alice@example.com",
    "to": "you@gmail.com",
    "subject": "Hello",
    "date": "2024-01-15T10:30:00Z",
    "body": "Hi, just wanted to check in...",
    "labelIds": ["INBOX", "UNREAD"]
  }

See also: gmail messages.list, gmail threads.get
```

Key points:
- `(from messages.list or threads.get)` — immediately tells the user where
  IDs come from instead of leaving them confused.
- Shows a two-step example: first find, then get.

## Error-as-Help Behaviors

### Missing required parameters

When the user runs a command but forgets required params, show exactly
what's missing and how to fix it.

```
$ npx keepai run gmail drafts.create
Error: missing required parameters: to, subject, body

Usage: npx keepai run gmail drafts.create --to=<email> --subject=<text> --body=<text>

Run 'npx keepai help gmail drafts.create' for full details.
```

Not just "missing parameters" — names them, shows the fix, offers more help.

### Unknown method

```
$ npx keepai run gmail draft.create
Error: unknown method 'draft.create'

Did you mean?
  drafts.create    Create a draft email

Run 'npx keepai help gmail' to see all methods.
```

Fuzzy match + suggestion. Never leave user at a dead end.

### Unknown service

```
$ npx keepai run email messages.list
Error: unknown service 'email'

Available services: gmail, notion

Run 'npx keepai help' to see all services.
```

### Invalid parameter value

```
$ npx keepai run gmail messages.list --maxResults=abc
Error: 'maxResults' must be a number, got 'abc'

Run 'npx keepai help gmail messages.list' for parameter details.
```

### Not connected

```
$ npx keepai run gmail messages.list
Error: not connected to a KeepAI daemon

Run 'npx keepai init <code>' to pair with your daemon.
Get a pairing code from the KeepAI app on your computer.
```

## `--help` Flag Routing

The `--help` flag should work at any position and route to the right help level:

```
npx keepai --help                          → same as 'npx keepai' (Level 0)
npx keepai run --help                      → same as 'npx keepai' (Level 0)
npx keepai help                            → Level 1 (list services)
npx keepai help gmail                      → Level 2 (service methods)
npx keepai help gmail drafts.create        → Level 3 (method details)
npx keepai run gmail --help                → Level 2 (service methods)
npx keepai run gmail drafts.create --help  → Level 3 (method details)
```

The key insight: `run <service> <method> --help` must behave as
`help <service> <method>`, NOT show generic `run` command help. The user is
asking about the method, not about how `run` works.

## Parameter Passing Styles

Support two styles, show both in examples:

### Named flags (human-friendly, exploration mode)
```
npx keepai run gmail drafts.create --to=bob@example.com --subject="Hello" --body="Hi"
```

### JSON params (machine-friendly, complex values)
```
npx keepai run gmail drafts.create --params '{"to": "bob@example.com", "subject": "Hello", "body": "Hi"}'
```

Both styles produce identical results. Named flags override `--params` keys
when both are provided (useful for overriding one field in a saved JSON template).

For methods with simple params (strings, numbers), named flags are preferred
in examples. For methods with complex nested params, JSON is preferred.

## Account Selection

When a service has exactly one account, auto-select it silently.
When multiple accounts exist, require `--account`:

```
$ npx keepai run gmail messages.list --q="is:unread"
# Works — only one gmail account, auto-selected

$ npx keepai run gmail messages.list --q="is:unread"
Error: multiple Gmail accounts available, specify one with --account

Accounts:
  user@gmail.com
  work@gmail.com

Example: npx keepai run gmail messages.list --account=user@gmail.com --q="is:unread"
```

## Output Formatting

### Default: readable JSON
```
$ npx keepai run gmail messages.list --q="is:unread" --maxResults=2
{
  "messages": [
    { "id": "abc123", "snippet": "Hey, about the meeting..." },
    { "id": "def456", "snippet": "Invoice attached for..." }
  ],
  "nextPageToken": "token789"
}

2 results. More available — use --pageToken=token789 for next page.
```

Note the footer line after JSON output — helps with pagination discovery.

### `--raw` flag: machine-parseable
```
$ npx keepai run gmail messages.list --q="is:unread" --maxResults=2 --raw
{"messages":[{"id":"abc123","snippet":"Hey, about the meeting..."},{"id":"def456","snippet":"Invoice attached for..."}],"nextPageToken":"token789"}
```

No formatting, no footer. For piping into `jq` or programmatic use.

## Where Help Data Comes From

Method metadata (parameter names, types, required/optional, descriptions,
examples, response shapes) should be defined as structured data in each
connector's implementation — not hardcoded in the CLI. The CLI's help
formatter is generic: it takes the metadata and renders it.

This means:
- Adding a new connector automatically gets full help support.
- The `help` RPC returns the structured metadata from keepd.
- The CLI formats it for terminal display.
- The SDK exposes the same metadata programmatically via `keep.help()`.

## Summary of Key Behaviors

| User types | What happens |
|---|---|
| `npx keepai` | Commands overview + "run help to see services" |
| `npx keepai help` | List services with accounts |
| `npx keepai help gmail` | Methods grouped by resource with param previews |
| `npx keepai help gmail drafts.create` | Full params, examples, response shape |
| `npx keepai run gmail drafts.create --help` | Same as help gmail drafts.create |
| `npx keepai run gmail drafts.create` (no params) | Names missing params + shows usage |
| `npx keepai run gmail draft.create` (typo) | "Did you mean drafts.create?" |
| `npx keepai run email ...` (wrong service) | "Available services: gmail, notion" |
