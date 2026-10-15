## 1. Pure model

- [x] 1.1 Add `model/table-kinds.ts` (kinds ip/date/size/version/number/text, 90 % detection, sort keys, empty cells, comparison) ported from the earlier site; verify with unit tests for each kind, mixed columns and empty cells
- [x] 1.2 Add `model/table-query.ts` (folded words, `column:value` terms by exact or unique prefix header, row matching over visible columns); verify with unit tests
- [x] 1.3 Turn `model/table-view.ts` into the table state and view: columns with unique slug ids, `TableState`, multi-sort with kinds, box and value filters, facet options with counts over the other filters, pagination (toolbar from 2 rows, pages above 50, 25 per page), chips and the row label; update its tests and verify every rule of the spec's Sorting, Toolbar and Pages paragraphs
- [x] 1.4 Add `model/table-url.ts` (state to `tabla`/`orden`/`f.`/`q`/`ocultas`/`pagina`/`filas` and back, skipping what no longer applies) and the table id from its heading; verify with unit tests including the "Sharing a view" scenario
- [x] 1.5 Add `model/table-export.ts` (CSV with `;`, CRLF and BOM; Markdown table from cell elements with absolute links; file name from page and heading); verify with unit tests under happy-dom

## 2. Island

- [x] 2.1 Add `components/doc-tables.tsx`: find the interactive frames on mount, prepare headers and containers, and render a `DocTable` per frame; mount it in `doc-body.astro` with `client:only="react"`, and drop the vanilla `mountTables` from `page-scripts.ts`; verify with `check-types`
- [x] 2.2 `DocTable`: state, DOM application in a layout effect (row order, hidden cells, `aria-sort`, sort position, `<mark>` highlights), header sort buttons with Shift for multi-sort; verify the highlight helper with a happy-dom unit test
- [x] 2.3 Toolbar: filter box (Escape clears), count, column filters through `DataTableColumnFilter` in each header, chips with "Quitar filtros", empty state, columns menu, copy Markdown, download CSV, copy link, full screen `Dialog`, pager with `Select`; every icon-only control with `aria-label` and `Hint`; verify with `check-types` and Biome
- [x] 2.4 Restore a view from the URL on mount and scroll to it; verify by unit test of the URL parsing and a manual check the user runs
- [x] 2.5 Styles in `global.css` for the toolbar, chips, sort position, highlights and full screen, using the design tokens; verify with `bun run tailwind:check`

## 3. Docs and validation

- [x] 3.1 Describe the interactive tables in the stack skill (`references/frontend/navigation-and-layouts.md`) and in the guide repository's page on Markdown if it mentions tables; verify every cited path exists
- [x] 3.2 Run `bun run check-types`, `bunx biome check .`, `bun run tailwind:check` and `bun run test`, and verify all pass
