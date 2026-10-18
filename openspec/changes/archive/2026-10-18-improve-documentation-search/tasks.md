## 1. Engine: shared index (`packages/content`)

- [x] 1.1 Add `catalog: Catalog` to `Site` and keep it in `readSite`; update every test fake that builds a `Site` (`catalog: new Map()`); verify `bun run check-types` passes in `packages/content` and `packages/api`
- [x] 1.2 Replace `createSiteSearch`/`searchSite` with `createDocsSearch()` in `packages/content/src/pages/search.ts`: page documents tagged with their repository (stored field), `update(slug, site)` that is a no-op for the same `Site` instance and otherwise discards that slug's ids and adds the new documents, and `search(query, { repositories, limit })` filtered by repository; export it from `packages/content/src/index.ts`
- [x] 1.3 Rework `packages/content/tests/pages/search.test.ts` for the shared index, keeping every existing matching, ranking and excerpt case and adding: the repository filter never returns another repository's page; `update` with the same `Site` doesn't re-index, while a new `Site` replaces only that slug's documents (a page removed in a sync is no longer found); the "Repository size does not bias the ranking" scenario (equal scores across a 1-page and a 50-page repository); a repository's relative order is the same alone and with others; verify with `bun test` in `packages/content`

## 2. Engine: partial answers and extra sections

- [x] 2.1 Add the OR fallback to `search`: run only when AND finds nothing and the query has two words or more, compute `missing` from each result's `queryTerms`, sort by matched-word count and then `compareHits`, and return `partial`
- [x] 2.2 Turn `bestSection` into `rankSections` and add up to two extra sections (with a heading only, ranked by word count with page order on ties, each with its excerpt) to hits that carry an excerpt
- [x] 2.3 Test in `packages/content/tests/pages/search.test.ts`: "No page holds every word" (order and `missing`), "One unknown word finds nothing" (not partial), a full AND match is never partial, "Several matching sections" (order and excerpts), "One matching section" and title-only matches carry no sections; verify with `bun test` in `packages/content`

## 3. Engine: entities

- [x] 3.1 Add the entity index to `createDocsSearch`: documents from `site.catalog` with the fields `key` (id and label), `type` (plural and id) and `values` (field value text through `valueTexts`), boosts 6/2/1, the pages' tokenizer, fold, prefix and fuzzy rules, AND only; rank exact compact-fold matches on the id or label first, then by score, label, type and repository; return each entity's type, id, label, page path and `exact`
- [x] 3.2 Test in `packages/content/tests/pages/search.test.ts`: "An identifier finds its entity" (`DATABASE_URL` → `database-url`, `exact`), "A field value finds an entity", "Exact label beats a mention in a field", "Entities need every word" (with a partial page answer), entities of an unreadable repository are filtered out, and an entity's page is still never a page result; verify with `bun test` in `packages/content`

## 4. API: `v1.docs.search` and the MCP tool (`packages/api`)

