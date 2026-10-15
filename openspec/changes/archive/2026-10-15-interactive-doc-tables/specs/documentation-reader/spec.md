## MODIFIED Requirements

### Requirement: Page view

A page SHALL show a header with its breadcrumbs (the repository, and the groups and sections above it, each section as a link and each group as text), its icon, title and description, its `actualizado` date (marked for review when older than six months) and, when present, the site's header fields as a list of labelled values, a `ficha` value linking to that page and a `ref` value linking to the entity's catalog page, titled with its label; then its body with the documentation prose styles; then links to the previous and next pages. Code blocks SHALL show their language and a "Copiar" control that copies the code. External links SHALL open in a new tab. Tables SHALL fit the reading column, their cells wrapping their text (a word longer than its column breaks), and SHALL scroll horizontally inside their frame, without widening the page, only when their columns cannot fit even wrapped. Headings SHALL show an anchor link on hover. A section page SHALL list its pages and subsections, with their titles and descriptions, after its body.

#### Scenario: Copying a code block

- **WHEN** the user presses "Copiar" on a code block
- **THEN** the block's code SHALL be copied to the clipboard and the control SHALL say "Copiado" for a moment

#### Scenario: Stale page

- **WHEN** a page says `actualizado: 2026-01-10` and today is 2026-10-15
- **THEN** its header SHALL mark the date for review

#### Scenario: Previous and next

- **WHEN** the user reaches the end of the page DNS, whose previous page is VPN
- **THEN** a link to VPN SHALL be offered as the previous page

#### Scenario: Breadcrumbs with a group

- **WHEN** the group "Críticas" of `casa` lists `containers/komodo` and the user opens `/casa/containers/komodo/new-stack`
- **THEN** the breadcrumbs SHALL be the repository, "Críticas" as text and "Komodo" as a link

#### Scenario: Long text in a table

- **WHEN** a table's last column holds sentences longer than the space left in the reading column
- **THEN** those cells SHALL wrap onto several lines and the table SHALL not scroll sideways


## ADDED Requirements

### Requirement: Interactive tables

Every table in a page body, except key/value tables (an empty first header cell), SHALL be interactive in the browser while keeping the server-rendered rows, so its text, links and order without JavaScript stay those of the page.

**Sorting.** Pressing a column's header SHALL sort by it ascending, then descending, then back to the written order; with Shift pressed it SHALL add the column to the current sort, shown with its position. Each column SHALL sort by the kind most of its cells read as (at least 90 % of the non-empty ones): IP addresses by each number, dates (`YYYY-MM-DD` or `D/M/YYYY`) by day, sizes (`1.5 GB`, `512 MiB`) by bytes, versions (`1.2.3`, `v2.1`) by each part, numbers (`1.234,5` and `1234.5`) by value, and the rest as text in Spanish collation, accents and case aside. Empty cells (blank, `—`, `-`, `n/a`, `?`) SHALL always sort last, and cells that do not read as the column's kind after those that do.

**Toolbar.** A table with 2 rows or more SHALL show, above it, a filter box, the row count ("12 filas", or "3 de 12 filas" while filtered) and the actions below; a table of one row SHALL only sort.
- *Filter box.* Every word typed SHALL be found in some visible cell of the row, accents and case aside. A word `name:value` SHALL look only in the column whose header is `name` or starts with it when only one does, and in every column otherwise.
- *Column filters.* Every column header SHALL offer a filter listing the column's values, each with how many rows have it under the other filters, with a search over the values and sorting options. Kept values SHALL filter the rows to those holding one of them.
- *Chips.* Each active filter and the box SHALL show as a removable chip, followed by "Quitar filtros", which clears them all.
- *Highlights.* The words of the box SHALL be highlighted in the visible cells that contain them.
- *Empty state.* When nothing matches, the table SHALL say "Ninguna fila coincide" and offer "Quitar filtros".
- *Columns.* A columns menu SHALL hide and show columns; the first column cannot be hidden.
- *Copiar en Markdown.* Copies the visible columns of every filtered row, all pages, as a GitHub table, with links as full addresses.
- *Descargar CSV.* Downloads the same view as CSV for Excel: `;` between fields, CRLF lines and a UTF-8 BOM, named after the page and the heading the table is under.
- *Copiar enlace a esta vista.* Copies the page's address with the table's state.
- *Pantalla completa.* Shows the table in a dialog that fills the screen and closes with Escape.
Icon-only actions SHALL have their accessible name and a hover hint.

**Pages.** A table with more than 50 rows SHALL show 25 rows per page, with first, previous, next and last controls, "Página N de M" and a choice of 25, 50, 100 or every row. Changing the sort, the box or a filter SHALL go back to the first page.

**Views by link.** Each table SHALL have an id made from the heading it is under and its place under it (`stacks-1`). The link to a view SHALL carry `tabla=<id>` and, when set, `orden` (columns, `.desc` for descending, comma-separated), `f.<column>` (the kept values, `|`-separated), `q` (the box), `ocultas` (the hidden columns) and `pagina` and `filas`, with the table's id as the hash. Opening a page with `tabla` naming one of its tables SHALL restore that state on it, skipping what no longer applies, and scroll to it.

#### Scenario: Sorting IP addresses

- **WHEN** a table's column holds `192.168.1.10`, `192.168.1.9` and `10.0.0.2` and the user presses its header
- **THEN** the rows SHALL be ordered `10.0.0.2`, `192.168.1.9`, `192.168.1.10`

#### Scenario: Sorting by two columns

- **WHEN** the user presses the header "kind" and then presses "name" with Shift
- **THEN** the rows SHALL be ordered by kind and, within each kind, by name, and both headers SHALL show their position in the sort

#### Scenario: Short table

- **WHEN** a table has 3 rows
- **THEN** it SHALL show the toolbar and a filter in each header

#### Scenario: One row

- **WHEN** a table has a single row
- **THEN** its headers SHALL sort it and no toolbar SHALL be shown

#### Scenario: Filtering a column from the box

- **WHEN** a table has the columns "name" and "kind" and the user types `kind:vm`
- **THEN** only the rows whose "kind" contains "vm" SHALL be shown, the count SHALL say how many of the total, and a chip SHALL show the box's text

#### Scenario: Filtering by values

- **WHEN** the user keeps the value "physical" in the "kind" column's filter
- **THEN** only the rows whose kind is "physical" SHALL be shown and a chip "kind: physical" SHALL remove that filter

#### Scenario: Nothing matches

- **WHEN** the user types a word no row holds
- **THEN** the table SHALL say "Ninguna fila coincide" and "Quitar filtros" SHALL bring every row back

#### Scenario: Long table

- **WHEN** a catalog type's table has 120 rows
- **THEN** it SHALL show its first 25 rows and "Página 1 de 5"

#### Scenario: Sharing a view

- **WHEN** the user sorts the table `machines-1` by "ip" descending, keeps "vm" in "kind" and copies the link to the view, and someone opens that link
- **THEN** the page SHALL open with that table sorted by "ip" descending, filtered to "vm" and scrolled into view

#### Scenario: Exporting

- **WHEN** a table is filtered to 3 of its 40 rows with one column hidden and the user presses "Descargar CSV"
- **THEN** the file SHALL hold the header and those 3 rows without the hidden column, separated by `;`

#### Scenario: Key/value table

- **WHEN** a table's first header cell is empty
- **THEN** it SHALL stay as written, with no sorting and no toolbar
