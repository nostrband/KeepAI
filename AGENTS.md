# Build & Run
- Requires Node.js >= 22.0.0, npm >= 10.9.0
- Monorepo using npm workspaces + Turbo
- `npm install` then `npm run build` from root
- `npx turbo run test` to run all tests
- `npx turbo run build --filter=@keepai/proto` to build a single package

# Validation
- Typecheck: `npm run type-check`
- Tests: `npx turbo run test` (vitest)
- Build: `npm run build`

# Codebase Patterns
- Proto types exported from `@keepai/proto` (types.ts, errors.ts, constants.ts)
- DB stores use better-sqlite3 sync API, row types map snake_case → camelCase
- Each store takes `Database.Database` in constructor
- `KeepDBApi` composes all 7 stores
- Migrations use `user_version` pragma

# Releasing
- The root `package.json` version and `apps/electron/package.json` version MUST always be kept in sync. electron-builder uses the root version as the app version baked into the binary. A mismatch causes the auto-updater to see a phantom update.
- When bumping versions for a release, update both files together.
