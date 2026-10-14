# Data tables

Every resource list is a data table on TanStack Table v9 (`@tanstack/react-table`): the `/admin` pages (API keys, users, organizations, teams, plugins, sessions, logs, traces), the organization detail and team member sheets, `/crons` and the run history of `/crons/{id}`. `EntityList` stays as the template's non-tabular list and has no production consumer.

## Pieces

| Piece | Path | Role |
| --- | --- | --- |
| `useDataTable`, `DataTableColumnMeta`, `columnLayoutOf`, `columnPreferenceProps`, `useLocalDataTable` | `apps/frontend/src/hooks/use-data-table.ts` | The table instance with only the column features (visibility, order, sizing, resizing, single-column sorting done outside the table, `manualSorting`), the column meta type, and the helpers below |
| `useColumnPreferences` | `apps/frontend/src/hooks/use-column-preferences.ts` | Column visibility, order and widths in `localStorage` under `nonete:table-columns:<tableId>`, parsed defensively (a column with `enableResizing: false` always keeps its declared `size`), debounced writes, reset |
| `useSortQueryParam` | `apps/frontend/src/hooks/use-sort-query-param.ts` | A page table's sort in the URL (`?sort=` + `?order=`), dropped at the default; returns `SortingState`, its setter and `{ sort, order }` for a server read |
| `sortRows` | `apps/frontend/src/lib/sort-rows.ts` | Browser sort of rows loaded at once; rows without a value last in both directions |
| `DataTableView` | `apps/frontend/src/components/shared/data-display/data-table-view.tsx` | The whole rendering: header, columns menu, rows, display controls, heading rows, expandable detail rows, compact layout |
| `DataTableIdentityCell`, `DataTableStatusCell` | `apps/frontend/src/components/shared/data-display/data-table-cell-content.tsx` | The identifying cell (primary over secondary, as a route link, an open button or text, with an optional `leading` avatar, icon or tile outside the control) and the status cell (dot plus tag) |
| `RowActions`, `RowActionItems`, `RowActionDescriptor` | `apps/frontend/src/components/shared/data-display/row-action-items.tsx` | Row actions from typed descriptors in the kebab menu ("Acciones para X", destructive items after a separator); `EntityList` uses the same renderer |
| Header, columns menu, cells, dense classes, drag list | `data-table-header.tsx`, `data-table-columns-menu.tsx`, `data-table-cells.tsx`, `dense-table.ts`, `sortable-list.tsx` (same folder) | Used through `DataTableView` |
| `DataTableColumnFilter`, `DataTableFilter`, `toggleFilterValue` | `apps/frontend/src/components/shared/data-display/data-table-column-filter.tsx` | Excel-style value filter of a column: header icon (or compact button) opening sort A→Z/Z→A, search, "Seleccionar todo" (clicked with every value kept, it unchecks them all so one can be picked; the column filters nothing until one is checked, and closing the panel goes back to all), "Solo estos resultados" and a checkbox per value with its count |
| `SortControls` | `apps/frontend/src/components/shared/resource/sort-controls.tsx` | Key select plus direction toggle, the compact layout's ordering |

## Declaring a table