- [x] 4.1 Extend `docsOutput.search` in `v1/docs/output.ts` with `partial`, `results[].missing`, `results[].sections` (`heading`, `href`, `excerpt`) and `entities` (`repository`, `type { id, plural }`, `id`, `label`, `href`, `exact`), each with its `.describe()` in English, and update the router's OpenAPI description to mention entities, partial answers and extra sections
- [x] 4.2 Rewrite the `search` handler in `v1/docs/handler.ts` around one `createDocsSearch()` instance: `update` every readable site, search the scoped or readable slugs once, map sections with `withAnchor`, map entities with `routeOf(entityPath(...))`, return at most five entities whatever the limit; drop the `WeakMap` and the per-repository loop
- [x] 4.3 Update `packages/api/tests/v1/docs/handler.test.ts`: scoped and every-repository searches return pages and entities only from the readable repositories (a user's own repository is invisible to another user), "Entities are bounded apart" (8 entities and 3 pages with limit 10 → 3 and 5), partial and missing words reach the output, section `href`s carry the anchor, and a sync (new `Site`) is reflected; verify with `bun test` in `packages/api`
- [x] 4.4 Extend the MCP `searchTool` in `v1/mcp/tools.ts`: the partial notice before the results, the missing words per result, the extra sections with heading, route and excerpt, an entities block after the pages with `repository`, `type` and `id` for `entity`, a "nothing found" text only when there are no pages and no entities, and the new structured content fields
- [x] 4.5 Test in `packages/api/tests/v1/mcp/tools.test.ts` (or `content-tools.test.ts`, wherever `searchTool` is covered now): the "Extra sections", "Partial answer" and "Matching entity" scenarios, plus "No results" with neither pages nor entities; verify with `bun test` in `packages/api`

## 5. Frontend: dialog data (`apps/frontend`)

- [x] 5.1 Add `scope: string | undefined` to the record-source options in `model/surface-search-sources.ts` and `hooks/use-surface-search-records.ts`; make `doc-pages` read it instead of the cookie, and pull its query options into one exported builder (`docsSearchQuery`) that both consumers use
- [x] 5.2 Add optional `sections` and `missing` to `SurfaceSearchEntry` and `SiteNavSearchItem` (`lib/site-nav.ts`), and map them in `model/doc-search-entries.ts` (each section's trail stays the page's, with the section's heading as its label)
- [x] 5.3 Add `hooks/use-docs-search-meta.ts` in the same slice: the same `docsSearchQuery` with a `select` returning `{ partial, entities, entitiesFirst }` (`entitiesFirst` = any entity `exact`)
- [x] 5.4 Test: extend `tests/unit/features/app-shell/authenticated/doc-search-entries.test.ts` for sections and missing words; add a test that `docsSearchQuery` builds the same query key for both consumers and passes `scope` as `repository` (`undefined` for every repository); test the meta `select` (`entitiesFirst` true only with an exact entity); verify with `bun test` in `apps/frontend`

## 6. Frontend: dialog UI

- [x] 6.1 In `components/surface-search-dialog.tsx`, own the `scope` state (initialized from `readScopeCookie` every time the dialog opens), show the switch with `components/ui/tabs.tsx` (scope repository | "Todos") only when the scope is a repository, and pass `scope` to both hooks; verify that closing and reopening resets it and that the cookie is never written
- [x] 6.2 Render the extra sections as indented `CommandItem`s right after their page, with the parent's keywords so cmdk keeps them; render the missing words struck through, and a partial notice ("Ninguna ficha contiene todas las palabras") above the documentation group
- [x] 6.3 Render the "Catálogo" group (label, type, the repository when several are searched, the catalog data icon) before the documentation group when `entitiesFirst`, after it otherwise; selecting an entity opens its `href`
- [x] 6.4 Update the empty state: the copy mentions pages and catalog entries, and when the scope is a repository it offers a button "Buscar en todos los repositorios" that sets `scope` to `undefined`
- [x] 6.5 Extract the pure helpers this group adds (ordering of the groups, the section items' keywords) into the slice's `model/` with tests under `tests/unit/features/app-shell/authenticated/`; verify with `bun test` in `apps/frontend`

## 7. Frontend: recent pages

- [x] 7.1 Generalize `lib/recent-surfaces.ts` to keyed lists (`readRecentList(list, userId)`, `recordRecent(list, userId, href)`), keeping the per-user scoping, the limit of five and the swallowed storage failures; update `tests/unit/lib/recent-surfaces.test.ts` (separate lists don't mix, users don't mix, malformed JSON gives an empty list)
- [x] 7.2 Record visits from the authenticated navbar: `currentPath` goes to the `doc-pages` list only when it belongs to the surface declaring `searchSource: "doc-pages"` and isn't an entity page; put the check in a pure helper with tests (a page, a home and a catalog type page are recorded; an entity page, `/me` and `/admin/...` aren't)
- [x] 7.3 Add a helper that resolves a remembered href against `v1.docs.nav` into title, trail (repository first) and icon, or `null` when it no longer resolves, reusing `features/docs/shared` nav types; test it (resolves a nested page, drops a removed page and a repository no longer listed)
- [x] 7.4 Show the "Recientes" group in the dialog while the query is empty, using the `v1.docs.nav` query (enabled while open), leaving out the current page; with nothing to show, keep the current "Escribe para buscar" hint

## 8. Frontend: highlight on arrival

- [x] 8.1 Add a pure helper (in `features/docs/page/model/`) that, given a text and folded search terms, returns the ranges of words starting with any term, accents and case aside; test it (accents, case, prefix only at word starts, several terms, no terms)
- [x] 8.2 In the dialog's `handleSelect`, write the one-shot `sessionStorage` entry `{ href, terms }` before navigating (wrapped in try/catch); in `page-scripts.ts`, on `astro:page-load`, read and remove it, act only when it matches the current path and hash, compute the target range (the anchor's heading up to the next heading of the same or higher level, or the article body), and register the ranges in `CSS.highlights` as `search-match` when the API exists; delete the highlight on `astro:before-swap`
- [x] 8.3 Add the `::highlight(search-match)` rule with theme tokens for light and dark to the frontend's global stylesheet; verify with `bun run tailwind:check`

## 9. Conventions and validation

- [x] 9.1 Update `.agents/skills/stack/references/api/free-text-search.md` (and `references/api/mcp.md` if it describes the search tool's output) wherever it describes the documentation search, so it states the shared index, entities, partial answers and extra sections
- [x] 9.2 Run `bun run check-types`, Biome (`bunx biome check .`) and `bun run test` from the repo root, and make sure all three pass
