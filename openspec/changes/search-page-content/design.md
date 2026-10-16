## Context

The navbar search dialog (`features/app-shell/authenticated/components/surface-search-dialog.tsx`) lists documentation pages through the `doc-pages` source in `model/surface-search-sources.ts`, a full-list source over `v1.docs.nav`: it flattens the navigation of the scope's repositories and the dialog matches every typed word as a substring of the title, description, group titles or section label (`matchSurface`). Bodies are never searched.

Pages are not in the database. `createContentReader` (`packages/api/src/v1/content/reader.ts`) parses each clone into a `Site` on first read and caches it per clone folder in `sites`, dropping the entry when a sync changes the clone. Every `SitePage` already has its sanitized hast `tree` (null when unparseable), its `headings` with ids, its `header` (title, description, fields) and its breadcrumbs; `Site.nav` and `Site.home` say which pages the navigation lists.

The registry already supports server-searched sources (`defineServerSearchSource`, `serverSearchQuery`, debounce, section words stripped by `serverSearchText`, extra `keywords` per record), but none uses it yet.

## Goals / Non-Goals

**Goals:**

- Find pages by their body, headings and header fields, ranked by where the words appear.
- Tolerate a slight typo in longer words, and match prefixes.
- Show an excerpt with the matched words and land on the section that holds them.
- No database table and no migration; the index follows the lifecycle of the parsed pages.

**Non-Goals:**

- Spanish stemming or synonyms ("configurar" finding "configuración" only works through the prefix "configura").
- Searching entity pages, the admin screens or file contents outside the pages.
- A dedicated search results page; the dialog stays the only UI.
- Persisting the index across backend restarts.

## Decisions

### MiniSearch, in `packages/content`

The index is built and queried with MiniSearch (BM25 ranking, per-field boosts, prefix and fuzzy matching, `combineWith: "AND"`), a small dependency-free library, added to `packages/content` (the only workspace that uses it, so not in the root catalog). `packages/content` owns turning a `Site` into search documents and the query logic, as pure functions with unit tests in the `pages` area (`src/pages/search.ts`, with the text extraction and folding in `src/pages/search-text.ts`), so no new area or dependency direction is added to `content-package-structure`, exported from the package's `index.ts`: `searchDocumentsOf(site)`, `createSiteSearch(documents)` and `searchSite(index, query, limit)`. `packages/api` only caches it and maps results to the wire.

*Alternatives:* a hand-written matcher (substring plus weights) would need its own tokenizer, scoring and edit distance, and would rank worse; PostgreSQL full text (`tsvector` with `setweight`, `ts_rank`, `ts_headline`) brings Spanish stemming but needs a table kept in sync with every clone and a migration, which is out of proportion for repositories of hundreds of pages; an index shipped to the browser would download every page's text on opening the dialog.

### What is indexed

One document per page the navigation lists (`Site.home`, every page and section in `Site.nav`, catalog type pages included; entity pages excluded), with the fields:

| Field | Boost | Source |
|---|---|---|
| `title` | 8 | the entry's title (what `menu.yaml` or the header says, as the sidebar shows it) |
| `headings` | 4 | text of `page.headings` |
| `meta` | 2 | description and the header field values as written (a `ref` by its slug) |
| `trail` | 2 | titles of the groups and sections above the page |
| `body` | 1 | text of the tree, outside headings |

Words are runs of letters, digits and combining marks; each is folded (NFD, marks removed, lowercase) as a term. The body text is the text nodes of the tree, skipping `script` and `style`; code blocks and table cells are included, since readers search for configuration keys and values.

Besides the indexed fields, each document keeps its sections for excerpts: the text before the first heading (no anchor) and, per heading with an id, that heading's text and the text up to the next heading of any depth.

### Query options

`prefix: true`, `fuzzy: (term) => term.length >= 5 ? 1 : 0` (an edit distance of one), `weights: { prefix: 0.5, fuzzy: 0.25 }` so that exact > prefix > typo, `combineWith: "AND"`, `boost` as in the table. MiniSearch's score already includes BM25's term frequency normalized by field length. Results are sorted by score, then by title (Spanish collation), then by route, so equal scores keep a stable order.

### Excerpt and anchor

