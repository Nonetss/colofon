## Context

The search engine lives in `packages/content/src/pages/search.ts`: `createSiteSearch(site)` builds one MiniSearch (7.2) index per `Site`, and `searchSite` runs an AND query with prefix and one-typo matching, then works out the excerpt and the anchor. `v1.docs.search` (`packages/api/src/v1/docs/handler.ts`) caches one index per `Site` in a `WeakMap`, searches each readable repository with the limit, merges the hits by raw score and cuts them to the limit. The MCP `search` tool (`v1/mcp/tools.ts`) formats that same answer.

In the frontend, the navbar dialog (`features/app-shell/authenticated/components/surface-search-dialog.tsx`) gets its records through the record-source registry (`model/surface-search-sources.ts`, `hooks/use-surface-search-records.ts`). Since b742cc6 its only source is `doc-pages`, which reads the scope from the `docs_scope` cookie. `lib/recent-surfaces.ts` is still there but nothing uses it. Documentation pages run their browser behavior from `features/docs/page/model/page-scripts.ts`, which re-runs on `astro:page-load`.

For the motivation, see proposal.md. For the behavior, see the delta specs.

## Goals / Non-Goals

**Goals:**
- Rank results from several repositories against the same statistics, without rebuilding every repository's index when one of them syncs.
- Keep `v1.docs.search` backward compatible: same input, output that only gains fields.
- Keep the record-source registry as the way the dialog gets its records.

**Non-Goals:**
- Stemming, synonyms or any change to the content contract (`doc.config.yaml`). Prefix matching already covers most inflections ("sincro"), and stemming Spanish mixed with English identifiers adds more noise than it removes.
- Semantic or vector search. It would need pgvector and a migration.
- A full results page (`/buscar?q=`). It is a possible follow-up once the dialog has improved.
- Indexing `h4` sections. The reader and the MCP `read` tool only address `h2`/`h3`.
- Fixing the older drift in `web-navigation` ("Searchable surfaces" still describes app surfaces). Only the "Recientes" requirement is rewritten here, because this change touches it.

## Decisions

### 1. One shared index with per-repository replacement

`packages/content` exports `createDocsSearch()`, which returns an object that holds two MiniSearch indexes (pages, entities) and a `Map<slug, { site, ids }>`:

- `update(slug, site)`: a no-op when `site` is the instance already indexed. Otherwise it `discardAll`s that slug's ids and `addAll`s the new documents. MiniSearch's `discard` keeps the document-frequency statistics correct, so the IDF stays global and the other repositories are never rebuilt.
- `search(query, { repositories, limit })`: one query, with `filter: (result) => repositories.has(result.repository)`, where `repository` is a stored field. The pages are sorted once and cut once.

The handler keeps one instance for the life of the process instead of the `WeakMap`. Before each search it calls `update` for every readable `{ repository, site }`. That costs nothing when nothing changed, and it re-indexes lazily after a sync, which is the same freshness as today.

*Alternatives:* normalizing each repository's scores (dividing by the top score) still compares unrelated distributions and distorts the ranking within a repository. Rebuilding one global index whenever any repository changes is simple but makes the cost grow with the total size on every sync.

*Visibility:* the statistics include repositories the caller can't read. Results never do (the filter), and a rarity figure can't reveal any text. This is accepted.

### 2. Entities: a second index fed from the catalog

`Site` gains `catalog: Catalog`. `readSite` already receives it, so it only has to keep it. Entity documents are built from `catalog` with these fields: `key` (id and label), `type` (plural and id) and `values` (the text of the field values, through the existing `valueTexts`). The boost is `key` 6, `type` 2, `values` 1, with the same tokenizer, `processTerm`, prefix and fuzzy rules as pages. The exact-match rule from the spec is applied after scoring: a compact fold (`foldTerm` with the separators `-_:.` and spaces removed) of the query compared with the id and the label. Exact matches go first, then score, then label, type and repository. The route is `routeOf(entityPath(type, id))`.

Building entities from the generated entity pages in `site.pages` was considered and rejected: their body mixes in citations and reverse references, which would give false matches, and the type's plural would have to be dug out of another page.

### 3. Partial fallback

The search first runs `combineWith: "AND"`. When that returns nothing and `wordsOf(query)` has two words or more, it runs again with `"OR"`. Each MiniSearch result's `queryTerms` says which query words matched, so `missing` is the query words not in it. Partial hits are sorted by matched-word count, descending, then by `compareHits`. Entities never fall back. The `terms` field (typed words) is unchanged, so the dialog's local filter (`matchSurface`) keeps partial results.

`missing` is expressed in the tokenizer's words (`db:migrate` → `db`, `migrate`), because that is the unit that matches.

### 4. Extra sections

