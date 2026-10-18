## 1. packages/content: shared helpers

- [x] 1.1 Export `listDir` and a new `listVisible` (skips names starting with `.`) from `contract/read/files.ts`, and replace the copies in `pages/site.ts`, `pages/former-names.ts`, `diagrams/read.ts`, `styles/read.ts` and `skills/read.ts`; add their cases to `tests/contract/read/files.test.ts`; verify `rg "function listDir|function listEntries" packages/content/src` finds only `files.ts`
- [x] 1.2 Reconcile `pagePathOf` (`pages/transform.ts`) with the private one in `contract/read/files.ts` as the design says, so `nav.ts` stops importing `transform.ts` for it; verify `bun test` in `packages/content`
- [x] 1.3 Move `STYLES_DIR` and `SKILLS_DIR` to `contract/read/files.ts`, and `pages/former-names.ts` (former names and the contract 1 report) to `contract/versions/former-names.ts`, with its tests mirrored; verify the structure test passes

## 2. packages/content: split catch-all modules

- [x] 2.1 Split `pages/site.ts`: menu overrides (merged with `nav.ts`'s `overriddenTitle`) to `pages/menu-overrides.ts`, ordering, breadcrumbs, previous/next and the home entry to `pages/arrange.ts`, file listing through `contract/read/files.ts`; verify `bun test` and that `site.ts` only orchestrates `readSite`
- [x] 2.2 Split `diagrams/svg.ts` into `diagrams/svg/{edges,boxes,legend,graphics}.ts`, keeping `diagrams/svg.ts` as the entry; verify the diagram tests pass unchanged
- [x] 2.3 Unify the chart helpers in `diagrams/types/kit/`: one `markIds`, one set of data-mark builders (`kit/marks.ts`: `datumOf`, `itemDatum`, `withDatum`, `withLink`; the shape and label builders keep each family's calling convention, since merging them would rewrite every form's calls for no gain), one tenth rounding (`tenth`, `tenthText`), `seriesHue(index, own, palette)` with each caller passing its current palette; move the drawing parts of `layout/axes.ts`, `layout/shapes.ts` and `layout/flow-draw.ts` to `kit/`, leaving pure layout in `layout/`; rename `kit/chart-kit.ts` → `kit/charts.ts`; fix `axes.ts`'s header comment; verify every diagram test passes with no snapshot change
- [x] 2.4 Move link resolution (`resolveTarget`, `resolveLink`, `resolveImage`, `decode`) from `pages/transform.ts` to `pages/links.ts`, and the pages' copies of `element`/`text`/`link`, the component notice and `textOf`/`plainText` to `pages/hast.ts`; verify `bun test`
- [x] 2.5 Split `git/source.ts`: `spawnGit` to `git/run.ts`, the URL credential helpers to `git/urls.ts`, with tests mirrored; verify the git tests pass
- [x] 2.6 Split `pages/search.ts`: ranking to `pages/search/rank.ts`, excerpts and highlights to `pages/search/excerpt.ts`, `pages/search-text.ts` → `pages/search/text.ts`, keeping `pages/search.ts` as the entry; verify the search tests pass
- [x] 2.7 Rename `pages/types.ts` → `pages/page.ts`; delete the functions nothing uses (`knownItem`, `extentOf`, `grid4`, `pathOf`) and drop `export` from names used only in their own file (`rg` each before); verify `check-types` and the structure test

## 3. packages/api

- [x] 3.1 Move the content feature's wiring (repository store, reader, git HTTP handler, `startContentSync`, clone roots, `docsHandler`, `skillsHandler`) to `v1/content/runtime.ts`, so `content/handler.ts` holds only handler methods and `docs/router.ts`/`skills/router.ts` only wire; verify `check-types` and `bun test` in `packages/api`
- [x] 3.2 Add the package-root `src/server.ts` re-exporting what the backend mounts (git HTTP, the MCP HTTP handler, the secret request executor, the editor schema path, cron discovery and events), and point every `apps/backend` import at package-root modules (`context`, `router`, `lifecycle`, `server`); verify `rg '@nonete/api/v1/' apps/backend` finds nothing
- [x] 3.3 Reorganize `v1/mcp/`: `tools/{docs,skills,content,secrets}.ts` each with its input and output schemas, `results.ts` with `textResult`/`errorResult` written once, `handler.ts` → `http.ts`, `server.ts` registering tools only; move `mcp/section.ts` to `docs/section.ts`; mirror the tests; verify the MCP tests pass unchanged in what they assert
- [x] 3.4 Move `secret/cipher.ts` to `src/lib/cipher.ts`, define `requireUserId` once in `src/shared/session.ts` (replacing the copies in `git-credential`, `secret` and `content`'s `ownerOf`), keep the skill type where it is (it is inferred from the skills feature's output schema, which belongs to that feature), and move `shared/releases.ts` into `v1/release/` (as `feed.ts`) updating `scripts/set-version.sh`; add `tests/shared/session.test.ts`; verify `bun test`
- [x] 3.5 Drop `export` from names used only in their own file (`rg` each before) and move `tests/v1/secret/{plan,send,...}.test.ts` under `tests/v1/secret/request/` to mirror `src/`; verify `check-types` and `bun test`

## 4. apps/frontend

- [x] 4.1 Point `pages/me/*.astro` at each slice's barrel and delete `features/profile/index.ts`; publish `ContentRepositoryFormDialog` from `features/admin/content/public.ts` (re-exported by its `index.ts`) and import it there from `admin/git`; verify `check-types`
- [x] 4.2 Split `docs/page/model/page-scripts.ts` into `docs/page/scripts/` (code copy, copy as Markdown, width toggle, sync button, table of contents, search highlight) with an `onDocsPageLoad` exported from `docs/page/public.ts` (re-exported by `index.ts`, so the layout's browser script doesn't pull the slice's Astro components), imported by `layouts/Docs.astro`; verify `check-types`
- [x] 4.3 Move `DocCard` out of `docs/shared/index.ts` to its own entry and make the sidebar import the barrel instead of `docs/shared/model/*`; extract `useFullscreen` and `DocTable` from `docs/tables/components/doc-tables.tsx`; make `llm.txt.ts` import `withOrigin`/`pageMarkdown` from `@nonete/api` instead of `docs/page/index.ts`; verify `check-types` and the frontend tests
- [x] 4.4 Move admin-only code under `features/admin`: `useUserFilterOptions` to `admin/users` (`hooks/use-admin-user-search.ts` and `lib/admin-user-keys.ts` stay, since template code in `components/shared` and `src/hooks` also uses them and may not import a feature); give `auth/sign-up` its `sign-up-content.tsx`; put module-level `const`s declared before imports back after them (Biome's import organizer); verify `check-types`, Biome and the frontend tests

## 5. apps/backend and small packages

- [x] 5.1 Move the cron run-as resolution and consistency report from `apps/backend/src/cron/{index,run-as}.ts` to `packages/api/src/v1/cron/`, exported through `server.ts`, with their tests; `apps/backend/src/cron/index.ts` only creates and starts; verify `check-types` and `bun test` in `packages/api`
- [x] 5.2 Merge `docsMiddleware` and `openApiMiddleware` in `apps/backend/src/routers/docs.ts` into one helper taking the prefix, and replace the template OpenAPI title text and description with colofon's; verify `check-types`
- [x] 5.3 Remove `dotenv` and `zod` from `packages/auth/package.json` and `zod` from `packages/db/package.json` after `rg` confirms no import, and run `bun install` to update `bun.lock` (report if it can't run); verify `check-types`
- [x] 5.4 In `packages/auth`, import `./oauth` as `#auth/oauth`; the two casts in `session.ts` stay for now and go to the user: Better Auth's internal adapter returns the user and session without the plugins' fields, and dropping the casts means reading the session back with `auth.api.getSession`, an extra query on the cron impersonation path that can't be checked without running the app; add the `packages/db` `closing ??=` exception to `references/code-style.md`; verify `check-types`

## 6. Documentation and validation

- [x] 6.1 Update the `stack` references to the new layout: `workspaces.md` (content modules, backend routers, db schema folders, session middleware, auth row), `aliases-and-deps.md` (no relative import left in auth), `api/layering.md` (runtime modules, package-root imports for the backend, `lib/` as infrastructure, `content/reader.ts` as the content feature's public interface), `api/mcp.md`, `frontend/feature-structure.md` (`navigation-and-layouts.md` keeps `isNavLinkActive`, which `site-nav.ts` does use); verify every cited path exists
- [x] 6.2 `bun run check-types`, Biome on the changed files and `bun run test` pass from the repo root
