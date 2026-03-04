# 11d - Server-Side Validation + Error-as-Help

## Scope

Make every error from the server helpful. When an agent sends a bad request,
the server returns pre-formatted text explaining what's wrong, what's needed,
and what command to run next. Covers: missing params, unknown service/method
with fuzzy suggestions, and invalid param types.

## Error Response Format

Errors that can be helped get a `text` field alongside the existing error:

```typescript
// RPC error response
{
  error: {
    code: 'not_found' | 'invalid_request',
    message: '...',          // existing — short machine-readable message
    text: string,            // NEW — pre-formatted help text for the terminal
  }
}
```

The client checks for `error.text` and prints it if present, otherwise
falls back to `error.message`. This way old clients still work (they
show the short message), new clients show the rich help.

## New File: apps/keepd/src/error-help.ts

### Public API

```typescript
// Missing required parameters
renderMissingParams(
  service: string,
  method: string,
  missing: string[],
  allParams: ParamSchema[]
): string;

// Unknown service with suggestions
renderUnknownService(
  input: string,
  available: string[]
): string;

// Unknown method with suggestions
renderUnknownMethod(
  service: string,
  input: string,
  available: ConnectorMethod[]
): string;

// Invalid parameter type
renderInvalidParam(
  service: string,
  method: string,
  paramName: string,
  expectedType: string,
  actualValue: unknown
): string;

// Fuzzy match helper (not exported, internal)
fuzzyMatch(input: string, candidates: string[], maxResults?: number): string[];
```

### Output Examples

#### Missing required parameters

```
Error: missing required parameters: to, subject, body

Usage: npx keepai run gmail drafts.create --to=<email> --subject=<text> --body=<text>

Run 'npx keepai help gmail drafts.create' for full details.
```

Logic:
- List missing param names
- Build a usage line with `--name=<type>` for each required param
- Footer with help command

#### Unknown service

```
Error: unknown service 'email'

Available services: gmail, notion

Run 'npx keepai help' to see all services.
```

If fuzzy match finds a close candidate:
```
Error: unknown service 'gmal'

Did you mean?
  gmail    Email — read, send, draft, organize

Run 'npx keepai help' to see all services.
```

#### Unknown method

```
Error: unknown method 'draft.create' on gmail

Did you mean?
  drafts.create    Create a draft email

Run 'npx keepai help gmail' to see all methods.
```

If no fuzzy match:
```
Error: unknown method 'foobar' on gmail

Run 'npx keepai help gmail' to see all methods.
```

#### Invalid parameter type

```
Error: 'maxResults' must be a number, got 'abc'

Run 'npx keepai help gmail messages.list' for parameter details.
```

### Fuzzy Matching

Use Levenshtein distance (simple implementation, no dependency needed).
Threshold: distance <= 3 or distance <= half the candidate length.
Return top 3 matches sorted by distance.

```typescript
function levenshtein(a: string, b: string): number {
  // Standard DP implementation, ~15 lines
}

function fuzzyMatch(input: string, candidates: string[], maxResults = 3): string[] {
  const scored = candidates
    .map(c => ({ name: c, dist: levenshtein(input.toLowerCase(), c.toLowerCase()) }))
    .filter(c => c.dist <= Math.max(3, Math.floor(c.name.length / 2)))
    .sort((a, b) => a.dist - b.dist);
  return scored.slice(0, maxResults).map(c => c.name);
}
```

## Server Changes (apps/keepd/src/rpc-router.ts)

### Add parameter validation to service method execution

Currently, the router passes params straight to the connector. Add
validation of required params before execution:

