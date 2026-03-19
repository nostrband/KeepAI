# CLI UX Improvements

Improvements to `npx keepai` CLI based on real usage friction observed when an
AI agent tried to use AgentMail through the CLI for the first time.

## Problems Observed

1. **`help <service> <group.method>` fails on two-level connectors** —
   `npx keepai help agentmail messages.send` returns "Unknown method" even though
   `npx keepai run agentmail messages.send` works fine.  Root cause: connectors
   with two-level help (AgentMail, Stripe, Hetzner) define `METHOD_GROUPS` keyed
   by *group name* (e.g. `messaging`), not by *method prefix* (e.g. `messages`).
   The rpc-router fallback at line 420 checks for prefix match on
   `connector.methods`, but the connector's own `help(method)` returns empty
   `methods: []` first, and the router's "If connector resolved this as a group"
   check (line 415) sees `svcHelp.methods.length === 0` → falls through to
   unknown-method error.

2. **`--key value` (space-separated) silently ignored** — The CLI only parses
   `--key=value` flags (line 115: `arg.startsWith('--') && arg.includes('=')`).
   Passing `--to foo@bar.com` instead of `--to=foo@bar.com` causes the value to
   be silently dropped, and the error says "missing required parameters: to" with
   no hint about the format.

3. **Array params require JSON syntax** — `--to=user@example.com` is passed as a
   string but the connector expects an array. The server-side validation only
   checks `p.required && !(p.name in params)` — it doesn't validate types, so
   the param *is* present but the connector gets a string where it expects an
   array, causing a confusing downstream error or silent malformation.

4. **Shell escaping pitfalls with `!` and special chars** — Using `--text="Hello!"`
   in bash causes history expansion issues. The CLI has no way to avoid shell
   quoting problems for values with special characters.

5. **Help examples guide agents toward fragile patterns** — The method detail
   help (`renderMethodDetail`) shows flag-style examples first, JSON-style second.
   AI agents copy the first example they see and extrapolate from it, so they
   naturally reach for `--key="value with spaces!"` which breaks on special chars.
   The safer `--params '...'` format is shown second and gets ignored.

## Plan

### Change 1: Fix help for group.method on two-level connectors

**Files:** `apps/keepd/src/rpc-router.ts`

The rpc-router `handleHelp()` already has the right fallback logic at lines
419-427 (check prefix match), but it's short-circuited by the earlier check at
lines 414-417. When the connector's `help(method)` returns `methods: []` (because
`method` isn't a group name), the router sees `!methodDef && methods.length === 0`
and proceeds to the prefix check — which should work.

However, the real issue is that `connector.methods` must be populated. For
two-level connectors like AgentMail, `connector.methods` IS `allMethods` (line
1076), so the lookup at line 414 should find `messages.send`.

**Action:** Add a test that exercises `help agentmail messages.send` end-to-end.
If the help *does* work with fresh code, the issue was a stale daemon build.
Either way, add an explicit fast-path: in the connector's `help(method)`, before
the group lookup, check `allMethods.find(md => md.name === method)` first — if
found, return it directly so the router gets a definitive single-method response.

Actually, looking more carefully at the code flow, the connectors that use
METHOD_GROUPS already do this (agentmail.ts lines 1114-1120 checks group first,
then falls back to allMethods find). The router should work. The fix should ensure
the router doesn't get tripped up:

In `rpc-router.ts` `handleHelp()`, restructure the method resolution:

```typescript
// After connector.help(method) returns svcHelp:

// 1. Exact method match → render detail
const methodDef = connector.methods.find((m) => m.name === method);
if (methodDef) {
  const fullHelp = connector.help();
  await this.enrichHelpWithAccounts([fullHelp]);
  return { result: { text: renderMethodDetail(fullHelp, method) } };
}

// 2. Connector resolved as group → render method list
if (svcHelp.methods.length > 0) {
  return { result: { text: renderServiceMethods(svcHelp) } };
}

// 3. Prefix match on method names (e.g. "messages" matches "messages.send")
const groupMethods = connector.methods.filter((m) => m.name.startsWith(method + '.'));
if (groupMethods.length > 0) {
  const fullHelp = connector.help();
  fullHelp.methods = groupMethods;
  await this.enrichHelpWithAccounts([fullHelp]);
  return { result: { text: renderServiceMethods(fullHelp) } };
}

// 4. Unknown → fuzzy error
```

