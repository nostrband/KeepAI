# 11b - Server-Side Text Renderer

## Scope

Build a new module in keepd that renders `ServiceHelp` data into
pre-formatted terminal text. Three rendering levels. Pure function,
no side effects, fully unit-testable. Not wired into RPC yet (that's 11c).

## New File: apps/keepd/src/help-renderer.ts

### Public API

```typescript
// Render Level 1: list of all services
renderServiceList(services: ServiceHelp[], cols?: number): string;

// Render Level 2: all methods for one service
renderServiceMethods(service: ServiceHelp, cols?: number): string;

// Render Level 3: single method detail
renderMethodDetail(service: ServiceHelp, methodName: string, cols?: number): string;
```

All functions return plain text strings ready to print. No ANSI color codes
(agents can't use them). No markdown (keep it plain).

### Level 1 Output: `renderServiceList()`

```
Available services:

  gmail    Email — read, send, draft, organize
           Accounts: user@gmail.com

  notion   Documents & databases — read, create, search
           Accounts: My Workspace

Run 'npx keepai help <service>' to see methods.
Example: npx keepai help gmail
```

Logic:
- For each service: show `service` name, `summary` (from ServiceHelp.summary)
- Show accounts on next line (from ServiceHelp.accounts)
- If no accounts: show `Accounts: (none connected)`
- Footer with hint and example (use first service name in example)

### Level 2 Output: `renderServiceMethods()`

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

Logic:
- Header: service name + accounts (comma-separated labels or IDs)
- Group methods by prefix (before the dot): `messages`, `drafts`, etc.
- Each method: short name (after dot), description, param preview
- Param preview: parenthesized list of param names, showing required first,
  then optional — only required params shown if list would be too long (>5)
- Column alignment: method name padded to widest in group, descriptions aligned
- Footer with hint and concrete example (pick a write method for the example,
  more interesting than a read)

### Level 3 Output: `renderMethodDetail()`

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

Use the returned 'id' with drafts.send to send the draft.

See also: gmail drafts.send, gmail drafts.list, gmail messages.send
```

Logic:
- Header: `service method — description`
- Parameters table:
  - Columns: name, type, required/blank, description
  - Required params first, then optional
  - If param has `default`, show in description: `(default: 10)`
  - If param has `enum`, show: `One of: full, metadata, minimal`
  - If param has `syntax` array, show after params table:
    ```
    Query syntax for 'q':
      from:user@example.com          Messages from a sender
      ...
    ```
- Examples section:
  - Generate from the method's `example` field if present
  - Always show two forms: named flags + JSON params
  - Named flags: `--paramName=value` for each param in the example
  - JSON: `--params '{...}'` with the example params
  - For methods with required ID params that have notes about where to find
    them, add a "Find ID first" sub-example
- Response section:
  - Render `responseExample` as indented JSON (2-space, max 6 lines)
  - If responseExample is absent, skip this section
- Notes section:
  - Render each `notes` entry as a line
- See also section:
  - Render `seeAlso` as `service method, service method, ...`
  - Skip if empty

### Example Generation Logic

When building the `--flag` style example from `example.params`:

```typescript
function buildFlagExample(service: string, method: string, params: Record<string, unknown>): string {
  const flags = Object.entries(params)
    .map(([key, value]) => {
      const strVal = typeof value === 'string' ? value : JSON.stringify(value);
      // Quote values with spaces
      const quoted = strVal.includes(' ') ? `"${strVal}"` : strVal;
      return `--${key}=${quoted}`;
    })
    .join(' ');
  return `npx keepai run ${service} ${method} ${flags}`;
}
```

### Column Width Handling

The `cols` parameter (default: 80) is used to:
- Truncate long descriptions in Level 2 if they'd overflow
- Wrap notes text at word boundaries
- Not used for Level 3 example lines (those should never be wrapped — they
  need to be copy-pasteable)

## Files Changed

| File | Change |
|---|---|
| `apps/keepd/src/help-renderer.ts` | New file — three render functions |
| `apps/keepd/src/__tests__/help-renderer.test.ts` | New file — unit tests |

## Testing

- Test each render level with mock `ServiceHelp` data
- Test edge cases: no accounts, no params, no examples, empty seeAlso
- Test methods with syntax arrays (q param)
- Test param preview generation (parenthesized list)
- Test method grouping (by prefix)
- Test with connectors' actual help() output to verify real-world rendering
- Snapshot tests for output stability
