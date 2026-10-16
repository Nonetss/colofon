## Why

The navbar search (⌘K / Ctrl+K) only matches a page's title, description and the titles of its groups, so a page that talks about something without naming it in the title can't be found. Readers need to find pages by what their body says, with the pages where the words matter most (the title, then a heading, then the text) listed first.

## What Changes

- The backend keeps a full-text index of each repository's pages next to the parsed pages it already caches, rebuilt whenever that cache is (after a sync). It indexes the title, the headings, the description and header fields, the trail of groups and sections, and the body text. No database table, no migration.
- New read-only procedure `v1.docs.search({ query, repository?, limit })` that returns the matching pages ranked by relevance: matches weigh more in the title than in a heading, in a heading than in the description, and in the description than in the body; whole words and prefixes weigh more than approximate matches. Every word must be found in the page (allowing a slight typo in longer words). Each result carries its route, pointing at the section of its best body match when there is one, and a short excerpt with the matched words marked.
- **BREAKING** (behavior): the navbar search's documentation source stops matching the navigation it already loaded and becomes a server-searched source that asks `v1.docs.search` for the settled text, keeping the order the server returns. It needs two characters to search, like every server-searched source.
- The search dialog shows the excerpt of a documentation result, with the matched words highlighted, instead of the page description when the match is in the body.
- The dependency `minisearch` is added to `packages/content`.

## Capabilities

### New Capabilities

- `documentation-search`: the full-text index of a repository's pages, what it indexes, how results are ranked, the typo tolerance, the excerpts and section anchors, and the `v1.docs.search` procedure.

### Modified Capabilities

- `documentation-reader`: "Search of documentation pages" now finds pages by their body too, through the search endpoint instead of the sidebar's navigation read, ordered by relevance and showing an excerpt.
- `web-navigation`: the documentation pages source becomes server-searched (the "Full-list sources are unchanged" scenario of "Server-searched record sources" no longer names it), and record results can show an excerpt with highlighted words.

## Impact

- `packages/content`: text extraction from a page's tree by section and the index build/query (`minisearch`), with unit tests.
- `packages/api`: the index cached in the content reader alongside each `Site`, `v1.docs.search` in `src/v1/docs/` (input, output, handler, router), with unit tests.
- `apps/frontend`: the `doc-pages` search source in `features/app-shell/authenticated/model/surface-search-sources.ts`, the record entry and dialog item to carry and render the excerpt, with unit tests.
- `.agents/skills/stack/references/api/free-text-search.md`: a note on in-memory search for content that doesn't live in the database.
- Memory: one index per synced repository in the backend process; documentation repositories are small (hundreds of pages), so this stays in the low megabytes.