This is essentially the same logic but reordered to check exact match FIRST,
before the group-resolution check. This prevents the case where a connector's
`help()` returns empty methods for a valid method name.

### Change 2: Support `--key value` (space-separated) syntax

**File:** `apps/keepai/src/cli.ts`, lines 114-131

Currently the parser only handles `--key=value`. Add support for `--key value`
by also consuming the next argument when a bare `--key` is found.

```typescript
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) continue;

  if (arg.includes('=')) {
    // --key=value (existing logic)
    const eqIdx = arg.indexOf('=');
    const key = arg.slice(2, eqIdx);
    const value = arg.slice(eqIdx + 1);
    params[key] = parseValue(value);
  } else {
    // --key value (space-separated)
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      params[key] = parseValue(next);
      i++; // skip consumed value
    } else {
      // Bare --flag with no value → treat as boolean true
      params[key] = true;
    }
  }
}
```

Extract the existing JSON/boolean/null detection into a `parseValue()` helper.

### Change 3: Auto-wrap strings for array-typed params

**File:** `apps/keepd/src/rpc-router.ts`, after param presence validation
(line 194)

After checking for missing required params, add type coercion for array params:

```typescript
// Auto-wrap single values for array-typed params
for (const p of methodDef.params) {
  if (p.type === 'array' && p.name in params && typeof params[p.name] === 'string') {
    params[p.name] = [params[p.name]];
  }
}
```

This means `--to=user@example.com` automatically becomes `["user@example.com"]`,
which is the 90% use case. Users can still pass `--to='["a@b.com","c@d.com"]'`
for multiple values, and the CLI's existing JSON detection will parse it as an
array before it reaches the server.

### Change 4: Better error messages for type mismatches

**File:** `apps/keepd/src/rpc-router.ts`

After the missing-params check and the auto-wrap coercion, add basic type
validation that gives actionable errors:

```typescript
// Validate param types
for (const p of methodDef.params) {
  if (!(p.name in params)) continue;
  const val = params[p.name];
  const actual = Array.isArray(val) ? 'array' : typeof val;
  if (p.type === 'array' && actual !== 'array') {
    const text = renderInvalidParam(service, method, p.name, p.type, val);
    return { error: { code: 'invalid_request', message: `...`, text } };
  }
  if (p.type === 'number' && actual !== 'number') {
    // Try to coerce string → number
    const n = Number(val);
    if (!isNaN(n)) { params[p.name] = n; }
    else {
      const text = renderInvalidParam(service, method, p.name, p.type, val);
      return { error: { code: 'invalid_request', message: `...`, text } };
    }
  }
  if (p.type === 'boolean' && actual !== 'boolean') {
    if (val === 'true') params[p.name] = true;
    else if (val === 'false') params[p.name] = false;
    else {
      const text = renderInvalidParam(service, method, p.name, p.type, val);
      return { error: { code: 'invalid_request', message: `...`, text } };
    }
  }
}
```

Note: `renderInvalidParam` already exists in `error-help.ts` (line 124) but is
currently unused. This wires it up.

### Change 5: Add `--stdin` flag for shell-safe param input

**File:** `apps/keepai/src/cli.ts`

Add a `--stdin` option to the `run` command that reads JSON params from stdin,
completely bypassing shell escaping:

```typescript
.option('--stdin', 'Read parameters as JSON from stdin')
```

When `--stdin` is set, read stdin to completion and `JSON.parse()` it before
merging with any `--key=value` flags (flags override stdin, same as `--params`).

