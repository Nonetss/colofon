# documentation-reader Specification

## Purpose
Defines how signed-in users read the content repositories on the web: the reader procedures of the API, the reader routes, the documentation layout with its sidebar, repository selector and table of contents, and the states shown when there is no content or a page has problems.

## Requirements

### Requirement: Reader procedures

The backend SHALL expose, under `v1.docs` and to every signed-in user, procedures to:
- read the navigation of every stored repository, ordered by name: its slug, its display name, the `nombre` and `descripcion` of its `doc.config.yaml`, whether it has readable content, and its navigation tree (`content-pages`);
- read one page by repository slug and page path (the empty path being the repository's home): its header, render tree, headings, breadcrumbs, previous and next pages, and its problems;
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

### Requirement: Reader content follows the clone

The reader procedures SHALL serve what the repository's clone holds at its last successful sync, with the last valid declarations of `content-source`. After a sync that changes the clone, the next read SHALL reflect the new commit. A repository whose sync fails SHALL keep being served from its last checkout.

#### Scenario: A push reaches the reader

- **WHEN** a writer pushes a new page to a hosted repository and the push sync finishes
- **THEN** the next navigation read SHALL list the new page

### Requirement: Reader routes

The web SHALL serve, to signed-in users only:
- `/`: the home of the "Todos" scope, or a redirect to `/<slug>` when the remembered scope is one repository that exists;
- `/<slug>`: the home of the repository `slug`, rendered from its `docs/index.mdx`, or the list of its top-level sections when it has none;
- `/<slug>/<page path>`: that page; a section's path SHALL show its `index.mdx`, or the list of its pages when it has none.

An unknown repository or page SHALL render the not-found page with status 404. Every reader route SHALL render the page content on the server, so the text, headings and links are in the HTML response.

#### Scenario: Opening a page

- **WHEN** a signed-in user opens `/casa/red/dns`
- **THEN** the response SHALL hold the page's title, description and body in its HTML

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

The sidebar SHALL list, for the current scope, an "Inicio" link to the scope's home and then the sections of the repository in navigation order, each section with its icon (from its `icono`, a default icon when it has none or the name is unknown), its title and its pages and subsections, collapsible with a chevron while the section's title links to its route. The section that holds the current page SHALL be expanded and the current page SHALL be marked as current. In the "Todos" scope every repository SHALL be a top-level group headed by its name, linking to its home, with its sections inside. A repository without readable content SHALL show "Sin contenido todavía".

#### Scenario: Current page

- **WHEN** the user opens `/casa/red/dns`
- **THEN** the section "red" SHALL be expanded and the DNS link SHALL be marked as current

#### Scenario: Scope "Todos"

- **WHEN** the scope is "Todos" and two repositories are stored
- **THEN** the sidebar SHALL show both repositories as groups, each with its sections

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

A page SHALL show a header with its breadcrumbs (the repository and sections above it, as links), its icon, title and description, its `actualizado` date (marked for review when older than six months) and, when present, the site's header fields as a list of labelled values, a `ficha` value linking to that page; then its body with the documentation prose styles; then links to the previous and next pages. Code blocks SHALL show their language and a "Copiar" control that copies the code. External links SHALL open in a new tab. Tables wider than the column SHALL scroll horizontally inside their frame without widening the page. Headings SHALL show an anchor link on hover. A section page SHALL list its pages and subsections, with their titles and descriptions, after its body.

#### Scenario: Copying a code block

- **WHEN** the user presses "Copiar" on a code block
- **THEN** the block's code SHALL be copied to the clipboard and the control SHALL say "Copiado" for a moment

#### Scenario: Stale page

- **WHEN** a page says `actualizado: 2026-01-10` and today is 2026-10-15
- **THEN** its header SHALL mark the date for review

#### Scenario: Previous and next

- **WHEN** the user reaches the end of the page DNS, whose previous page is VPN
- **THEN** a link to VPN SHALL be offered as the previous page

### Requirement: Table of contents

The table of contents SHALL list the page's level 2 and 3 headings, the level 3 ones indented, when the page has more than two, and SHALL mark the heading of the section being read as the user scrolls. Selecting an entry SHALL scroll to its heading, leaving it clear of the navbar. It SHALL end with a "Volver arriba" link.

#### Scenario: Reading a section

- **WHEN** the user scrolls until the heading "Zonas" is the last heading above the top of the reading area
- **THEN** the "Zonas" entry SHALL be marked as current

#### Scenario: Short page

- **WHEN** a page has two headings
- **THEN** no table of contents SHALL be shown

### Requirement: Home of every repository

The "Todos" home at `/` SHALL be written like a documentation page, not as cards: a title, and for each repository its name linking to its home, its `descripcion` and the list of its top-level sections with their descriptions. With no repository stored it SHALL say that there is no documentation yet and, for admins, link to `/admin/content` to add a repository.

#### Scenario: No repository

- **WHEN** an admin opens `/` and no repository is stored
- **THEN** the page SHALL say there is no documentation yet and offer a link to `/admin/content`

#### Scenario: Two repositories

- **WHEN** a user opens `/` in the "Todos" scope with two repositories stored
- **THEN** the page SHALL list both with their descriptions and top-level sections

### Requirement: Pages with problems

A page with problems SHALL still render what could be read. When its body could not be parsed, the page SHALL show its header and a notice that the page cannot be shown. Admins SHALL see the list of the page's problems, with file, line and message, in a notice above the body; other users SHALL see no problem details.

#### Scenario: Admin reads a broken page

- **WHEN** an admin opens a page with a broken link and a missing `descripcion`
- **THEN** the page SHALL render, with a notice above the body listing both problems

#### Scenario: Reader reads an unparseable page

- **WHEN** a user without the `admin` role opens a page whose MDX cannot be parsed
- **THEN** the page SHALL show its title and a notice that it cannot be shown, without the parser's message

### Requirement: Search of documentation pages

The navbar search SHALL list the pages of the current scope (every repository in "Todos") as records, once the user types, matched by title, description and the titles of their sections, each shown with its section trail ("Red › DNS", preceded by the repository's name in "Todos"), and selecting one SHALL open the page. They SHALL come from the same navigation read the sidebar uses, without another request.

#### Scenario: Finding a page

- **WHEN** the scope is "Casa" and the user types "dns" in the search
- **THEN** the DNS page of "Casa" SHALL appear as "Red › DNS", and selecting it SHALL open `/casa/red/dns`
