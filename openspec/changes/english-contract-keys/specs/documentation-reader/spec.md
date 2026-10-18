## MODIFIED Requirements

### Requirement: Reader procedures

The backend SHALL expose, under `v1.docs` and to every signed-in user, procedures to:
- read the navigation of every repository the caller can read (the platform's and their own, `user-content-repositories`), ordered by name: its slug, its display name, the `name` and `description` of its `doc.config.yaml`, whether it has readable content, and its navigation tree (`content-pages`);
- read one page by repository slug and page path (the empty path being the repository's home): its header, render tree, headings, breadcrumbs, previous and next pages, its problems and the repository's cleaned stylesheet (`content-styles`), or `null` when the repository has none;
- read one image file of a repository's `docs/` folder by path, with its content type.

All three SHALL be `GET` procedures. An unknown repository, one the caller cannot read, a page that does not exist, or a file that does not exist or is not an allowed image SHALL answer `NOT_FOUND`. Users without a session SHALL get `UNAUTHORIZED`. Problems SHALL be returned in full only to users with the `admin` role; other users SHALL only learn whether the page has problems. A repository whose content has never been read or synced SHALL be listed without a tree and marked as having no readable content.

#### Scenario: Navigation of two repositories

- **WHEN** a signed-in user reads the navigation and the repositories `casa` and `trabajo` are stored with valid content
- **THEN** the answer SHALL list both, ordered by name, each with its tree of sections and pages

#### Scenario: Repository not synced yet

- **WHEN** a hosted repository has had nothing pushed
- **THEN** it SHALL be listed without a tree and marked as having no readable content

#### Scenario: Someone else's repository

- **WHEN** a user reads a page of a repository that belongs to another user
- **THEN** the procedure SHALL answer `NOT_FOUND`

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

- **WHEN** a user reads a page of a repository that holds `styles/theme.css`
- **THEN** the answer SHALL carry the repository's cleaned stylesheet, the same for every page of that repository

### Requirement: Page view

A page SHALL show a header with its breadcrumbs (the repository, and the groups and sections above it, each section as a link and each group as text), its icon, title and description, its date (its `updated` as "Datos del …", marked for review as "Revisar · datos del …" when older than six months; when it sets none, its `editado` from `content-pages` "Last edit date" as "Editado el …", muted and never marked for review; no date when it has neither) and, when present, the site's header fields as a list of values, each named by the field's `label` (its field name when it has none), a `page` value linking to that page and a `ref` value linking to the entity's catalog page, titled with its label; then its body with the documentation prose styles; then links to the previous and next pages. Code blocks SHALL show their language and a "Copiar" control that copies the code. External links SHALL open in a new tab. Tables SHALL fit the reading column, their cells wrapping their text (a word longer than its column breaks), and SHALL scroll horizontally inside their frame, without widening the page, only when their columns cannot fit even wrapped. Headings SHALL show an anchor link on hover. A section page SHALL list its pages and subsections, with their titles and descriptions, after its body.

#### Scenario: Copying a code block

- **WHEN** the user presses "Copiar" on a code block
- **THEN** the block's code SHALL be copied to the clipboard and the control SHALL say "Copiado" for a moment

#### Scenario: Stale page

- **WHEN** a page says `updated: 2026-01-10` and today is 2026-10-15
- **THEN** its header SHALL mark the date for review

#### Scenario: Page dated only by git

- **WHEN** a page sets no `updated`, its `editado` is 2025-11-03 and today is 2026-10-15
- **THEN** its header SHALL show "Editado el" with that date, without marking it for review

#### Scenario: `actualizado` takes precedence

- **WHEN** a page says `updated: 2026-09-01` and its `editado` is 2026-10-14
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

- **WHEN** `doc.config.yaml` declares the header field `files` with `label: Ficheros` and a page says `files: [diagram-file]`
- **THEN** its header SHALL list "Ficheros" with a link titled with the entity `diagram-file`'s label

### Requirement: Home of every repository

The "Todos" home at `/` SHALL be written like a documentation page, not as cards: a title, and for each repository its name linking to its home, its `description` and the list of its top-level entries with their descriptions: its groups, each with its entries, when it has a `menu.yaml`, and its top-level sections otherwise. With no repository stored it SHALL say that there is no documentation yet and, for admins, link to `/admin/content` to add a repository.

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

- **WHEN** an admin opens a page with a broken link and a missing `description`
- **THEN** the page SHALL render, with a notice above the body listing both problems

#### Scenario: Reader reads an unparseable page

- **WHEN** a user without the `admin` role opens a page whose MDX cannot be parsed
- **THEN** the page SHALL show its title and a notice that it cannot be shown, without the parser's message

### Requirement: Sidebar navigation

The sidebar SHALL list, for the current scope, an "Inicio" link to the scope's home and then the repository's navigation in order. A group of `menu.yaml` (`content-menu`) SHALL show as a heading with its icon and title, not a link, with its entries under it. A section SHALL show its icon (a default icon when it has none), its title and its pages and subsections, collapsible with a chevron while the section's title links to its route. A page SHALL show its title, and its icon when the menu or its header gives one. The sections that hold the current page SHALL be expanded and the current page SHALL be marked as current. When the current page is not listed in the navigation (an entity page, or a page the menu leaves to no entry), the closest listed page above it by path SHALL be marked as current instead and the sections that hold it SHALL be expanded; a page with no listed page above it SHALL mark nothing. A section SHALL show a chevron only when it holds at least one page or subsection. In the "Todos" scope every repository SHALL be a top-level group headed by its name, linking to its home, with its groups and sections inside. A repository without readable content SHALL show "Sin contenido todavía".

#### Scenario: Current page

- **WHEN** the user opens `/casa/red/dns`
- **THEN** the section "red" SHALL be expanded and the DNS link SHALL be marked as current

#### Scenario: Scope "Todos"

- **WHEN** the scope is "Todos" and two repositories are stored
- **THEN** the sidebar SHALL show both repositories as groups, each with its sections

#### Scenario: Groups of the menu

- **WHEN** the repository `casa` has a `menu.yaml` with the groups "Red" (`icon: network`) and "Datos" (listing `catalog`)
- **THEN** the sidebar SHALL show the heading "Red" with its icon and entries, then the heading "Datos" with the section "Catálogo" holding one link per catalog type

#### Scenario: Entity page

- **WHEN** the group "Datos" lists `catalog` titled "Referencia" and the user opens `/prueba/catalog/field-kinds/booleano`
- **THEN** the section "Referencia" SHALL be expanded and its page "Tipos de campo" SHALL be marked as current

#### Scenario: Folder with only an index

- **WHEN** the group "Escritura" lists `diagrams` and `docs/diagrams/` holds only `index.mdx`
- **THEN** "Diagramas" SHALL show as a page link without a chevron