`bestSection` becomes `rankSections`, which returns the sections that hold at least one word, ordered by count with page order on ties. The first one gives the excerpt and the anchor as today. The next ones with `anchor !== null`, up to two, become `sections: { anchor, heading, excerpt }[]`. The API turns `anchor` into `href` with the existing `withAnchor`.

### 5. API shape

`docsOutput.search` gains `partial: boolean`, `results[].missing: string[]`, `results[].sections: { heading, href, excerpt }[]` and `entities: { repository, type: { id, plural }, id, label, href, exact }[]`, where `exact` is the exact-match rule computed on the server so the browser never reimplements it. The entity limit is a constant (5) in the handler, not an input. The MCP tool extends `SearchHit` and `hitLines` and adds an entities block, as the spec describes.

### 6. Dialog: same registry, one request, scope owned by the dialog

- The source options gain `scope: string | undefined` (the repository the dialog searches, `undefined` = every repository). `useSurfaceSearchRecords` takes it from the dialog and passes it to every source. Only `doc-pages` reads it, and the browser cookie stops being read inside the source. The dialog starts its `scope` state from `readScopeCookie` each time it opens.
- `SurfaceSearchEntry` and `SiteNavSearchItem` gain optional `sections` (sub-results with `href`, `label`, `excerpt`) and `missing`. `docSearchEntries` maps them. The dialog renders sections as indented `CommandItem`s right after their page (same `keywords` as the parent, so cmdk doesn't filter them out) and `missing` as struck-through words.
- Entities and the partial flag aren't records of a surface. A small hook in the same slice, `useDocsSearchMeta`, reuses the `doc-pages` query options builder (same input, so the same query key: TanStack deduplicates it and makes **one** request) with a different `select` that returns `{ partial, entities }`. The dialog renders the "Catálogo" group before the documentation group when any entity is `exact`, and after it otherwise.
- The scope switch reuses `components/ui/tabs.tsx` in the dialog's header, and the empty state gets a `Button` that sets `scope` to `undefined`.

*Alternative:* a dedicated docs-search hook that bypasses the registry. It would be simpler in the dialog, but it drops the registry that `web-navigation` specifies and that the base keeps for future dynamic surfaces.

### 7. Recent pages

`lib/recent-surfaces.ts` is generalized to a keyed list (`readRecentList(list, userId)` / `recordRecent(list, userId, href)`) and keeps its failure handling. The authenticated navbar records `currentPath` under the `doc-pages` list when the path belongs to the surface that declares `searchSource: "doc-pages"` and isn't an entity page (`/<repo>/catalog/<type>/<id>`). The dialog resolves each remembered href against `v1.docs.nav` (the query the sidebar already uses, so usually cached) and walks the nodes to get the title, trail and icon. An href that doesn't resolve is dropped, which covers removed pages and lost access. The current page is left out.

### 8. Highlight on arrival

In `handleSelect`, the dialog writes a one-shot `sessionStorage` entry `{ href, terms }` before navigating. `page-scripts.ts`, on `astro:page-load`, reads it, removes it, and acts only when `href` equals the current path plus hash. It walks the text nodes of the target range (from the anchor's heading to the next heading of the same or higher level, or the article body), builds a `Range` per word that starts with a folded term, and registers them in `CSS.highlights` under `search-match`. On `astro:before-swap` it deletes the highlight. A theme-token rule `::highlight(search-match)` goes in the global stylesheet. Without the Custom Highlight API nothing is highlighted, and nothing breaks.

The Custom Highlight API never touches the DOM, so the SSR markup, the React islands, copying and links all stay as they are. Reloading or going back finds no `sessionStorage` entry. Text fragments (`#:~:text=`) were rejected: they highlight only one occurrence, browsers handle them differently, and they clash with our own anchors.

## Risks / Trade-offs

- [A deleted repository's documents stay in memory until its slug is reused or the process restarts] → They are never returned, because no caller can read a deleted repository, and the memory is a few documents. A `forget(slug)` hook can be added later if it matters.
- [`discard` leaves holes that MiniSearch vacuums later] → The defaults auto-vacuum. Sync rates are low (a cron and manual syncs).
- [The first search after a sync pays for re-indexing that repository] → It is the same cost as today's lazy `WeakMap` rebuild, and now it is limited to one repository.
- [Partial results can look noisy] → They appear only when the strict search finds nothing, they are labeled, and each one says what it lacks.
- [Two hooks reading one query could drift] → Both build their options through the same function, and a test asserts that the query keys are equal.
- [`Site` gains a field] → The test fakes that build a `Site` need `catalog: new Map()`. This is mechanical.

## Migration Plan

No data migration. Deploy normally: the index is built in memory at the first search. Rollback is reverting the change, and `v1.docs.search` callers only ever see additional fields.

