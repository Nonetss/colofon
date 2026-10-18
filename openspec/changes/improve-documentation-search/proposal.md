## Why

The documentation search finds pages well inside one repository, but it falls short where readers lean on it most. Across repositories ("Todos" and the MCP) it ranks results by scores computed against different indexes, which are not comparable, so a small repository can push its pages above better matches. One word the docs don't use returns nothing at all. The catalog, the data readers most often look up by name (a variable, a command), can't be searched. A long page that matches in several sections shows only one. An empty dialog offers nothing, the scope is applied without being shown, and once a result opens the reader has to find the matched words again by eye.

## What Changes

- **One index for every repository.** Documents carry their repository, a search keeps only the repositories the caller may read (and the requested one, if any), and the ranking statistics are shared, so results from several repositories are ranked against each other fairly. A repository's documents are replaced when its pages are rebuilt, without rebuilding the others.
- **Catalog entities are searchable.** Each entity is indexed by its id, its label, its type and its field values, and comes back in a separate list (`entities`) of the same answer, at most five, with an exact match on the id or label first. The rule that entity pages are not searched as pages stays.
- **Partial results instead of nothing.** When no page holds every word of a query of several words, the search returns the pages that hold some of them, flags the answer as partial and says which words each result lacks.
- **More than one section per page.** Besides its best section, a result carries up to two more sections that also match, each with its anchor, heading and excerpt.
- **The search dialog** shows the catalog group, the extra sections as sub-results, and the partial flag. It shows the scope and lets the reader switch between the scope's repository and "Todos" for this search, and offers that switch when the scope finds nothing. With an empty query it lists the documentation pages the reader opened most recently.
- **Matched words are highlighted on arrival.** Opening a result marks the searched words in the section it points at (the whole page when it has no section), without altering the page's markup.
- **The MCP `search` tool** lists the matching entities with the arguments for `entity`, says when results are partial, and lists the extra sections with their routes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `documentation-search`: one shared index across repositories filtered per caller, entity documents and their list, the partial fallback, extra matching sections per result, and the new fields of `v1.docs.search`.
- `documentation-reader`: the navbar search's catalog group, sub-results, partial notice, scope switch and the highlight of the matched words on the opened page.
- `documentation-mcp`: the `search` tool's entities, partial notice and extra sections.
- `web-navigation`: the "Recientes" group lists the documentation pages read most recently instead of application surfaces, which the dialog no longer searches.

## Impact

- `packages/content` (`pages/search.ts`, `pages/search-text.ts`): the shared index, entity documents, the partial search and the extra sections.
- `packages/api` (`v1/docs` input, output and handler; `v1/mcp/tools.ts`): the answer's new fields and the tool's text and structured content. `v1.docs.search` keeps its input; its output only gains fields, so current callers keep working.
- `apps/frontend` (`features/app-shell/authenticated` search dialog and its model; `features/docs/page` page scripts; `lib/recent-surfaces.ts`): the dialog's groups, scope switch and recent pages, and the highlight on the opened page.
- No database schema change, no migration, no new dependency.
