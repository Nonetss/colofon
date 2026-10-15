# Frontend Data Table

## Purpose

Lets users read every resource list of the application as a table they can shape — which columns are shown, how wide they are, in what order — and sort from its headers, with the column layout remembered per table in their browser and a compact layout when the table's container is narrow.

## Requirements

### Requirement: Resource lists render as data tables

The application's resource lists SHALL render as data tables: the API keys, users, organizations, teams, plugins and sessions pages under `/admin`, the members, pending invitations, teams and custom roles of the organization detail view, the team member-management view, the `/crons` job list and the run history of `/crons/{id}`. Each table SHALL keep the data, actions, links, filters, dialogs, permissions and live updates its list offered before, and its rows SHALL keep their muted and disabled treatments. A muted row (a paused or read-only job) SHALL show its text in the muted tone over the normal row background, never dimmed as a whole.

A row whose list opened it (a detail link or a detail view) SHALL keep that open control on its identifying cell. A row with actions SHALL keep them in a trailing actions column whose menu is named after the row, with destructive actions marked as such.

#### Scenario: The users page keeps its actions

- **WHEN** an administrator opens `/admin/users`
- **THEN** each user SHALL be a table row with name, email, role, status and creation date
- **AND** the row's actions menu SHALL offer the same actions as before, with the same ones disabled on the administrator's own row

#### Scenario: A cron job row still opens its detail

- **WHEN** a user activates the name of a job in the `/crons` table
- **THEN** the application SHALL navigate to that job's `/crons/{id}` page

#### Scenario: A paused job reads as muted, not dark

- **WHEN** the `/crons` table shows a paused or code-declared job
- **THEN** that row's text SHALL use the muted tone while its background, status tag and controls keep their normal contrast

### Requirement: Column controls apply to the table layout only

A full-page table SHALL render as a table while its container is wide, and as a compact layout of stacked rows when its container is narrow. The switch SHALL follow the width of the table's own container, not the viewport. The compact layout SHALL show every field of the row, whatever columns are hidden — on the row itself, or in its expanded detail for a table whose detail already holds secondary fields — and SHALL offer the ordering through a sort-key selector and a direction toggle instead of headers. Column visibility, order and widths SHALL NOT apply to the compact layout.

Each column SHALL declare whether it can be hidden, resized, reordered and sorted. A column that identifies the row, and a column that only holds row controls (actions, an expand toggle), SHALL be neither hideable nor reorderable.

#### Scenario: Compact layout ignores the column layout

- **WHEN** the user has hidden a column in the table layout and the table's container narrows to the compact layout
- **THEN** each compact row SHALL still show the hidden column's value

#### Scenario: Compact layout follows the container

- **WHEN** a full-page table is shown on a wide window whose section sidebar leaves the table's container narrower than the table layout needs
- **THEN** the table SHALL render its compact layout

#### Scenario: Sorting in the compact layout

- **WHEN** the user picks another sort key or toggles the direction in the compact layout
- **THEN** the rows SHALL be ordered exactly as the matching header sort would order them

#### Scenario: The identifying column cannot be hidden

- **WHEN** the user opens the columns menu
- **THEN** the identifying column SHALL be listed as always shown, without a control to hide it

### Requirement: Columns can be shown and hidden from a columns menu

A table with at least one column declared hidden by default SHALL offer a columns menu listing every column by its header label, with a checked control for each hideable column. Unchecking a column SHALL hide its header and its cells; checking it SHALL show them again in their current position. A table with no column hidden by default SHALL NOT show a columns menu. The menu's trigger SHALL show its name as visible text.

A row's full-width content (an expanded detail row, a group heading row) SHALL span exactly the currently visible columns.

#### Scenario: Hiding a column

- **WHEN** the user unchecks a column in the columns menu
- **THEN** the table SHALL stop rendering that column's header and cells
- **AND** the remaining columns SHALL keep their order

#### Scenario: Showing a hidden column again

- **WHEN** the user checks a hidden column in the columns menu
- **THEN** the table SHALL render it again at its position in the column order

#### Scenario: An expanded row spans the visible columns

- **WHEN** a column is hidden and the user expands a session or log row
- **THEN** the expanded detail SHALL span the full width of the visible columns

#### Scenario: A table without hidden columns has no menu

- **WHEN** the user opens `/admin/api-keys`
- **THEN** the table SHALL NOT show a columns menu

### Requirement: Columns can be resized

A resizable column SHALL show a resize handle at the trailing edge of its header. Dragging the handle SHALL change the column's width live, within the column's minimum and maximum widths. The handle SHALL be focusable and labelled with the column's name, and while focused the left and right arrow keys SHALL narrow and widen the column in fixed steps. Double-clicking the handle SHALL restore that column's default width.

