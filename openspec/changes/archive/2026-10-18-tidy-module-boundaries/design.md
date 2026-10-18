## Context

See proposal.md. Constraints: `packages/content` is checked by `tests/structure.test.ts` (areas, one-way imports, no cycles) and imports `#x/y` as `./src/x/y.ts`, so a module path cannot also be a folder index — an entry module can sit next to a folder of the same name (`diagrams/svg.ts` beside `diagrams/svg/`), which keeps the spec's `#diagrams/svg` scenario true. `packages/api` exports `./*` → `./src/*.ts`, which is what lets the backend import `@nonete/api/v1/...` today. Code style forbids casts and `??` chains (`references/code-style.md`).

## Goals / Non-Goals

**Goals:** each touched module has one reason to change; each helper is written once, in the lowest area its users may import; the backend talks to `packages/api` through package-root modules only; the docs describe the result.

**Non-Goals:** see proposal.md, "out of scope". No exported name of `@nonete/content`'s barrel changes; no procedure, route, message or rendered output changes.

## Decisions

**Entry module beside a folder.** Splitting `diagrams/svg.ts` and `pages/search.ts` keeps them as the entry (the functions other modules import) and moves the parts to `diagrams/svg/*.ts` and `pages/search/*.ts`. *Alternative:* `svg/index.ts` — rejected, since `#diagrams/svg` would no longer resolve and the spec names it.

**Chart helpers without a visual change.** `seriesHue` gets one signature, `seriesHue(index, own, palette)`, and each caller passes the palette it uses today (`SERIES_HUES` or `HUES`); `markIds`, the data-mark builders and the tenth rounding are written once in `kit/`. `layout/axes.ts`, `layout/shapes.ts` and `layout/flow-draw.ts` build graphics, so their drawing parts move to `kit/` and `layout/` keeps the pure maths, as the spec says. `kit/chart-kit.ts` becomes `kit/charts.ts`. Snapshot tests must stay identical; that is the check that no colour moved.

**`pages/site.ts`.** `readSite` stays the orchestrator. Menu overrides (`withOverride`, `overridden`, `applyOverride`, the title and icon pickers, merged with `nav.ts`'s `overriddenTitle`) go to `pages/menu-overrides.ts`; the reading order, breadcrumbs, previous/next and home entry go to `pages/arrange.ts`; file listing uses `contract/read/files.ts` (`listDir`, `docFolderPaths`).

**One `listDir`.** `contract/read/files.ts` exports `listDir` and `listVisible` (skips entries starting with `.`); `pages`, `diagrams`, `styles` and `skills` import them. `pagePathOf` exists twice with different answers for the home page; the shared one in `files.ts` gets the transform's behavior only if every caller's tests still pass, otherwise both stay and the difference is named in a comment.

**`git/source.ts`.** `spawnGit` moves to `git/run.ts` (imported by `browse`, `hosting`, `content-folders`) and the URL credential helpers to `git/urls.ts`; clones and sync stay in `source.ts`.

**Former names and contract 1 report.** `STYLES_DIR` and `SKILLS_DIR` move to `contract/read/files.ts` (re-exported where they are today used), so `pages/former-names.ts` can move to `contract/versions/former-names.ts`, next to the version it reports.

**API wiring module.** `v1/content/runtime.ts` builds the repository store, the reader, the git HTTP handler, `startContentSync` and the clone roots; `docsHandler` and `skillsHandler` are built there too, so `docs/router.ts` and `skills/router.ts` only wire. `v1/cron/runtime.ts` already follows this name. The backend imports from package-root modules only: the existing `context`, `router` and `lifecycle`, plus a new `server.ts` that re-exports what HTTP routes mount (git HTTP, the MCP HTTP handler, the secret request executor, the editor schema path, cron discovery and events). *Alternative:* removing the `./*` export — rejected for now, since tests and the frontend may use it; the convention is documented instead.

**MCP layout.** `mcp/tools/{docs,skills,content,secrets}.ts`, each with its input and output schemas; `mcp/results.ts` for `textResult`/`errorResult`; `mcp/handler.ts` → `mcp/http.ts`; `server.ts` only registers tools. Tests under `tests/v1/mcp/` follow.

**Frontend.** `/me` pages import each slice's barrel; `features/profile/index.ts` is deleted (the spec forbids a container domain barrel). `admin/content` publishes `ContentRepositoryFormDialog` from a `public.ts`. `docs/page/model/page-scripts.ts` becomes `docs/page/scripts/` with one module per behavior and an `onDocsPageLoad` exported from the slice's `index.ts`, which `Docs.astro` imports. `DocCard` moves out of `docs/shared/index.ts` to its own entry.

**Backend cron.** The run-as resolution and the consistency report move to `packages/api/src/v1/cron/` (next to `runtime.ts`), exported through `lifecycle`; `apps/backend/src/cron/index.ts` only creates and starts.

**Casts in `packages/auth/src/session.ts`.** Replaced with narrowing (or typed Better Auth helpers). If a type cannot be expressed without a cast, the task stops and asks, as the code style requires. `packages/db`'s `closing ??= …` stays and gets a one-line justification in `code-style.md`'s exceptions.

## Risks / Trade-offs

- [A move changes behavior] → every group ends with `check-types`, Biome and `bun run test`; diagram and page snapshot tests catch rendering changes.
- [Many files touched in one change] → one commit per task group, so each can be reviewed or reverted alone.
- [`bun install` needs the network to rewrite `bun.lock` after removing dependencies] → if it can't run, that task is left for the user and reported.

## Migration Plan

Land group by group; nothing to migrate at runtime.
