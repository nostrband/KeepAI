# Build & Run
- Requires Node.js >= 22.0.0, npm >= 10.9.0
- Monorepo using npm workspaces + Turbo
- `npm install` then `npm run build` from root

# UX Tests


# Validation
Run these after implementing to get immediate feedback:

Typecheck: `npm run type-check`
Lint: Not configured

# Operational Notes
Succinct learnings about how to RUN the project:

**Development**:
- `cd apps/ui && npm run build:frontend && cd ../apps/keepd && npm run build:all && npm start` - single nodejs process that hosts background workers and serves the web app

**DB**

# Codebase Patterns
<add when discovered>