```bash
# Heredoc — no escaping needed at all
npx keepai run agentmail messages.send --stdin <<'EOF'
{"inbox_id":"x@agentmail.to","to":["user@example.com"],"subject":"Hello!","text":"Special chars: $100 & more!"}
EOF

# Pipe from another command
jq -n '{inbox_id:"x@agentmail.to",to:["user@example.com"],subject:"Hello!"}' \
  | npx keepai run agentmail messages.send --stdin
```

This is the safest option for programmatic use by AI agents — no shell
interpolation, no quoting rules, no history expansion.

### Change 6: Reorder help examples to guide agents toward safe patterns

**File:** `apps/keepd/src/help-renderer.ts`, `renderMethodDetail()` lines 180-185

Currently the Examples section shows flag-style first, `--params` JSON second.
AI agents copy the first example they see. Swap the order so the safer pattern
comes first:

```typescript
// Examples
if (method.example) {
  lines.push('Examples:');
  lines.push(`  ${buildJsonExample(service.service, method.name, method.example.params)}`);
  lines.push(`  ${buildFlagExample(service.service, method.name, method.example.params)}`);
  lines.push('');
}
```

Once `--stdin` is implemented, add it as the first example for methods that have
string/text body params (likely to contain special characters):

```typescript
if (method.example) {
  lines.push('Examples:');
  // stdin first for methods with free-text params
  if (hasTextParams(method)) {
    lines.push(`  echo '${JSON.stringify(method.example.params)}' | npx keepai run ${service.service} ${method.name} --stdin`);
  }
  lines.push(`  ${buildJsonExample(service.service, method.name, method.example.params)}`);
  lines.push(`  ${buildFlagExample(service.service, method.name, method.example.params)}`);
  lines.push('');
}
```

Where `hasTextParams` checks if any param name suggests free-text content
(e.g. `text`, `html`, `body`, `subject`, `description`, `content`).

Note: `buildFlagExample` (line 261) already single-quotes complex values, which
is good — but agents extrapolate from the pattern and use double quotes for their
own values, which is where `!` breaks. Having `--params` or `--stdin` as the
first example steers them away from this entirely.

## Change Order

1. **Change 3** (auto-wrap arrays) — highest impact, smallest diff, fixes the
   most confusing failure mode
2. **Change 6** (reorder help examples) — tiny diff, steers agents toward safe
   `--params` pattern immediately
3. **Change 2** (space-separated flags) — medium impact, prevents silent param
   drops
4. **Change 5** (stdin) — the proper solution for programmatic use, eliminates
   all shell escaping issues
5. **Change 1** (help group.method) — fix the help routing to be robust for
   two-level connectors
6. **Change 4** (type validation) — nice-to-have, prevents confusing downstream
   errors

## Files Modified

| File | Changes |
|------|---------|
| `apps/keepai/src/cli.ts` | Changes 2, 5: space-separated flags, `--stdin` |
| `apps/keepd/src/rpc-router.ts` | Changes 1, 3, 4: help routing, auto-wrap, type validation |
| `apps/keepd/src/help-renderer.ts` | Change 6: reorder examples, add stdin example |
| `apps/keepd/src/error-help.ts` | No changes needed (renderInvalidParam already exists) |

## Testing

- `npx keepai help agentmail messages.send` → should show method detail
- `npx keepai help agentmail messaging` → should show group methods (already works)
- `npx keepai help agentmail messages` → should show all messages.* methods (prefix match)
- `npx keepai help stripe core` → should show core group methods (already works)
- `npx keepai help stripe charges.create` → should show method detail
- `npx keepai run agentmail messages.send --inbox_id=x --to=user@example.com` → auto-wraps to array
- `npx keepai run agentmail messages.send --inbox_id x --to user@example.com` → space-separated works
- `npx keepai run gmail messages.list --maxResults=abc` → type error, not silent failure
