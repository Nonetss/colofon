## ADDED Requirements

### Requirement: Admin resource lists render as data tables

The application's resource lists SHALL render as data tables: the API keys and users pages under `/admin`. Each table SHALL keep the data, actions, links, filters, dialogs, permissions and live updates its list offered before, and its rows SHALL keep their muted and disabled treatments. A muted row (such as a banned user) SHALL show its text in the muted tone over the normal row background, never dimmed as a whole.

A row whose list opened it (a detail link or a detail view) SHALL keep that open control on its identifying cell. A row with actions SHALL keep them in a trailing actions column whose menu is named after the row, with destructive actions marked as such.

#### Scenario: The users page keeps its actions

- **WHEN** an administrator opens `/admin/users`
- **THEN** each user SHALL be a table row with name, email, role, status and creation date
- **AND** the row's actions menu SHALL offer the same actions as before, with the same ones disabled on the administrator's own row

#### Scenario: A muted row reads as muted, not dark

- **WHEN** a table shows a row with the muted treatment
- **THEN** that row's text SHALL use the muted tone while its background, status tag and controls keep their normal contrast

### Requirement: Columns the viewer cannot use stay out of the table

A column whose content only exists for some viewers — row actions or controls the viewer is not allowed to use — SHALL be hidden and SHALL NOT be listed in the columns menu while it does not apply, whatever the saved preferences say. It SHALL come back at its saved position and width when it applies again.

#### Scenario: A column the viewer cannot use is left out

- **WHEN** a table declares a column that only holds controls the viewer is not allowed to use
- **THEN** the table SHALL NOT render that column
- **AND** the columns menu SHALL NOT list it

#### Scenario: The column comes back when it applies

- **WHEN** a column was hidden because the viewer couldn't use it and later applies to them again
- **THEN** it SHALL be shown at its saved position and width

### Requirement: Column preferences are saved per table kind in the browser