From MiniSearch's `match` (each matched index term → the fields it was found in) the query decides: when every query term was found in `title`, `meta` or `trail`, no excerpt and the page's route. Otherwise it scores each section by the number of distinct matched terms it contains (folded comparison), takes the best one (first on a tie), finds the first occurrence of a matched term, and cuts a window of about 160 characters around it at word boundaries with `…` at cut ends. Highlights need no offset mapping: every word token keeps its offsets in the original text along with its folded term, and a token is highlighted when its term is one the query matched. The route gets `#<heading id>` when the section has a heading.

### Cached with the `Site`

The docs handler keeps a `WeakMap<Site, SiteSearch>`: the index is built on the first search after a `Site` is built and is garbage-collected with it, so it is rebuilt exactly when the pages are and never outlives them. The reader is unchanged, since it already replaces the `Site` on every sync. Builds are lazy so the nav and page reads never pay for it.

### `v1.docs.search`

`src/v1/docs/` gets `docsInput.search` = `{ query: searchQuery(), repository: z.string().optional(), limit: searchLimit(10, 20) }`, `docsOutput.search` = `{ allRepositories: boolean, results: [{ repository: { slug, name }, path, href, title, description, trail, excerpt: { text, highlights: [{ start, end }] } | null, terms }] }`, a `search` handler method and a `protectedProcedure` route with `method: "GET"` under the "Docs" tag. The handler resolves the scope like `resolveScope`: the slug when it names a readable repository, every readable one otherwise; searches each repository's index with the limit, merges by score (then title, route) and cuts to the limit. `terms` are the query's words as typed (split at spaces, folded), all of which the page holds, so the dialog's local filter keeps a body or typo match, even for a word the tokenizer splits (`192.168`). `allRepositories` is true when more than one repository was searched, which tells the dialog to prefix the trail with the repository's name as the nav-based source did.

*Alternative:* one index across every repository would give comparable BM25 scores, but would be rebuilt whenever any repository syncs and couldn't follow each `Site`'s cache. Per-repository scores differ only in their IDF, which is acceptable for merging a handful of repositories.

### Frontend source

`doc-pages` becomes `defineServerSearchSource("Documentación", …)` over `orpc.v1.docs.search.queryOptions`, with `repository` from the scope cookie (`readScopeCookie(document.cookie)`, undefined when there is none) and `limit: 10`. `serverSearchQuery` takes an optional limit. `select` maps each result to a `SurfaceSearchEntry` with `href`, `trail` (with the repository's name first when `allRepositories`), `label`, `description`, `keywords: terms` and a new optional `excerpt`. The dialog's `SiteNavSearchItem` gains `excerpt`, and the item renders it through a small `SurfaceSearchExcerpt` component in the slice (`<mark>` per range, styled with the theme tokens) in place of the description. `getCurrentSearchHref` compares routes without their hash so a result pointing at a section of the current page is still marked as current.

Navigation with a hash goes through the existing `navigate` (Astro's `navigate`), which scrolls to the fragment after the swap; selecting a section of the current page navigates too (only an identical `href` is skipped).

## Risks / Trade-offs

- [The first search after a sync builds the index] → building is linear in the text of the pages (tens of milliseconds for hundreds of pages); it only happens once per sync and per repository.
- [Fuzzy matching adds noise in large repositories] → limited to words of five characters or more, one edit, weighted lowest, and `AND` across words.
- [BM25 scores of different repositories aren't strictly comparable] → acceptable for the few repositories of a deployment; revisit with a combined index if "Todos" ranks oddly.
- [The dialog needs two characters before listing pages, where one used to match locally] → same rule as every server-searched source; one-character queries were rarely useful.
- [Memory grows with the text of every repository] → the index holds terms and postings, not copies of the trees; sections for excerpts reuse the extracted text. Low megabytes per repository.
- [Excerpt ranges could drift from the original text] → ranges come from token offsets in the original text, covered by unit tests with accented and decomposed characters.
- [Heading ids keep accents (`resolución-inversa`)] → the href carries the id as is; browsers match the decoded fragment against the id, and Astro's router scrolls to it after the swap and on same-page moves.

## Migration Plan

No data migration. Deploy backend and frontend together: the new frontend calls `v1.docs.search`, which an older backend lacks (the source then fails and the dialog still shows the surface results). Rollback is reverting the change.

## Open Questions

None blocking. Boost values are a starting point to tune against `doc-example/` during implementation.
