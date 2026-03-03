# 11 - CLI Help UX Refactoring Overview

## Goal

Transform the keepai CLI from a client that fetches structured data and
formats it locally into an ultra-thin terminal that prints pre-formatted
text from the server. All help content, validation errors, and "did you
mean?" suggestions come from keepd.

## Current State

### Client (apps/keepai)
- `help [service]` calls help RPC, receives `ServiceHelp` (structured JSON),
  formats with `printServiceHelp()` locally
- No `help service method` — can't drill into a specific method
- `run ... --help` shows generic commander help, not method-specific
- `run` with missing params sends to server, server returns cryptic error
- No fuzzy matching, no suggestions, no guidance on errors

### Server (apps/keepd)
- `handleHelp()` returns `ServiceHelp | ServiceHelp[]` — structured JSON
  with `ConnectorMethod[]`, params, descriptions
- No text rendering — client does all formatting
- Errors are `{ code, message }` — terse, no guidance
- No param validation before calling connectors
- No fuzzy matching for service/method names

### Connectors (packages/connectors)
- Good baseline metadata: name, description, operationType, params with
  types/required/descriptions, returns string, optional example
- Missing: query syntax docs, response shape examples, "see also" links,
  service-level summary

## Gap Analysis

| Feature | Current | Target |
|---|---|---|
| Help levels | 2 (all services, one service) | 3 (all services, service methods, method detail) |
| Help format | Structured JSON → client formats | Pre-formatted text from server |
| Method params in help | Not visible at service level | Previewed as `(to, subject, body)` |
| Method detail help | Not available | Full params table, examples, response shape |
| Query syntax docs | Not available | Inline in method help |
| Response shape examples | Not available | Shown in method help |
| "See also" links | Not available | Related methods listed |
| Error on missing params | Generic error | Names missing params + shows usage |
| Error on typo | "not_found" | "Did you mean?" with suggestion |
| `--help` on run | Generic commander help | Method-specific help |
| Client formatting code | `printServiceHelp()` | Removed — just `console.log(text)` |

## Refactoring Stages

Five stages, each independently deployable and testable:

1. **[spec 11a]** Enrich connector metadata (packages/proto, packages/connectors)
2. **[spec 11b]** Build server-side text renderer (apps/keepd)
3. **[spec 11c]** New help protocol + client update (apps/keepd, apps/keepai)
4. **[spec 11d]** Server-side validation + error-as-help (apps/keepd, packages/connectors)
5. **[spec 11e]** Client final thinning (apps/keepai)

Each stage has its own spec file with exact file changes.
