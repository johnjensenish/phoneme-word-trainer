---
name: Use bun run build for type checking
description: User prefers bun run build (which includes tsc --noEmit) over running npx tsc directly
type: feedback
---

Use `bun run build` to type-check the project, not `npx tsc --noEmit` directly.

**Why:** The project uses bun as its package manager and the build script includes the type check.

**How to apply:** When verifying types compile, run `bun run build` instead of `npx tsc --noEmit`.