When the sum of the column widths exceeds the table's container, the table SHALL scroll horizontally inside its container rather than squeezing the columns below their widths or widening the page.

#### Scenario: Dragging a column wider

- **WHEN** the user drags a column's resize handle to the right
- **THEN** the column SHALL widen with the pointer, up to its maximum width

#### Scenario: Resizing with the keyboard

- **WHEN** the resize handle has focus and the user presses the left arrow key
- **THEN** the column SHALL narrow by one step, not below its minimum width

#### Scenario: Restoring a column's width

- **WHEN** the user double-clicks a resized column's handle
- **THEN** the column SHALL return to its default width

#### Scenario: Wide columns scroll horizontally

- **WHEN** the columns' total width exceeds the table container
- **THEN** the table SHALL scroll horizontally within its container
- **AND** the page itself SHALL NOT scroll horizontally

### Requirement: Columns can be reordered

A reorderable column SHALL be movable by dragging its header onto another reorderable column's position, with a visible indicator of where it will be placed. The columns menu SHALL list the reorderable columns in their current order, each with a grip handle: dragging the grip SHALL move the column to the position it is dropped at, and pressing the up or down arrow key while the grip has focus SHALL move the column one position earlier or later, so reordering does not depend on a pointer. The grip SHALL keep focus after a keyboard move. Non-reorderable columns SHALL keep their position: the identifying column first and the row-control column last; the menu lists them without a grip.

#### Scenario: Dragging a header to a new position

- **WHEN** the user drags the "Rol" header of `/admin/users` onto the position of the "Email" header
- **THEN** the "Rol" column and its cells SHALL render in that position
- **AND** the other columns SHALL keep their relative order

#### Scenario: Moving a column from the menu

- **WHEN** the grip of a column has focus in the columns menu and the user presses the up arrow key
- **THEN** that column SHALL swap places with the reorderable column before it
- **AND** the grip SHALL keep focus

#### Scenario: A fixed column cannot be displaced

- **WHEN** the user drags a header onto the identifying column's position
- **THEN** the identifying column SHALL stay first

### Requirement: Sortable headers sort the table

A sortable column's header SHALL be a button that sorts the table by that column. Activating the header of a column that is not the active sort SHALL sort by it ascending; activating the active sort's header SHALL toggle its direction. Only one column SHALL be the active sort. The active sort's header SHALL show the direction, and each sortable header SHALL expose its sort state to assistive technology. Non-sortable headers SHALL render as plain headers.

When a table's rows are all loaded at once, the sort SHALL be applied in the browser to the loaded rows after the list's filters, and rows without a value for the sorted column SHALL come after the rows that have one, in either direction. When a table's rows come from a paginated server read, the sort SHALL be performed by that read: changing it SHALL request the first page in the new order, and the table SHALL NOT reorder the loaded rows itself. A column the server cannot order by SHALL NOT be sortable.

#### Scenario: Sorting by a new column

- **WHEN** the user activates the header of a sortable column that is not the active sort
- **THEN** the table SHALL be sorted by that column, ascending
- **AND** that header SHALL show an ascending indicator

#### Scenario: Toggling the direction

- **WHEN** the user activates the header of the active sort
- **THEN** the table SHALL be sorted by that column in the opposite direction

#### Scenario: A client-sorted table applies its filters first

- **WHEN** the user filters `/admin/teams` by an organization and sorts by member count, descending
- **THEN** the table SHALL list only that organization's teams, largest first

#### Scenario: Rows without a value come last

- **WHEN** the user sorts the API keys by expiry and some keys never expire
- **THEN** the keys without an expiry SHALL come after the others, ascending or descending

#### Scenario: A server-sorted table restarts from the first page

- **WHEN** `/admin/sessions` has loaded several pages and the user sorts by IP address
- **THEN** the table SHALL request the first page ordered by IP address instead of reordering the loaded rows

### Requirement: The sort is kept with the list state and starts from today's order