- Columns live in a `*-columns.definition.tsx` next to the slice, built with `createColumnHelper<DataTableFeatures, Row>()` as **module-level constants**, with the layout (`columnLayoutOf(columns)`), the sort keys (`as const` tuple), the default ordering and the sort values next to them. Pass module-level constants to the hooks: they are memoized on identity.
- Every column has an explicit `id`, `size` (plus `minSize`/`maxSize` where it matters) and `meta`: `label` (columns menu, resize handle, compact field label), `reorderable` (`false` for the identifying column and row-control columns), optional `cellClassName`/`headerClassName` (`text-right tabular-nums` and `text-right` over numbers), `defaultHidden`, `compact` and `rowRendered`.
- Hiding and sorting are opt-in per column (`enableHiding`, `enableSorting`). A sortable column's `id` is its sort key.
- `meta.compact` places a column in the compact layout: `"primary"` (the identifying cell, the row's heading), `"status"` (next to the row controls), `"omit"` (left out because another cell or the expanded detail already shows it). Unset, it is a labelled field. Display columns always go with the row controls.
- Cells that need the page (an open callback, an inline select, data from another query, the viewer's role) are not written in the column: the column is a display column (no accessor) or an accessor column with `meta.rowRendered: true` (keeps its accessor so it still sorts), and the page renders it in `DataTableView`'s `renderControl(row, columnId)`.
- Row actions are a display column rendering `RowActions` with module-level descriptors and a typed row context; inline icon controls of the row go in the same column, before the menu (`/crons`' "Acciones": pause or lock, then the menu). `RowActions` renders nothing when no descriptor is visible to the viewer.
- A column that doesn't apply to the viewer at all (only controls they can't use) goes in `useDataTable`'s `forcedHidden` and `DataTableView`'s `hiddenColumnIds` (the same stable array): hidden, unlisted, never written to the preferences.
- `renderControl(row, columnId, expandToggle)` receives the row's ready-made expand toggle (`null` without a detail), so a table can show it inside its own "Acciones" column (sessions, runs) instead of a separate column; keep fixed-width slots there so the icons line up across rows.
- An expandable table declares the `DATA_TABLE_EXPAND_COLUMN` display column (last, `enableResizing: false`) and passes `renderDetail` (plus `hasDetail` when only some rows have one, and `detailLabel`; `detailClassName` merges over the detail cell's `px-3 pt-0 pb-4` for a detail that needs less room, as the cron run history does with `py-1.5`). The expansion state lives in `DataTableView`.
- Value filters are data, not nodes: pass `filters={{ [columnId]: { options, selected, onChange } }}` to `DataTableView` and filter the rows yourself before the table. `selected` empty means every value; store a shared empty constant so `useQueryParam` drops the param. Options carry the counts under the other filters. A column with too many values to list passes `search: { query, onQueryChange, isLoading, hint }`: the caller runs the search (the users and sessions tables use `useAdminUserSearch`, with labels kept by `useUserFilterOptions` from `features/admin/shared`) and passes the kept values plus the results as options; checked means kept, there is no "Seleccionar todo". A paginated table sends its filters to the procedure (users: `ids`, `roles`, `statuses` on `adminUser.list`; sessions: `statuses`, `userIds`; logs: `userIds`, `types`, `methods`, `statuses` on `logs.query`; runs: `statuses`) and pages with infinite scroll (`useInfiniteScroll` + `InfiniteScrollSentinel` as `footer`), never page buttons. Pass `emptyMessage` so the table and its filters stay when nothing matches, as `<FilteredEmpty message onClear />` (`components/shared/data-display/filtered-empty.tsx`; `clearable={false}` hides the action when no filter is active; `/crons`: `features/crons/overview/model/cron-filters.ts`). A page filtered this way has no `ResourceFilters` panel or chips; filters that are not a list of values (the logs' path search and day range) sit in one row above the table, in `ResourceOverview`'s `filters` slot.
- `rowState.muted` mutes the row's text (`text-muted-foreground`), never its opacity: dimmed rows read as dark in the dark theme.
- Heading rows (runs by day) come from `groupOf(row) → { key, heading }`: a heading is inserted whenever the key changes, so groups follow the rows' order and span the visible columns.

## Sort ownership

- A table on its own page keeps its sort in the URL with `useSortQueryParam(keys, defaultOrdering)`. The default reproduces the order the list had before (`createdAt desc`, `name asc`…); `null` for a list kept in the order it arrives in (API keys, plugins).
- A table inside a sheet keeps it in local state: `useLocalDataTable({ tableId, rows, columns, layout, getRowId, sortValues })` bundles the preferences, the local sort and `sortRows`.
- A list loaded at once sorts in the browser: `sortRows(filteredRows, sorting, sortValues)` after the filters, with a `*SortValues` map (or a factory when a value comes from another query, e.g. the organization name of a team).
- A paginated list sorts on the server: the ordering goes into the query input (so it is part of the query key and a change restarts from page one), and only the columns the procedure can order by are sortable. Sessions use the caller-ordered keyset (`references/api/sorted-lists.md`), logs and cron runs a direction, users Better Auth's `sortBy`/`sortDirection` with the offset reset.
- Prefer one table with the grouping key as a sortable column (`/crons` and its tag) over one table per group. If a page ever needs several tables of the same rows, give them one `useColumnPreferences` and one sort at page level, and sort each group's rows within the group.

## Layout

- `DataTableView`'s box is a named container (`@container/table`). From `@4xl/table:` it renders the table (widths through `<colgroup>`, `width: getTotalSize()` with `min-width: 100%`, horizontal scroll in its own box; when the box is wider than the columns, the first resizable column takes the room left over, so fixed columns such as row actions keep their declared width); below, a compact `ul` whose rows show every field (hidden columns included, `compact: "omit"` excluded) and `SortControls`. The two layouts are separate subtrees toggled by CSS, never by `useMediaQuery`.
- `layout="table"` (sheets) skips the compact layout: the table and its controls at every width, scrolling sideways.
- The columns menu shows only when some column is `defaultHidden` (sessions' technical fields); resizing and reordering stay available from the headers.
- The rows of both layouts and the `footer` (the infinite-scroll sentinel) live in one scroll box (`overflow-auto`, both axes), as tall as its rows and shrinking to the space left (then scrolling) when they don't fit, so the header's sticky cells stay at its top; the columns menu, compact sort and compact filters sit above it and don't scroll. A page gives `DataTableView` a bounded flex parent (`flex min-h-0 flex-1 flex-col`, never its own `overflow-y-auto` wrapper); `ResourceOverview`'s column already is one, so its result renderer returns the table directly, without another wrapper, and passes `scrollRef` to `useInfiniteScroll` as the sentinel's root. Where the window scrolls (`/crons/{id}` under `Detail.astro`) the box is bounded with `scrollClassName="max-h-[70dvh]"`. In a sheet the box grows with its rows and the sheet scrolls.
- Table ids name the table kind, never an entity (`admin-organization-members` for every organization).

## Library docs and skills

For TanStack Table API beyond this file (a feature `useDataTable` doesn't enable yet, state ownership, typing a column helper), read the docs and skills the installed v9 package ships instead of guessing:

- `apps/frontend/node_modules/@tanstack/react-table/skills/`: the React adapter (`getting-started`, with `references/with-tanstack-query.md` and `with-tanstack-virtual.md`; `table-state`; `migrate-v8-to-v9`).
- The headless core skills (`core`, `table-features` with one reference per feature, `table-state`, `custom-features`, `migrate-v8-to-v9`) sit next to it in Bun's store, not in `apps/frontend/node_modules`. Find them with `find node_modules/.bun -path '*@tanstack/table-core/skills/*' -name SKILL.md`. Where they say `intent load @tanstack/table-core#<skill>`, read that skill's `SKILL.md`.
- <https://tanstack.com/table/latest/docs>.

## Tests

- Hooks and helpers: `apps/frontend/tests/unit/hooks/use-column-preferences.test.ts`, `use-sort-query-param.test.tsx`, `tests/unit/lib/sort-rows.test.ts`.
- Components: `tests/unit/components/data-display/{data-table-view,data-table-columns-menu,data-table-ordering,row-action-items,sortable-list}.test.*`, `tests/unit/components/resource/sort-controls.test.tsx`. Component tests call `cleanup()` in `afterEach`.
