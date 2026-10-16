# documentation-reader Specification

## Purpose
Defines how signed-in users read the content repositories on the web: the reader procedures of the API, the reader routes, the documentation layout with its sidebar, repository selector and table of contents, and the states shown when there is no content or a page has problems.

## Requirements

### Requirement: Reader procedures

The backend SHALL expose, under `v1.docs` and to every signed-in user, procedures to:
- read the navigation of every stored repository, ordered by name: its slug, its display name, the `nombre` and `descripcion` of its `doc.config.yaml`, whether it has readable content, and its navigation tree (`content-pages`);
- read one page by repository slug and page path (the empty path being the repository's home): its header, render tree, headings, breadcrumbs, previous and next pages, its problems and the repository's cleaned stylesheet (`content-styles`), or `null` when the repository has none;
- read one image file of a repository's `docs/` folder by path, with its content type.

All three SHALL be `GET` procedures. An unknown repository, a page that does not exist, or a file that does not exist or is not an allowed image SHALL answer `NOT_FOUND`. Users without a session SHALL get `UNAUTHORIZED`. Problems SHALL be returned in full only to users with the `admin` role; other users SHALL only learn whether the page has problems. A repository whose content has never been read or synced SHALL be listed without a tree and marked as having no readable content.

#### Scenario: Navigation of two repositories

- **WHEN** a signed-in user reads the navigation and the repositories `casa` and `trabajo` are stored with valid content
- **THEN** the answer SHALL list both, ordered by name, each with its tree of sections and pages

#### Scenario: Repository not synced yet

- **WHEN** a hosted repository has had nothing pushed
- **THEN** it SHALL be listed without a tree and marked as having no readable content

#### Scenario: Page of an unknown repository

- **WHEN** a user reads the page `red/dns` of the repository `nadie`
- **THEN** the procedure SHALL answer `NOT_FOUND`

#### Scenario: Problems for a non-admin

- **WHEN** a user without the `admin` role reads a page that has problems
- **THEN** the answer SHALL say the page has problems and SHALL NOT list them

#### Scenario: File outside docs

- **WHEN** a user asks for the file `../doc.config.yaml` of a repository
- **THEN** the procedure SHALL answer `NOT_FOUND` and read nothing outside `docs/`

#### Scenario: Page of a repository with styles

- **WHEN** a user reads a page of a repository that holds `estilos/tema.css`
- **THEN** the answer SHALL carry the repository's cleaned stylesheet, the same for every page of that repository

### Requirement: Reader content follows the clone

The reader procedures SHALL serve what the repository's clone holds at its last successful sync, with the last valid declarations of `content-source`. After a sync that changes the clone, the next read SHALL reflect the new commit. A repository whose sync fails SHALL keep being served from its last checkout.

#### Scenario: A push reaches the reader

- **WHEN** a writer pushes a new page to a hosted repository and the push sync finishes
- **THEN** the next navigation read SHALL list the new page

### Requirement: Reader routes

The web SHALL serve, to signed-in users only (a session cookie, or an enabled API key in the `x-api-key` header resolved to its owner):
- `/`: the home of the "Todos" scope, or a redirect to `/<slug>` when the remembered scope is one repository that exists;
- `/<slug>`: the home of the repository `slug`, rendered from its `docs/index.mdx`, or the list of its top-level sections when it has none;
- `/<slug>/<page path>`: that page; a section's path SHALL show its `index.mdx`, or the list of its pages when it has none.

An unknown repository or page SHALL render the not-found page with status 404. Every reader route SHALL render the page content on the server, so the text, headings and links are in the HTML response.

#### Scenario: Opening a page

- **WHEN** a signed-in user opens `/casa/red/dns`
- **THEN** the response SHALL hold the page's title, description and body in its HTML

#### Scenario: Opening a page with an API key

- **WHEN** a request without cookies sends a valid key in `x-api-key` to `/casa/red/dns`
- **THEN** the response SHALL hold the page's title, description and body in its HTML, read as the key's owner

#### Scenario: Unknown page

- **WHEN** a signed-in user opens `/casa/no-existe`
- **THEN** the not-found page SHALL render with status 404

#### Scenario: Signed-out visitor

- **WHEN** a visitor without a session opens `/casa/red/dns`
- **THEN** they SHALL be redirected to the login page

### Requirement: Documentation layout

Reader routes SHALL use a documentation layout with: the authenticated navbar; a sidebar with the repository selector and the navigation of the current scope; the page in a single reading-width column; and, from the extra-large breakpoint, an "En esta página" table of contents beside it. The window SHALL be the scroller; the navbar, sidebar and table of contents SHALL stay in view while the page scrolls. Below the medium breakpoint the sidebar SHALL be hidden and SHALL open as a sheet from a menu button in the navbar, closing on navigation, on the backdrop or with Escape. The sidebar SHALL persist across client-side navigations, keeping its scroll offset and expanded sections, and SHALL scroll the current page into view only when it is out of sight. The layout SHALL have no site footer.

#### Scenario: Wide screen

- **WHEN** a page with five level 2 headings is opened on a 1440 px wide window
- **THEN** the sidebar, the page and the table of contents SHALL be shown side by side

#### Scenario: Phone

- **WHEN** a page is opened on a 390 px wide viewport and the user presses the menu button
- **THEN** the sidebar SHALL open as a sheet, and following a page link in it SHALL close it and open that page

#### Scenario: Sidebar keeps its place

- **WHEN** the user scrolls the sidebar down, expands a section and follows a link in it
- **THEN** the next page SHALL show the sidebar at the same offset with the same sections expanded

### Requirement: Sidebar navigation

The sidebar SHALL list, for the current scope, an "Inicio" link to the scope's home and then the repository's navigation in order. A group of `menu.yaml` (`content-menu`) SHALL show as a heading with its icon and title, not a link, with its entries under it. A section SHALL show its icon (a default icon when it has none), its title and its pages and subsections, collapsible with a chevron while the section's title links to its route. A page SHALL show its title, and its icon when the menu or its header gives one. The sections that hold the current page SHALL be expanded and the current page SHALL be marked as current. When the current page is not listed in the navigation (an entity page, or a page the menu leaves to no entry), the closest listed page above it by path SHALL be marked as current instead and the sections that hold it SHALL be expanded; a page with no listed page above it SHALL mark nothing. A section SHALL show a chevron only when it holds at least one page or subsection. In the "Todos" scope every repository SHALL be a top-level group headed by its name, linking to its home, with its groups and sections inside. A repository without readable content SHALL show "Sin contenido todavía".

#### Scenario: Current page

- **WHEN** the user opens `/casa/red/dns`
- **THEN** the section "red" SHALL be expanded and the DNS link SHALL be marked as current

#### Scenario: Scope "Todos"

- **WHEN** the scope is "Todos" and two repositories are stored
- **THEN** the sidebar SHALL show both repositories as groups, each with its sections

#### Scenario: Groups of the menu

- **WHEN** the repository `casa` has a `menu.yaml` with the groups "Red" (`icono: network`) and "Datos" (listing `catalogo`)
- **THEN** the sidebar SHALL show the heading "Red" with its icon and entries, then the heading "Datos" with the section "Catálogo" holding one link per catalog type

#### Scenario: Entity page

- **WHEN** the group "Datos" lists `catalogo` titled "Referencia" and the user opens `/prueba/catalogo/field-kinds/booleano`
- **THEN** the section "Referencia" SHALL be expanded and its page "Tipos de campo" SHALL be marked as current

#### Scenario: Folder with only an index

- **WHEN** the group "Escritura" lists `diagrams` and `docs/diagrams/` holds only `index.mdx`
- **THEN** "Diagramas" SHALL show as a page link without a chevron

### Requirement: Repository selector

The top of the sidebar SHALL offer a select listing "Todos" and every stored repository by name, when two or more repositories are stored. Choosing a repository SHALL open its home and limit the sidebar to it; choosing "Todos" SHALL open `/` and show every repository. The choice SHALL be remembered in a cookie so the server renders the right scope on the next request. Opening a page of a repository other than the selected one, while the scope is a single repository, SHALL switch the scope to that page's repository; while the scope is "Todos" it SHALL stay "Todos". With fewer than two repositories the select SHALL NOT be shown and the scope SHALL be that repository.

#### Scenario: Choosing a repository

- **WHEN** the user chooses "Trabajo" in the select
- **THEN** the browser SHALL open `/trabajo` and the sidebar SHALL list only its sections

#### Scenario: Choice remembered

- **WHEN** the user chose "Trabajo" and later opens `/`
- **THEN** they SHALL be redirected to `/trabajo`

#### Scenario: Following a link to another repository

- **WHEN** the scope is "Casa" and the user opens a link to `/trabajo/red/vpn`
- **THEN** the scope SHALL become "Trabajo"

### Requirement: Page view

A page SHALL show a header with its breadcrumbs (the repository, and the groups and sections above it, each section as a link and each group as text), its icon, title and description, its date (its `actualizado` as "Datos del …", marked for review as "Revisar · datos del …" when older than six months; when it sets none, its `editado` from `content-pages` "Last edit date" as "Editado el …", muted and never marked for review; no date when it has neither) and, when present, the site's header fields as a list of values, each named by the field's `etiqueta` (its field name when it has none), a `ficha` value linking to that page and a `ref` value linking to the entity's catalog page, titled with its label; then its body with the documentation prose styles; then links to the previous and next pages. Code blocks SHALL show their language and a "Copiar" control that copies the code. External links SHALL open in a new tab. Tables SHALL fit the reading column, their cells wrapping their text (a word longer than its column breaks), and SHALL scroll horizontally inside their frame, without widening the page, only when their columns cannot fit even wrapped. Headings SHALL show an anchor link on hover. A section page SHALL list its pages and subsections, with their titles and descriptions, after its body.

#### Scenario: Copying a code block

- **WHEN** the user presses "Copiar" on a code block
- **THEN** the block's code SHALL be copied to the clipboard and the control SHALL say "Copiado" for a moment

#### Scenario: Stale page

- **WHEN** a page says `actualizado: 2026-01-10` and today is 2026-10-15
- **THEN** its header SHALL mark the date for review

#### Scenario: Page dated only by git

- **WHEN** a page sets no `actualizado`, its `editado` is 2025-11-03 and today is 2026-10-15
- **THEN** its header SHALL show "Editado el" with that date, without marking it for review

#### Scenario: `actualizado` takes precedence

- **WHEN** a page says `actualizado: 2026-09-01` and its `editado` is 2026-10-14
- **THEN** its header SHALL show "Datos del" with 2026-09-01 and not the `editado` date

#### Scenario: Previous and next

- **WHEN** the user reaches the end of the page DNS, whose previous page is VPN
- **THEN** a link to VPN SHALL be offered as the previous page

#### Scenario: Breadcrumbs with a group

- **WHEN** the group "Críticas" of `casa` lists `containers/komodo` and the user opens `/casa/containers/komodo/new-stack`
- **THEN** the breadcrumbs SHALL be the repository, "Críticas" as text and "Komodo" as a link

#### Scenario: Long text in a table

- **WHEN** a table's last column holds sentences longer than the space left in the reading column
- **THEN** those cells SHALL wrap onto several lines and the table SHALL not scroll sideways

#### Scenario: Labelled header field

- **WHEN** `doc.config.yaml` declares the header field `files` with `etiqueta: Ficheros` and a page says `files: [diagram-file]`
- **THEN** its header SHALL list "Ficheros" with a link titled with the entity `diagram-file`'s label

### Requirement: Table of contents

The table of contents SHALL list the page's level 2 and 3 headings, the level 3 ones indented, when the page has more than two, and SHALL mark the heading of the section being read as the user scrolls. Selecting an entry SHALL scroll to its heading, leaving it clear of the navbar. It SHALL end with a "Volver arriba" link.

#### Scenario: Reading a section

- **WHEN** the user scrolls until the heading "Zonas" is the last heading above the top of the reading area
- **THEN** the "Zonas" entry SHALL be marked as current

#### Scenario: Short page

- **WHEN** a page has two headings
- **THEN** no table of contents SHALL be shown

### Requirement: Home of every repository

The "Todos" home at `/` SHALL be written like a documentation page, not as cards: a title, and for each repository its name linking to its home, its `descripcion` and the list of its top-level entries with their descriptions: its groups, each with its entries, when it has a `menu.yaml`, and its top-level sections otherwise. With no repository stored it SHALL say that there is no documentation yet and, for admins, link to `/admin/content` to add a repository.

#### Scenario: No repository

- **WHEN** an admin opens `/` and no repository is stored
- **THEN** the page SHALL say there is no documentation yet and offer a link to `/admin/content`

#### Scenario: Two repositories

- **WHEN** a user opens `/` in the "Todos" scope with two repositories stored
- **THEN** the page SHALL list both with their descriptions and top-level sections

#### Scenario: Repository with a menu

- **WHEN** the repository `casa` has a `menu.yaml` with the groups "Red" and "Datos"
- **THEN** its part of the home SHALL list "Red" and "Datos", each with its entries and their descriptions

### Requirement: Pages with problems

A page with problems SHALL still render what could be read. When its body could not be parsed, the page SHALL show its header and a notice that the page cannot be shown. Admins SHALL see the list of the page's problems, with file, line and message, in a notice above the body; other users SHALL see no problem details.

#### Scenario: Admin reads a broken page

- **WHEN** an admin opens a page with a broken link and a missing `descripcion`
- **THEN** the page SHALL render, with a notice above the body listing both problems

#### Scenario: Reader reads an unparseable page

- **WHEN** a user without the `admin` role opens a page whose MDX cannot be parsed
- **THEN** the page SHALL show its title and a notice that it cannot be shown, without the parser's message

### Requirement: Search of documentation pages

The navbar search SHALL list the pages of the current scope (every repository in "Todos") as records, once the user types, matched by title, description and the titles of their groups and sections, each shown with its trail of groups and sections ("Red › DNS", preceded by the repository's name in "Todos"), and selecting one SHALL open the page. The generated catalog type pages SHALL be listed as pages; entity pages SHALL NOT. They SHALL come from the same navigation read the sidebar uses, without another request.

#### Scenario: Finding a page

- **WHEN** the scope is "Casa" and the user types "dns" in the search
- **THEN** the DNS page of "Casa" SHALL appear as "Red › DNS", and selecting it SHALL open `/casa/red/dns`

#### Scenario: Finding a catalog type

- **WHEN** the scope is "Casa", the menu shows `catalogo` in the group "Datos" and the user types "machines"
- **THEN** the page "Machines" SHALL appear as "Datos › Catálogo › Machines", and selecting it SHALL open `/casa/catalogo/machines`

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

### Requirement: Repository styles on its pages

When a page's answer carries a stylesheet, the reader SHALL apply it to that page after the platform's styles, so that where both set the same property with the same selector weight the repository's value wins, the theme tokens of `:root` and `.dark` included. The stylesheet SHALL be part of the page's HTML, so it applies on the first paint and leaves with the page when the reader navigates to a page of another repository. Pages of other repositories, the "Todos" home and every page outside the reader SHALL NOT get it.

#### Scenario: A repository with its own primary colour

- **WHEN** a repository's `estilos/tema.css` sets `--primary` on `:root` and on `.dark`, and a user opens one of its pages
- **THEN** the page's links, accents and tokens built on `--primary` SHALL take the repository's colour in both themes

#### Scenario: Leaving for another repository

- **WHEN** the user goes from a page of a repository with styles to a page of a repository without them
- **THEN** the second page SHALL show the platform's styles only

#### Scenario: The admin area

- **WHEN** the user opens `/admin` after reading a repository with styles
- **THEN** no style of that repository SHALL apply
