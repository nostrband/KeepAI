# 11e - Client Final Thinning

## Scope

Last polish pass. Wire up `--help` routing so it works everywhere.
Handle `run` with no params gracefully. Add pagination hints.
Remove any remaining formatting logic from the client.

## `--help` Flag Routing

### Problem

Currently, commander intercepts `--help` at the `run` command level and
shows generic `run` usage. The user typing:

```
npx keepai run gmail drafts.create --help
```

expects to see method-level help, not `run` command options.

### Solution

Intercept `--help` before commander processes it. In the `run` action
handler, check for `--help` in the remaining args and redirect to the
help RPC:

```typescript
program
  .command('run <service> <method>')
  .description('Call a service method')
  .allowUnknownOption()       // already set — needed for --key=value flags
  .action(async (service: string, method: string, options: RunOptions, cmd: Command) => {
    // Check if --help was passed as an unknown option
    const rawArgs = cmd.args || [];
    if (options.help || rawArgs.includes('--help') || rawArgs.includes('-h')) {
      // Redirect to help
      const keep = new KeepAI();
      const cols = process.stdout.columns || 80;
      const result = await keep.help(service, method, cols);
      console.log(result.text);
      keep.close();
      return;
    }

    // ... normal run logic
  });
```

Alternatively, handle this at the commander level by adding a `--help`
check in `preAction` hook. Either approach works — pick whichever is
simpler with commander v12.

### Routing table

After this change:

```
npx keepai --help                          → commander Level 0 (commands list)
npx keepai help                            → RPC Level 1 (services)
npx keepai help gmail                      → RPC Level 2 (methods)
npx keepai help gmail drafts.create        → RPC Level 3 (method detail)
npx keepai run gmail --help                → RPC Level 2 (methods)
npx keepai run gmail drafts.create --help  → RPC Level 3 (method detail)
```

Note: `npx keepai --help` stays as commander's built-in output (Level 0).
This is fine — Level 0 describes client commands (`init`, `run`, `help`,
`status`, `disconnect`), which are client concepts that belong in the client.

## `run` With No Params

### Problem

Currently, running a method with no params sends an empty `{}` to the
server, which either fails with a connector error or succeeds silently
(if the method has no required params).

### Solution

This is handled server-side (11d) — the server validates required params
and returns a helpful error with `text`. No client change needed for this
case.

However, one edge case: `npx keepai run gmail` with no method. Commander
will error because `method` is a required positional arg. Improve this:

```typescript
program
  .command('run <service> [method]')
  .description('Call a service method')
  .action(async (service: string, method?: string, ...) => {
    if (!method) {
      // No method specified — show service help
      const keep = new KeepAI();
      const cols = process.stdout.columns || 80;
      const result = await keep.help(service, undefined, cols);
      console.log(result.text);
      keep.close();
      return;
    }
    // ... normal run logic
  });
```

This makes `npx keepai run gmail` equivalent to `npx keepai help gmail`.

## Pagination Hints

### Problem

When a response contains `nextPageToken`, the user has no way to know
unless they inspect the raw JSON.

### Solution

After printing JSON results, check for pagination signals and print
a footer hint to stderr (so it doesn't mix with JSON on stdout):

```typescript
// After printing run result:
const result = await keep.run(service, method, params);

if (options.raw) {
  process.stdout.write(JSON.stringify(result));
} else {
  console.log(JSON.stringify(result, null, 2));

  // Pagination hint
  if (result && typeof result === 'object' && 'nextPageToken' in result) {
    const token = (result as any).nextPageToken;
    console.error(`\nMore results available. Next page: --pageToken=${token}`);
  }
}
```

Using `console.error` (stderr) so the hint doesn't corrupt JSON output
when piped. In normal terminal use, both stdout and stderr print to screen.

## Terminal Width Passthrough

### Change

Pass terminal columns on all RPC calls that return text:

```typescript
const cols = process.stdout.columns || 80;
```

Already handled in help calls (11c). Ensure it's also passed in the
`run` call as a top-level param so the server can use it for error text:

```typescript
const result = await keep.run(service, method, { ...params, _cols: cols });
```

Use `_cols` prefix to avoid colliding with real param names. The server
extracts and removes it before passing to the connector.

Alternative: don't pass cols on run calls — error text can just use
a fixed 80-column width. Simpler. Go with this for V1.

## Account Auto-Selection Enhancement

### Current Behavior

Works correctly: if one account, auto-selected; if multiple, error
with `--account` hint.

### Enhancement

Make the error message richer (server-side, part of error-help):

```
Error: multiple Gmail accounts available, specify one with --account

Accounts:
  user@gmail.com
  work@gmail.com

Example: npx keepai run gmail messages.list --account=user@gmail.com --q="is:unread"
```

This is a server-side change in rpc-router.ts where the account validation
happens. Add a `text` field to the error response using the same pattern
as 11d.

## Final Client Audit

After all stages, audit cli.ts to verify:

- [ ] No `printServiceHelp()` function (removed in 11c)
- [ ] No formatting of ServiceHelp data
- [ ] `help` command accepts `[service] [method]`
- [ ] `run ... --help` routes to help RPC
- [ ] `run <service>` without method shows service help
- [ ] Error handler prints `error.text` when available
- [ ] Pagination hints on paginated responses
- [ ] Only hardcoded text: Level 0 help (commander) + transport errors
- [ ] SDK `help()` returns `{ text: string }`

## Files Changed

| File | Change |
|---|---|
| `apps/keepai/src/cli.ts` | --help routing on run, method optional on run, pagination hint, no-method redirect |
| `apps/keepd/src/rpc-router.ts` | Account validation error gets text field |

## Testing

- Test `npx keepai run gmail drafts.create --help` shows method help
- Test `npx keepai run gmail --help` shows service methods
- Test `npx keepai run gmail` (no method) shows service methods
- Test pagination hint appears when nextPageToken present
- Test pagination hint does NOT appear with `--raw`
- Test multi-account error shows account list with example
