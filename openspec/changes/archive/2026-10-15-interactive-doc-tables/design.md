## Context

See proposal.md for the motivation. Today `features/docs/page/model/interactive-tables.ts` enhances every `.doc-table` frame with vanilla DOM: a sort button per header (`table-view.ts` with `lib/sort-rows.ts`, one column, text order) and a search box from 8 rows. The model comes from the earlier documentation site's `lib/tablas`, which does it all with `@tanstack/table-core` and hand-built DOM (native popovers, a `<dialog>`, `title` hints).

## Goals / Non-Goals

**Goals:**
- Port the behaviour of the earlier site's tables: kinds, multi-sort, `column:value` box, value filters with counts, chips, highlights, columns, exports, view links, full screen, pages.
- Keep the rows the server's HTML. The page reads the same without JavaScript, to "Copiar en Markdown" and to agents.
- Build the chrome from the design system, following the app's rules: `Hint` and no `title`, `Text`, `ui` primitives, and the shared column filter.

- Make tables fit the reading column: cells wrap instead of the whole table scrolling sideways.

**Non-Goals:**
- Free-text filters per column (the earlier site had them for columns with many values). The shared column filter lists every value with a search box, and the toolbar box takes `column:value`, which covers the same need.
- The earlier site's chart bars that filter a table, and its old hash links (`/webs/#pangolin`).
- Resizing or reordering columns.

## Decisions

### 1. TanStack Table (`table-core` v9) holds the state and the view

Each table is a TanStack table, built with `useTable` from `@tanstack/react-table`, the React adapter that re-exports `table-core` 9.3.1 and that `useDataTable` already uses. Its features are `table-core`'s:

- `rowSortingFeature` (multi-sort with Shift, through `isMultiSortEvent`);
- `columnFilteringFeature` and `globalFilteringFeature`;
- `columnFacetingFeature`, with faceted unique values counted over the other filters;
- `rowPaginationFeature`;
- `columnVisibilityFeature`.

The state is controlled in `useDocTable` in TanStack's own shapes (`sorting`, `columnFilters`, `globalFilter`, `columnVisibility`, `pagination`), so the island can write it to the URL and clear it.

The columns are built with `createColumnHelper().columns([...])`, which types them without casts:
- `sortFn` compares the type-aware keys of `table-kinds.ts`, with `sortUndefined: "last"` for empty cells;
- `filterFn` keeps the values chosen in the column's filter;
- the table's `globalFilterFn` runs the `column:value` terms of `table-query.ts` over the visible columns, through the first column only.

The pure modules that remain are:
- `table-kinds.ts`: kinds and sort keys;
- `table-query.ts`: the box's terms;
- `table-view.ts`: reading the table and the labels;
- `doc-table.ts`: features, columns, chips and the facet options from TanStack's counts;
- `table-url.ts`: the URL;
- `table-export.ts`: the exports.

*Alternative:* a hand-written state and view. Discarded at the user's request: the earlier site uses TanStack Table, and so does the app's `DataTableView`.

### 2. One React island over the server's tables

`DocTables` is mounted once per page in `DocBody` with `client:only="react"`. It is not persisted, so it remounts with every page the router swaps in. On mount it finds every interactive frame and renders one `DocTable` per frame. `DocTable`:

- **reads the DOM once:** headers, rows (the `tr` elements, cell texts, folded texts, sort keys) and the column kinds;
- **turns each header's content into a sort button** (vanilla, as today) and appends a slot for the filter;
- **inserts containers** before and after the frame (toolbar and chips, empty state and pager);
- **renders the controls into those containers through portals:** the shared `DataTableColumnFilter`, `Hint`, `Popover`, `Checkbox`, `Select`, `Dialog`, `Button` and `SearchInput`;
- **applies the view to the DOM in a layout effect:** it reorders the `tbody` rows, hides the cells of hidden columns, sets `aria-sort` and the sort position, and wraps the matches in `<mark>`.

React owns the controls; the table's own nodes are only moved, hidden or marked. That is the same contract `render.ts` has with the page tree.

*Alternative:* render the whole table in React (`DataTableView`). Rejected: the server's HTML would be replaced on hydration, which shifts the layout and leaves the page without its table until the script loads. It also needs the cells' HTML as data.

*Alternative:* port the vanilla toolbar as it is. Rejected: it would bring hand-made popovers, `title` hints and a second visual language next to the app's.

### 3. Column filters reuse `DataTableColumnFilter`

Its contract (`options` with counts, `selected` meaning "kept values", `sort`) is exactly a facet filter. The counts are computed over the other filters, as in the earlier site. Its sort items set a single-column sort, and the header button keeps multi-sort.

### 4. Table ids and the URL

The id is the slug of the closest `h2` or `h3` above the frame, followed by its place under it (`stacks-1`), or `tabla` when there is none. This is computed when the island mounts, in document order. The URL keys are the earlier site's (`tabla`, `orden`, `f.<col>`, `q`, `ocultas`, `pagina`, `filas`), so its links keep working, minus `t.` (free-text column filters). Column ids are the slugs of the headers, made unique with `-2`, `-3`.

### 5. Exports

- **CSV:** from the cell texts.
- **Markdown:** from the cells' DOM. Text is kept, links become `[text](absolute href)`, inline code is kept, and `|` and line breaks are escaped. This is the only DOM-reading part of the exports, and it is tested with happy-dom.
- **Download:** a Blob link, named `<page>-<heading>.csv`.

### 6. Full screen

A `Dialog` whose content takes the table's box (toolbar, frame, pager), moved into it on open and back to its placeholder on close. The portals render into containers inside the box, so they follow it.

## Risks / Trade-offs

- **[React and foreign DOM]** React must not own the `tr`/`td` nodes it moves. → Portals only target containers the island creates, and row moves happen in effects. The island never renders the table body.
- **[Performance on long tables]** Kind detection and folding run once per table. Filtering and sorting are O(n log n) per state change, and only the page's rows are attached. Tables of a few thousand rows stay instant.
- **[Highlight and folding]** Marking relies on the folded text keeping the original's length (as `foldText` does for accents). A node where it does not is left unmarked.
- **[Behaviour change for readers]** Search becomes a filter box with chips. → Same placement and the same 8-row threshold.
