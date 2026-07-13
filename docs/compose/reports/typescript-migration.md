---
feature: TypeScript Migration
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-07-03-typescript-migration.md
branch: backup-before-filter
commits: 84fc7ff..91632ed
---

# TypeScript Migration — Final Report

## What Was Built

Migrated the project from JavaScript to TypeScript, adding type safety and better IDE support. Both `src/main.js` (frontend) and `blog/build.js` (build script) were converted to `.ts` files with proper type annotations.

## Architecture

### Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `tsconfig.json` | Created | TypeScript configuration for Vite + Node |
| `vite-env.d.ts` | Created | Vite client type definitions |
| `src/main.js` → `src/main.ts` | Renamed + Typed | Frontend with interfaces for Project, BlogPost, BlogData |
| `blog/build.js` → `blog/build.ts` | Renamed + Typed | Build script with interfaces for PostMeta, PostInfo, PostData |
| `package.json` | Modified | Added typescript, tsx, @types/node; updated scripts |

### Design Decisions

- **Used `tsx` for build script** — Vite handles frontend TS natively, but `blog/build.ts` needs a runtime. `tsx` is simpler than `ts-node` for ES modules.
- **Interfaces over type aliases** — `interface` is preferred for object shapes because it supports declaration merging and produces clearer error messages.
- **`skipLibCheck: true`** — Avoids type errors in third-party `.d.ts` files that we can't control.
- **Optional `prev`/`next` in PostData** — These are added after initial post creation, so they're optional in the interface.

## Usage

```bash
# Development
npm run dev

# Build
npm run build

# Blog only
npm run blog

# Type check
npx tsc --noEmit
```

## Verification

- `npm run build` — passes (Vite build + tsx blog build)
- `npx tsc --noEmit` — passes with zero errors
- `ls src/*.js blog/*.js` — returns "No such file or directory" (all .ts now)

## Journey Log

- [lesson] `marked()` returns `string | Promise<string>` — cast to `string` when sync usage is guaranteed
- [lesson] `readdirSync().filter(f => ...)` needs explicit `f: string` type in strict mode
- [lesson] Vite client types require `vite-env.d.ts` with `/// <reference types="vite/client" />`

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/2026-07-03-typescript-migration.md` | Implementation plan | Complete |
