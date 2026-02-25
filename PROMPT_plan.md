0a. Study `specs/*` with up to 250 parallel Sonnet subagents to learn the application specifications. Ignore implemented specs in `specs/done/*` and in `specs/new/*`.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 Sonnet subagents to study existing source code in `packages/*` and compare it against `specs/*`. Use an Opus subagent to analyze findings, prioritize tasks, and create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented, linking to corresponding spec files. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents, add checkbox for each item.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

ULTIMATE GOAL: We want to achieve a simple, lovable and complete v1 KeepAI release - it's a safe gate for AI agents to access user services (Gmail, Notion, etc.) 