```typescript
// In executeServiceMethod(), after policy check, before execute:

private validateParams(
  service: string,
  method: string,
  params: Record<string, unknown>
): void {
  const connector = this.connectorExecutor.getConnector(service);
  const methodDef = connector.methods.find(m => m.name === method);
  if (!methodDef) return; // shouldn't happen, already validated

  // Check required params
  const missing = methodDef.params
    .filter(p => p.required && (params[p.name] === undefined || params[p.name] === null))
    .map(p => p.name);

  if (missing.length > 0) {
    throw {
      code: 'invalid_request',
      message: `Missing required parameters: ${missing.join(', ')}`,
      text: renderMissingParams(service, method, missing, methodDef.params),
    };
  }

  // Check param types (basic type coercion check)
  for (const paramDef of methodDef.params) {
    const value = params[paramDef.name];
    if (value === undefined || value === null) continue;

    if (paramDef.type === 'number' && typeof value === 'string') {
      const num = Number(value);
      if (isNaN(num)) {
        throw {
          code: 'invalid_request',
          message: `'${paramDef.name}' must be a number`,
          text: renderInvalidParam(service, method, paramDef.name, 'number', value),
        };
      }
    }
  }
}
```

### Update service/method validation with fuzzy matching

Currently, unknown service/method returns a generic `not_found` error.
Add fuzzy matching:

```typescript
// In handleRequest(), where service is validated:

const connector = this.connectorExecutor.getConnector(service);
if (!connector) {
  const available = this.connectorExecutor.getRegisteredServices();
  throw {
    code: 'not_found',
    message: `Unknown service '${service}'`,
    text: renderUnknownService(service, available),
  };
}

// Where method is validated:
const methodDef = connector.methods.find(m => m.name === method);
if (!methodDef) {
  throw {
    code: 'not_found',
    message: `Unknown method '${method}'`,
    text: renderUnknownMethod(service, method, connector.methods),
  };
}
```

### Update handleHelp() with fuzzy matching

The help handler from 11c also validates service/method — apply same
fuzzy matching there:

```typescript
if (!connector) {
  const available = this.connectorExecutor.getRegisteredServices();
  throw {
    code: 'not_found',
    message: `Unknown service '${service}'`,
    text: renderUnknownService(service, available),
  };
}
```

## Client Changes (apps/keepai/src/cli.ts)

### Update error handler to use `text` field

```typescript
function handleError(err: unknown): never {
  if (err instanceof KeepAIError) {
    // Check if error has pre-formatted text from server
    if (err.text) {
      console.error(err.text);
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(err.exitCode);
  }
  // ... existing fallback
}
```

### Update KeepAIError to carry text

```typescript
class KeepAIError extends Error {
  code: string;
  exitCode: number;
  text?: string;     // NEW — pre-formatted server help text

  constructor(message: string, code: string, exitCode: number, text?: string) {
    super(message);
    this.code = code;
    this.exitCode = exitCode;
    this.text = text;
  }
}
```

### Update SDK error mapping

In `sdk.ts`, when catching RPC errors, pass through the `text` field:

```typescript
} catch (err) {
  if (err instanceof RPCCallError) {
    throw new KeepAIError(
      err.message,
      err.code,
      mapExitCode(err.code),
      err.text,             // NEW — pass through server help text
    );
  }
}
```

This requires `RPCCallError` in nostr-rpc to also carry the `text` field.
If it doesn't, extract from the raw error response.

## Files Changed

| File | Change |
|---|---|
| `apps/keepd/src/error-help.ts` | New file — error text renderers + fuzzy match |
| `apps/keepd/src/rpc-router.ts` | Add param validation, fuzzy matching on service/method errors |
| `apps/keepai/src/sdk.ts` | Pass `text` from RPC errors to KeepAIError |
| `apps/keepai/src/cli.ts` | Print `error.text` when available |
| `packages/proto/src/types.ts` | Add optional `text` field to `RPCError` |

## Testing

- Test fuzzy matching: 'gmal' → 'gmail', 'draft.create' → 'drafts.create'
- Test missing params error text includes all required param names
- Test unknown service error lists available services
- Test unknown method error with close match shows "did you mean?"
- Test unknown method error with no match shows just "see all methods"
- Test invalid param type error
- Test that valid requests are unaffected (no false validation errors)
- End-to-end: CLI receives and prints server error text