A table rendered in a page (a list page, or the run history of a job's detail page) SHALL keep its active sort in the page URL, so reloading or sharing the page restores it, and SHALL drop it from the URL while it equals the table's default. A table inside a sheet SHALL keep its sort in local state. The sort SHALL NOT be stored in the column preferences. With no sort chosen, every table SHALL show its rows in the order its list showed before it adopted the data table.

#### Scenario: Reloading keeps the sort

- **WHEN** the user sorts `/admin/organizations` by name and reloads the page
- **THEN** the table SHALL still be sorted by name

#### Scenario: Default order is unchanged

- **WHEN** a user opens `/crons` without a sort in the URL
- **THEN** the jobs SHALL be ordered by name, the order `cron.list` returns

#### Scenario: A sheet does not write the URL

- **WHEN** the user sorts the members of an organization in its detail view
- **THEN** the page URL SHALL NOT change

### Requirement: Column preferences are remembered per table in the browser

The visibility, order and widths of a table's columns SHALL be saved in the browser's local storage under a key unique to that table kind, and SHALL be restored when the table is shown again, including after a reload or in another tab of the same browser. A table shown once per entity (the members of any organization) SHALL save one layout for the table kind, not one per entity. The columns menu SHALL offer a reset that restores every column's default visibility, order and width and clears the saved preferences.

Saved preferences SHALL be read defensively: a column the saved preferences do not mention SHALL take its default visibility, width and position; a saved entry for a column that no longer exists SHALL be ignored; a saved order SHALL be completed with any missing columns; a width SHALL be clamped to the column's current limits; and unreadable or malformed saved data, or storage that is unavailable, SHALL fall back to the defaults without an error.

#### Scenario: Preferences survive a reload

- **WHEN** the user hides a column, widens another and moves a third, then reloads the page
- **THEN** the table SHALL show the same visibility, widths and order

#### Scenario: The layout follows the user to another organization

- **WHEN** the user widens the email column of one organization's members and opens another organization's detail view
- **THEN** that organization's members table SHALL show the same width

#### Scenario: Resetting the columns

- **WHEN** the user chooses to reset the columns from the columns menu
- **THEN** every column SHALL return to its default visibility, position and width
- **AND** the saved preferences for that table SHALL be cleared

#### Scenario: A new column appears after a release

- **WHEN** saved preferences exist and the table gains a column they do not mention
- **THEN** the new column SHALL appear with its default visibility and width, at its default position relative to its neighbours

#### Scenario: Corrupt saved preferences

- **WHEN** the saved preferences for a table cannot be parsed
- **THEN** the table SHALL render with its default column layout
- **AND** SHALL NOT show an error

#### Scenario: Storage is unavailable

- **WHEN** local storage cannot be read or written (private mode, blocked site data)
- **THEN** the column controls SHALL still work for the current visit

### Requirement: Columns can start hidden

A column SHALL be able to declare that it starts hidden. A hideable column declared hidden by default SHALL be hidden when the table has no saved preferences, SHALL be listed unchecked in the columns menu, and SHALL be hidden again after the user resets the columns. Saved preferences SHALL override the default for a column they mention. The session history's technical fields — the ones its rows kept behind "Ver información técnica": user agent, session id, user id, last update, expiry, active organization and active team — SHALL be columns hidden by default, and an expanded session row SHALL still show all of them.

#### Scenario: Technical session fields start hidden

- **WHEN** an administrator opens `/admin/sessions` with no saved preferences
- **THEN** the table SHALL NOT show the user-agent column
- **AND** the columns menu SHALL list it unchecked

#### Scenario: The user shows a column hidden by default

- **WHEN** the user checks a column that is hidden by default and reloads the page
- **THEN** the table SHALL still show that column

#### Scenario: Reset hides it again

- **WHEN** the user resets the columns
- **THEN** every column declared hidden by default SHALL be hidden again

### Requirement: Columns can be filtered by value from their header

A table SHALL be able to filter a column by its values, Excel-style. A filterable column's header SHALL show a filter icon at its trailing edge, named for assistive technology and with a hover hint, highlighted while the column filters and naming how many values it keeps. The icon SHALL open a panel with "Ordenar de A a Z" and "Ordenar de Z a A" when the column sorts, a search over the column's values, "Seleccionar todo", and one checkbox per value with the number of rows it has under the other active filters. Unchecking a value SHALL hide its rows, checking every value (or "Seleccionar todo", or "Quitar filtro") SHALL remove the filter, and while searching "Solo estos resultados" SHALL keep only the matching values. Changes SHALL apply as they are made. In the compact layout each filterable column SHALL offer the same panel from a button with the column's name above the rows. When the filters leave no row, the table SHALL stay on screen with its filters and a message offering to clear them. A column with too many values to list (the users of the session history) SHALL search them on the server from the panel's search box: the panel SHALL list the values already kept followed by the search results, check only the kept values, offer no "Seleccionar todo", and show a hint while there is nothing to list.

#### Scenario: Unchecking a value

- **WHEN** the user opens the "Etiqueta" filter of `/crons` and unchecks "limpieza"
- **THEN** the table SHALL stop listing the jobs tagged "limpieza"
- **AND** the "Etiqueta" filter icon SHALL be highlighted

#### Scenario: Keeping only the search matches

- **WHEN** the user types "back" in the "Nombre" filter and chooses "Solo estos resultados"
- **THEN** the table SHALL list only the jobs whose name or handler matches "back"

#### Scenario: Filters that leave nothing

- **WHEN** the active filters match no job
- **THEN** the table, its headers and its filters SHALL stay visible with a message and a "Limpiar filtros" action instead of the rows

### Requirement: The cron job list is one table with the tag as a column

The `/crons` page SHALL list every job in a single table, not one table per tag, and SHALL NOT show a separate filter panel. Each job's tag (the first tag of its procedure, or the untagged label) SHALL be a sortable column. The name, tag and status columns SHALL be filterable by value from their headers, and the active filters SHALL be kept in the page URL. The last column, titled "Acciones", SHALL hold the row's pause or lock icon together with its edit/delete menu, aligned to the right; a viewer who isn't an administrator SHALL see the column with only the controls they can use.

#### Scenario: Sorting by tag

- **WHEN** the user sorts the `/crons` table by its "Etiqueta" column, ascending
- **THEN** the jobs SHALL be listed by tag, and jobs sharing a tag SHALL keep their order by name

#### Scenario: Filters survive a reload

- **WHEN** the user filters `/crons` to the "Pausa" status and reloads the page
- **THEN** the table SHALL still list only paused jobs

### Requirement: Heading rows inside one table follow the table's order

When a table shows its rows under heading rows in a single body (the run history grouped by day), each heading row SHALL span every visible column, and the headings SHALL follow the order of the rows beneath them: newest day first when the rows are newest first, oldest day first when they are oldest first.

#### Scenario: Oldest runs first

- **WHEN** the user sorts the run history by start time, ascending
- **THEN** the oldest day's heading SHALL come first, with its runs oldest first beneath it

### Requirement: A table without a compact layout keeps its controls at every width

A table inside a sheet (the organization detail view's sections and the team member-management view) SHALL have no compact layout: its header sorting, resizing and reordering SHALL be available at every width, its columns SHALL NOT be hidden or folded into other cells by breakpoint, and when its columns do not fit the table SHALL scroll horizontally inside its own container.

#### Scenario: A narrow sheet scrolls its table

- **WHEN** the organization detail view is open on a phone-sized viewport
- **THEN** the members table SHALL keep every column and scroll horizontally within its container

### Requirement: Columns the viewer cannot use are left out

A column whose content only exists for some viewers — row actions or controls the viewer is not allowed to use — SHALL be hidden and SHALL NOT be listed in the columns menu while it does not apply, whatever the saved preferences say. It SHALL come back at its saved position and width when it applies again.

#### Scenario: A column the viewer cannot use is left out

- **WHEN** a table declares a column that only holds controls the viewer is not allowed to use
- **THEN** the table SHALL NOT render that column
- **AND** the columns menu SHALL NOT list it

#### Scenario: A non-administrator keeps the crons actions column

- **WHEN** a user who is not an administrator opens `/crons`
- **THEN** each code-declared job's "Acciones" column SHALL show its lock marker, and no row SHALL show the pause control or the edit/delete menu

### Requirement: Paginated tables filter and sort on the server

A table whose rows come from a paginated server read (the user list, the session history and a job's run history) SHALL send its column filters and its sort to that read, load further pages as the user scrolls (no page buttons), restart from the first page when either changes, and keep both in the page URL. Its sortable columns SHALL be exactly those the read can order by.

#### Scenario: Sorting the run history by duration

- **WHEN** the user sorts a job's run history by "Duración", descending
- **THEN** the table SHALL reload from the first page with the longest runs first and the runs still in progress last, without day headings

#### Scenario: Filtering the run history by status

- **WHEN** the user keeps only "Fallida" in the run history's "Estado" filter and reloads the page
- **THEN** the table SHALL list only failed runs

### Requirement: The header stays on top while the rows scroll

A table's column header (titles, sort and filter controls) SHALL stay visible at the top of the table while its rows scroll vertically, on every list page and in a job's run history, and SHALL scroll sideways with the columns when they don't fit. The table's toolbar (columns menu, compact sort and filters) SHALL stay above the scrolling rows. Further pages of an infinite list SHALL load when the user scrolls the table's rows to their end.

#### Scenario: Scrolling a long user list

- **WHEN** an administrator scrolls down `/admin/users` past the first rows
- **THEN** the "Nombre", "Email", "Rol", "Estado" headers and their filter icons SHALL stay visible above the rows

#### Scenario: Scrolling the run history

- **WHEN** a user scrolls a job's run history
- **THEN** the history's header SHALL stay at the top of its box and more runs SHALL load as the end is reached
