# 11c - Help Protocol Change + Client Update

## Scope

Change the help RPC to return pre-formatted text instead of structured JSON.
Update both server and client in lockstep. After this stage, `help` works
at all three levels and the client's formatter is gone.

## Protocol Change

### Request (unchanged shape, new fields)

```typescript
// RPC method: 'help'
// params:
{
  service?: string;    // existing — filter to one service
  method?: string;     // NEW — drill into specific method
  cols?: number;       // NEW — terminal width hint (default: 80)
}
```

### Response (changed shape)

Before:
```typescript
// result was ServiceHelp | ServiceHelp[]
{ result: { service: 'gmail', name: 'Gmail', methods: [...], accounts: [...] } }
```

After:
```typescript
// result is now an object with text
{ result: { text: string } }
```

The `text` field contains pre-formatted terminal output, ready to print.

## Server Changes (apps/keepd/src/rpc-router.ts)

### Modify `handleHelp()`

Current:
```typescript
private handleHelp(service?: string): ServiceHelp | ServiceHelp[] {
  const help = this.connectorExecutor.getHelp(service);
  // enrich with accounts
  return help;
}
```

New:
```typescript
private handleHelp(params: { service?: string; method?: string; cols?: number }): { text: string } {
  const { service, method, cols } = params;

  if (!service) {
    // Level 1: all services
    const allHelp = this.connectorExecutor.getHelp() as ServiceHelp[];
    const enriched = allHelp.map(svc => this.enrichHelpWithAccounts(svc));
    return { text: renderServiceList(enriched, cols) };
  }

  // Validate service exists
  const connector = this.connectorExecutor.getConnector(service);
  if (!connector) {
    // Fuzzy match (handled in 11d, for now just error)
    throw { code: 'not_found', message: `Unknown service '${service}'` };
  }

  const svcHelp = this.enrichHelpWithAccounts(connector.help(method));

  if (!method) {
    // Level 2: service methods
    return { text: renderServiceMethods(svcHelp, cols) };
  }

  // Validate method exists
  const methodDef = connector.methods.find(m => m.name === method);
  if (!methodDef) {
    // Fuzzy match (handled in 11d, for now just error)
    throw { code: 'not_found', message: `Unknown method '${method}' on service '${service}'` };
  }

  // Level 3: method detail
  return { text: renderMethodDetail(svcHelp, method, cols) };
}
```

### Update handleHelp call site

In `handleRequest()`, where `handleHelp` is called, pass the full params
object instead of just `service`:

```typescript
// Before:
const result = this.handleHelp(request.service);

// After:
const result = this.handleHelp({
  service: request.params?.service ?? request.service,
  method: request.params?.method,
  cols: request.params?.cols,
});
```

Note: support both `request.service` (old clients sending service at top
level) and `request.params.service` (new clients) for backwards compat
during rollout.

### Enrich helper stays the same

`enrichHelpWithAccounts()` still adds account info to ServiceHelp before
rendering. No change needed — it operates on ServiceHelp, renderer consumes it.

## Client Changes (apps/keepai/src/cli.ts)

### Update `help` command

```typescript
// Before:
program
  .command('help [service]')
  .description('List available services and methods')
  .action(async (service?: string) => { ... });

// After:
program
  .command('help [service] [method]')
  .description('Explore available services and methods')
  .action(async (service?: string, method?: string) => {
    try {
      const keep = new KeepAI();
      const cols = process.stdout.columns || 80;
      const result = await keep.help(service, method, cols);
      console.log(result.text);
      keep.close();
    } catch (err) {
      handleError(err);
    }
  });
```

### Remove `printServiceHelp()`

Delete the entire `printServiceHelp()` function from cli.ts. No longer needed.

### Update `init` command output

After successful init, the current code calls `help` and formats the
response with `printServiceHelp()`. Change to:

```typescript
// After successful pairing, show available services:
const cols = process.stdout.columns || 80;
const helpResult = await keep.help(undefined, undefined, cols);
console.log(helpResult.text);
```

### Update `status` command output

Same — use text from server instead of formatting locally.

## SDK Changes (apps/keepai/src/sdk.ts)

### Update `help()` method signature

```typescript
// Before:
async help(service?: string): Promise<ServiceHelp | ServiceHelp[]>

// After:
async help(service?: string, method?: string, cols?: number): Promise<{ text: string }>
```

### Update RPC call

```typescript
// Before:
const result = await this.getCaller().call('help', { service });

// After:
const result = await this.getCaller().call('help', {
  service,
  method,
  cols,
});
```

### Keep structured help for SDK users (optional)

If SDK consumers (agentic frameworks) need structured data, add a separate
method:

```typescript
async helpRaw(service?: string): Promise<ServiceHelp | ServiceHelp[]> {
  // Calls a different RPC or passes a flag
}
```

Decision: defer this to later. For now, the text format is sufficient for
both CLI and SDK consumers. SDK consumers parsing the text is not great,
but V1 agents primarily use the CLI, not the SDK. We can add `helpRaw`
when there's a real SDK consumer that needs it.

## Files Changed

| File | Change |
|---|---|
| `apps/keepd/src/rpc-router.ts` | Update `handleHelp()` to use renderer, accept method+cols params |
| `apps/keepai/src/cli.ts` | Add `[method]` arg to help, remove `printServiceHelp()`, use text output |
| `apps/keepai/src/sdk.ts` | Update `help()` signature and RPC call |

## Backwards Compatibility

- Old clients (pre-update) sending `help` RPC will receive `{ text: string }`
  instead of `ServiceHelp`. Their `printServiceHelp()` will fail on this shape.
  This is acceptable because:
  - npx auto-updates the client
  - The window of mismatch is tiny
  - We can add a version negotiation flag later if needed
- Old servers receiving new-style help requests with `method` and `cols`
  will ignore unknown params and return old-style ServiceHelp. The new
  client would need to handle both. Add a simple check:
  ```typescript
  const result = await keep.help(service, method, cols);
  if (typeof result.text === 'string') {
    console.log(result.text);
  } else {
    // Fallback: old server returned ServiceHelp, format locally
    // Keep a minimal fallback formatter for this transition period
    console.log(JSON.stringify(result, null, 2));
  }
  ```

## Testing

- Test help RPC returns text for all three levels
- Test help with unknown service returns error
- Test help with unknown method returns error
- Test CLI `help gmail drafts.create` prints method detail text
- Test `cols` parameter affects rendering (line lengths)