The visibility, order and widths of a table's columns SHALL be saved in the browser's local storage under a key unique to that table kind, and SHALL be restored when the table is shown again, including after a reload or in another tab of the same browser. A table shown once per entity (the same table on every entity's page) SHALL save one layout for the table kind, not one per entity. The columns menu SHALL offer a reset that restores every column's default visibility, order and width and clears the saved preferences.

Saved preferences SHALL be read defensively: a column the saved preferences do not mention SHALL take its default visibility, width and position; a saved entry for a column that no longer exists SHALL be ignored; a saved order SHALL be completed with any missing columns; a width SHALL be clamped to the column's current limits; and unreadable or malformed saved data, or storage that is unavailable, SHALL fall back to the defaults without an error.

#### Scenario: Preferences survive a reload

- **WHEN** the user hides a column, widens another and moves a third, then reloads the page
- **THEN** the table SHALL show the same visibility, widths and order

#### Scenario: The layout follows the user to another entity

- **WHEN** the user widens a column of a table shown on one entity's page and opens another entity's page with the same table
- **THEN** that table SHALL show the same width

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

### Requirement: Heading rows inside a table follow its order

When a table shows its rows under heading rows in a single body (such as rows grouped by day), each heading row SHALL span every visible column, and the headings SHALL follow the order of the rows beneath them: newest day first when the rows are newest first, oldest day first when they are oldest first.

#### Scenario: Oldest rows first

- **WHEN** the user sorts a table grouped by day by date, ascending
- **THEN** the oldest day's heading SHALL come first, with its rows oldest first beneath it

## REMOVED Requirements

### Requirement: Resource lists render as data tables

**Reason**: It listed the `/crons` job list and run history, which leave the frontend, and its scenarios used them as examples.

**Migration**: Replaced by "Admin resource lists render as data tables".

### Requirement: The cron job list is one table with the tag as a column

**Reason**: The `/crons` page is removed from the frontend (`cron-management`).

**Migration**: None; the table components stay for the admin lists.

### Requirement: Columns the viewer cannot use are left out

**Reason**: Its examples described the `/crons` pages, which leave the frontend.

**Migration**: Replaced by "Columns the viewer cannot use stay out of the table", the same rule with examples from the remaining tables.

### Requirement: Column preferences are remembered per table kind in the browser

**Reason**: Its examples described the `/crons` pages, which leave the frontend.

**Migration**: Replaced by "Column preferences are saved per table kind in the browser", the same rule with examples from the remaining tables.

### Requirement: Heading rows inside one table follow the table's order

**Reason**: Its examples described the `/crons` pages, which leave the frontend.

**Migration**: Replaced by "Heading rows inside a table follow its order", the same rule with examples from the remaining tables.

## MODIFIED Requirements

### Requirement: Column controls apply to the table layout only

A full-page table SHALL render as a table while its container is wide, and as a compact layout of stacked rows when its container is narrow. The switch SHALL follow the width of the table's own container, not the viewport. The compact layout SHALL show every field of the row, whatever columns are hidden — on the row itself, or in its expanded detail for a table whose detail already holds secondary fields — and SHALL offer the ordering through a sort-key selector and a direction toggle instead of headers. Column visibility, order and widths SHALL NOT apply to the compact layout.

Each column SHALL declare whether it can be hidden, resized, reordered and sorted. A column that identifies the row, and a column that only holds row controls (actions, an expand toggle), SHALL be neither hideable nor reorderable.

#### Scenario: Compact layout ignores the column layout

- **WHEN** the user has hidden a column in the table layout and the table's container narrows to the compact layout
- **THEN** each compact row SHALL still show the hidden column's value

#### Scenario: Compact layout follows the container

- **WHEN** a full-page table is shown on a wide window whose admin sidebar leaves the table's container narrower than the table layout needs
- **THEN** the table SHALL render its compact layout

#### Scenario: Sorting in the compact layout

- **WHEN** the user picks another sort key or toggles the direction in the compact layout
- **THEN** the rows SHALL be ordered exactly as the matching header sort would order them

#### Scenario: The identifying column cannot be hidden

- **WHEN** the user opens the columns menu
- **THEN** the identifying column SHALL be listed as always shown, without a control to hide it

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

- **WHEN** the user filters a table whose rows are all loaded (such as `/admin/api-keys`) to one value of a column and sorts by name, descending
- **THEN** the table SHALL list only the rows with that value, from Z to A

#### Scenario: Rows without a value come last

- **WHEN** the user sorts the API keys by expiry and some keys never expire
- **THEN** the keys without an expiry SHALL come after the others, ascending or descending

#### Scenario: A server-sorted table restarts from the first page

- **WHEN** `/admin/users` has loaded several pages and the user sorts by email
- **THEN** the table SHALL request the first page ordered by email instead of reordering the loaded rows

### Requirement: The sort is kept with the list state and starts from today's order

A table rendered in a page (a list page) SHALL keep its active sort in the page URL, so reloading or sharing the page restores it, and SHALL drop it from the URL while it equals the table's default. A table inside a sheet SHALL keep its sort in local state. The sort SHALL NOT be stored in the column preferences. With no sort chosen, every table SHALL show its rows in the order its list showed before it adopted the data table.

#### Scenario: Reloading keeps the sort

- **WHEN** the user sorts `/admin/api-keys` by name and reloads the page
- **THEN** the table SHALL still be sorted by name

#### Scenario: Default order is unchanged

- **WHEN** an administrator opens `/admin/api-keys` without a sort in the URL
- **THEN** the keys SHALL be in the order their list procedure returns

#### Scenario: A sheet does not write the URL

- **WHEN** the user sorts a table shown inside a sheet
- **THEN** the page URL SHALL NOT change

### Requirement: Columns can be filtered by value from their header

A table SHALL be able to filter a column by its values, Excel-style. A filterable column's header SHALL show a filter icon at its trailing edge, named for assistive technology and with a hover hint, highlighted while the column filters and naming how many values it keeps. The icon SHALL open a panel with "Ordenar de A a Z" and "Ordenar de Z a A" when the column sorts, a search over the column's values, "Seleccionar todo", and one checkbox per value with the number of rows it has under the other active filters. Unchecking a value SHALL hide its rows, checking every value (or "Seleccionar todo", or "Quitar filtro") SHALL remove the filter, and while searching "Solo estos resultados" SHALL keep only the matching values. Changes SHALL apply as they are made. In the compact layout each filterable column SHALL offer the same panel from a button with the column's name above the rows. When the filters leave no row, the table SHALL stay on screen with its filters and a message offering to clear them. A column with too many values to list (the users of the session history) SHALL search them on the server from the panel's search box: the panel SHALL list the values already kept followed by the search results, check only the kept values, offer no "Seleccionar todo", and show a hint while there is nothing to list.

#### Scenario: Unchecking a value

- **WHEN** the user opens the "Rol" filter of `/admin/users` and unchecks "admin"
- **THEN** the table SHALL stop listing the administrators
- **AND** the "Rol" filter icon SHALL be highlighted

#### Scenario: Keeping only the search matches

- **WHEN** the user types "back" in the "Nombre" filter and chooses "Solo estos resultados"
- **THEN** the table SHALL list only the rows whose name matches "back"

#### Scenario: Filters that leave nothing

- **WHEN** the active filters match no row
- **THEN** the table, its headers and its filters SHALL stay visible with a message and a "Limpiar filtros" action instead of the rows
