## 1. Dependency

- [x] 1.1 Add `minisearch` as a dependency of `packages/content` (one workspace only, so pinned there rather than in the root catalog); install with `bun install`

## 2. Search documents and index (`packages/content/src/pages/search.ts`, `search-text.ts`)

- [x] 2.1 Text extraction from a hast tree: body text by section (text before the first heading, then one section per heading with an id: its text and the text up to the next heading), skipping `script` and `style`
- [x] 2.2 Word tokens that keep their offsets in the original text and their folded form, so highlights need no offset mapping
- [x] 2.3 `searchDocumentsOf(site)`: one document per navigation entry (home, pages, sections, catalog type pages; no entity pages) with `title`, `headings`, `meta` (description and the header field values as written), `trail` and `body`, plus its sections; an unparseable page indexed without body
- [x] 2.4 `createSiteSearch(documents)` and `searchSite(index, query, limit)` with the boosts, prefix, fuzzy (one edit from five characters), weights and `AND` from the design; ordering by score, then title, then route; each result with its matched query terms
- [x] 2.5 Excerpt and anchor: no excerpt when every term is in `title`, `meta` or `trail`; otherwise the section with most distinct matched terms, a window of about 160 characters cut at word boundaries with ellipses, highlight ranges mapped to the original text, and `#<heading id>` on the route
- [x] 2.6 Export the public functions and types from `packages/content/src/index.ts`
- [x] 2.7 Unit tests: extraction by section, folding offsets with accented text, each matching scenario of `documentation-search` (body-only word, accents, every word, across fields, prefix, typo, short words not approximated, entity pages excluded) and each ranking and excerpt scenario

## 3. Backend (`packages/api`)

- [x] 3.1 Cache the index per `Site` in a `WeakMap` built lazily inside the docs handler (the reader already replaces the `Site` on sync, so it stays unchanged)
- [x] 3.2 `docsInput.search` (`searchQuery()`, optional `repository`, `searchLimit(10, 20)`) and `docsOutput.search` (`allRepositories`, results with repository, path, href, title, description, trail, excerpt or null, terms)
- [x] 3.3 `search` handler: resolve the scope (named readable repository, or every readable one), query each index, merge by score then title then route, cut to the limit, map routes with `readerRoutesOf`
- [x] 3.4 `search` route in `src/v1/docs/router.ts`: `protectedProcedure`, `GET`, "Docs" tag, English summary and description
- [x] 3.5 Unit tests for the handler: scoped search, every repository with no slug and with an unknown one, limit, `allRepositories`, a sync replacing the site rebuilds the index

## 4. Frontend (`apps/frontend`)

- [x] 4.1 `serverSearchQuery` takes an optional limit; update its tests
- [x] 4.2 `SurfaceSearchEntry` and `SiteNavSearchItem` gain an optional `excerpt` (`text` plus highlight ranges); the hook passes it through
- [x] 4.3 `doc-pages` becomes `defineServerSearchSource` over `orpc.v1.docs.search` with the scope cookie's repository and limit 10, mapping trail (repository name first when `allRepositories`), `keywords: terms` and excerpt
- [x] 4.4 `SurfaceSearchExcerpt` component in the app-shell authenticated slice rendering `<mark>` per range (runs cut by the pure `excerptParts`), and the dialog item showing it instead of the description when present
- [x] 4.5 `getCurrentSearchHref` compares routes without the hash
- [x] 4.6 Check that selecting a result with `#heading` scrolls to that heading after the client navigation (also on the current page): Astro's router sets `location.href` with the fragment after the swap and treats a same-page fragment as an in-page move, so no code is needed
- [x] 4.7 Unit tests: the source mapping (`docSearchEntries`: order, trail prefix, keywords, excerpt), `excerptParts` ranges, current-route matching with a hash (`pageHrefOf`)

## 5. Conventions and validation

- [x] 5.1 Add a section to `.agents/skills/stack/references/api/free-text-search.md` on in-memory full-text search for content that doesn't live in the database (MiniSearch in `packages/content`, cached with the `Site`)
- [x] 5.2 `bun run check-types`, Biome, `bun run tailwind:check` and `bun run test` pass (except 7 git hosting/browse tests of `packages/content` that fail on `git push` disconnects, unrelated to this change)
