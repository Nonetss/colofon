## MODIFIED Requirements

### Requirement: Resource lists render as data tables

The application's resource lists SHALL render as data tables: the API keys and users pages under `/admin`, the `/crons` job list and the run history of `/crons/{id}`. Each table SHALL keep the data, actions, links, filters, dialogs, permissions and live updates its list offered before, and its rows SHALL keep their muted and disabled treatments. A muted row (a paused or read-only job) SHALL show its text in the muted tone over the normal row background, never dimmed as a whole.

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

- **WHEN** a column is hidden and the user expands a row that has an expanded detail
- **THEN** the expanded detail SHALL span the full width of the visible columns

#### Scenario: A table without hidden columns has no menu

- **WHEN** the user opens `/admin/api-keys`
- **THEN** the table SHALL NOT show a columns menu

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

- **WHEN** the user filters `/crons` by a tag and sorts by name, descending
- **THEN** the table SHALL list only that tag's jobs, from Z to A

#### Scenario: Rows without a value come last

- **WHEN** the user sorts the API keys by expiry and some keys never expire
- **THEN** the keys without an expiry SHALL come after the others, ascending or descending

#### Scenario: A server-sorted table restarts from the first page

- **WHEN** `/admin/users` has loaded several pages and the user sorts by email
- **THEN** the table SHALL request the first page ordered by email instead of reordering the loaded rows

### Requirement: The sort is kept with the list state and starts from today's order

A table rendered in a page (a list page, or the run history of a job's detail page) SHALL keep its active sort in the page URL, so reloading or sharing the page restores it, and SHALL drop it from the URL while it equals the table's default. A table inside a sheet SHALL keep its sort in local state. The sort SHALL NOT be stored in the column preferences. With no sort chosen, every table SHALL show its rows in the order its list showed before it adopted the data table.

#### Scenario: Reloading keeps the sort

- **WHEN** the user sorts `/admin/api-keys` by name and reloads the page
- **THEN** the table SHALL still be sorted by name

#### Scenario: Default order is unchanged

- **WHEN** a user opens `/crons` without a sort in the URL
- **THEN** the jobs SHALL be ordered by name, the order `cron.list` returns

#### Scenario: A sheet does not write the URL

- **WHEN** the user sorts a table shown inside a sheet
- **THEN** the page URL SHALL NOT change

### Requirement: A table without a compact layout keeps its controls at every width

A table inside a sheet SHALL have no compact layout: its header sorting, resizing and reordering SHALL be available at every width, its columns SHALL NOT be hidden or folded into other cells by breakpoint, and when its columns do not fit the table SHALL scroll horizontally inside its own container.

#### Scenario: A narrow sheet scrolls its table

- **WHEN** a sheet holding a table is open on a phone-sized viewport
- **THEN** the table SHALL keep every column and scroll horizontally within its container

### Requirement: Paginated tables filter and sort on the server

A table whose rows come from a paginated server read (the user list and a job's run history) SHALL send its column filters and its sort to that read, load further pages as the user scrolls (no page buttons), restart from the first page when either changes, and keep both in the page URL. Its sortable columns SHALL be exactly those the read can order by.

#### Scenario: Sorting the run history by duration

- **WHEN** the user sorts a job's run history by "Duración", descending
- **THEN** the table SHALL reload from the first page with the longest runs first and the runs still in progress last, without day headings

#### Scenario: Filtering the run history by status

- **WHEN** the user keeps only "Fallida" in the run history's "Estado" filter and reloads the page
- **THEN** the table SHALL list only failed runs

## ADDED Requirements

### Requirement: Column preferences are remembered per table kind in the browser

The visibility, order and widths of a table's columns SHALL be saved in the browser's local storage under a key unique to that table kind, and SHALL be restored when the table is shown again, including after a reload or in another tab of the same browser. A table shown once per entity (the run history of any job) SHALL save one layout for the table kind, not one per entity. The columns menu SHALL offer a reset that restores every column's default visibility, order and width and clears the saved preferences.

Saved preferences SHALL be read defensively: a column the saved preferences do not mention SHALL take its default visibility, width and position; a saved entry for a column that no longer exists SHALL be ignored; a saved order SHALL be completed with any missing columns; a width SHALL be clamped to the column's current limits; and unreadable or malformed saved data, or storage that is unavailable, SHALL fall back to the defaults without an error.

#### Scenario: Preferences survive a reload

- **WHEN** the user hides a column, widens another and moves a third, then reloads the page
- **THEN** the table SHALL show the same visibility, widths and order

#### Scenario: The layout follows the user to another job

- **WHEN** the user widens a column of one job's run history and opens another job's `/crons/{id}` page
- **THEN** that job's run history SHALL show the same width

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

### Requirement: Columns can be declared hidden by default

A column SHALL be able to declare that it starts hidden. A hideable column declared hidden by default SHALL be hidden when the table has no saved preferences, SHALL be listed unchecked in the columns menu, and SHALL be hidden again after the user resets the columns. Saved preferences SHALL override the default for a column they mention. A table whose rows expand to a detail SHALL still show every field hidden by default in that detail.

#### Scenario: A column hidden by default starts hidden

- **WHEN** a user opens a table that declares a column hidden by default, with no saved preferences
- **THEN** the table SHALL NOT show that column
- **AND** the columns menu SHALL list it unchecked

#### Scenario: The user shows a column hidden by default

- **WHEN** the user checks a column that is hidden by default and reloads the page
- **THEN** the table SHALL still show that column

#### Scenario: Reset hides it again

- **WHEN** the user resets the columns
- **THEN** every column declared hidden by default SHALL be hidden again

## REMOVED Requirements

### Requirement: Column preferences are remembered per table in the browser

**Reason**: Its example used the organization detail view, which was removed.

**Migration**: Replaced by “Column preferences are remembered per table kind in the browser”, with the same behavior and a job's run history as the example.

### Requirement: Columns can start hidden

**Reason**: It named the session history's technical columns, and that page was removed.

**Migration**: Replaced by “Columns can be declared hidden by default”, which keeps the generic behavior without naming a page.
