## Why

The reader's tables only sort by one column, as text, and search the long ones. The earlier documentation site's tables do much more with the same HTML: they sort IPs, dates, sizes and versions the way a person reads them, filter each column by its values, take `column:value` in their box, highlight what matched, hide columns, page long tables and hand the view on as Markdown, CSV or a link. The catalog pages now generate long tables (every entity of a type), so the reader needs the same tools to make them usable.

## What Changes

- Every table of a page body (generated catalog tables included), except key/value tables, sorts by its columns with type-aware ordering (IP, date, size, version, number, text) and by several columns with Shift.
- Every table with 2 rows or more gets a toolbar:
  - a filter box that reads `column:value` words;
  - a row count;
  - a filter on each column header listing its values with counts;
  - chips for the active filters, and an empty state with "Quitar filtros";
  - highlighted matches;
  - a columns menu;
  - copy as Markdown, download as CSV, copy a link to the view;
  - full screen.
- Above 50 rows, a table is paged (25, 50, 100 or every row per page).
- A view (sorting, filters, box, hidden columns, page) can be shared as a link: `?tabla=<id>&…` restores it on that table and scrolls to it.
- The state, sorting, filtering, faceting, paging and visibility are TanStack Table's (`table-core` v9, through `@tanstack/react-table`).
- Tables fit the reading column and wrap their cells, instead of scrolling sideways whenever a cell is long.
- The controls are React, from the app's design system (Hint, Popover, Checkbox, Select, Dialog, the shared column filter), mounted over the server-rendered table. The rows stay the server's HTML, so pages read the same without JavaScript and to agents.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `documentation-reader`: adds the requirement for interactive tables, and changes the page view so tables wrap to fit the column instead of scrolling.

## Impact

- `apps/frontend/src/features/docs/page`: new pure modules for kinds, the query, the table state and view, the URL state and the exports, plus a React island over the page's tables, replacing the vanilla sorting and search of `interactive-tables.ts`.
- `global.css`: styles of the table chrome.
- Reuses `DataTableColumnFilter`, `Hint`, `SearchInput` and the `ui` primitives; no new dependency.
- No backend, API or content contract change.
