## Why

An audit of the monorepo after reorganizing `packages/content/src/contract` found the same problems elsewhere: catch-all modules that change for several reasons (`pages/site.ts`, `diagrams/svg.ts`, `api/v1/content/handler.ts`, `api/v1/mcp/tools.ts`, the docs reader's `page-scripts.ts`), helpers copied across files and areas (`listDir` four times, the chart helpers' `markIds` three times, `requireUserId`, the MCP result helpers), features reaching into each other's internals (the backend's 18 deep `@nonete/api/v1/...` imports, `secret/cipher.ts` used by two other features), two barrels that make routes download sibling pages, and `stack` references that no longer describe the code. Each one makes the next change slower or riskier; together they are worth one tidy-up pass while the layout is fresh.

## What Changes

- **packages/content:** one directory listing helper in `contract/read/files.ts` (with a variant that skips hidden entries) used by every area; `pages/site.ts` split into reading, menu overrides and arrangement; `diagrams/svg.ts` split into edges, boxes, legend and typed-form graphics under `diagrams/svg/`; one set of chart helpers in `diagrams/types/kit/` (ids, data marks, rounding, series hues with each form keeping its current palette), with the drawing helpers moved out of `layout/`, which keeps only pure layout; link resolution out of `pages/transform.ts`; one set of hast builders for pages; `git/run.ts` and `git/urls.ts` out of `git/source.ts`; ranking and excerpts out of `pages/search.ts`; the former-names and contract 1 reports moved to `contract/versions/`; a few vague names fixed; unused functions deleted and needless `export`s dropped.
- **packages/api:** the content feature's app wiring (repository store, reader, git HTTP handler, sync start, the docs and skills handlers) in its own module, so routers are wiring only; the backend imports only package-root modules; `mcp/` split into one file per tool group with its schemas, shared result helpers, and `handler.ts` renamed to `http.ts`; `cipher.ts` moved to `src/lib/`, `requireUserId` defined once in `src/shared/`, `shared/releases.ts` moved into `v1/release/`, `mcp/section.ts` moved to `docs/`; needless `export`s dropped; secret request tests mirror `src/`.
- **apps/frontend:** the `/me` pages and the admin git screen import slices instead of barrels that pull sibling pages; the docs reader's page scripts split one file per behavior and mounted through the slice's barrel; `docs/shared`'s barrel stops mixing a server-only component with browser code; `doc-tables.tsx` loses its inline hook; admin-only hooks and helpers move under `features/admin`; the sign-up page gets its page/content split; imports declared after code are put back on top.
- **apps/backend and small packages:** the cron run-as lookup and consistency report move to `packages/api`; the two OpenAPI handler middlewares become one helper and the spec gets a real description; unused `dotenv`/`zod` dependencies are removed from `packages/auth` and `packages/db`; `packages/auth` stops using a relative import and its two casts.
- **Docs:** the `stack` references describe the new layout (workspaces, aliases and deps, API layering, frontend structure).

No behavior, public API, message or visual change. Explicitly out of scope: removing template features or components nothing uses yet (`comments`, `entity-icons`, the unused shared components, `requireAuth`), merging the admin and profile repository screens, splitting `data-table-view.tsx`, `diagrams/drawn.ts` and `organization/handler.ts`, and unifying the chart palettes (a visual change to decide separately).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None: every move keeps the layout rules of `content-package-structure`, `rpc-api` and `frontend-code-organization`, and no behavior changes.

## Impact

- `packages/content`, `packages/api`, `apps/frontend`, `apps/backend`, `packages/auth`, `packages/db` (`package.json` only), `bun.lock`, `scripts/set-version.sh` (the release file path).
- Tests move with the modules they cover; no test changes what it asserts.
- `.agents/skills/stack/references/` files that describe these modules.
