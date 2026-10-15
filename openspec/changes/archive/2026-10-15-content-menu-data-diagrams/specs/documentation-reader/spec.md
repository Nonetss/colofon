## MODIFIED Requirements

### Requirement: Sidebar navigation

The sidebar SHALL list, for the current scope, an "Inicio" link to the scope's home and then the repository's navigation in order. A group of `menu.yaml` (`content-menu`) SHALL show as a heading with its icon and title, not a link, with its entries under it. A section SHALL show its icon (a default icon when it has none), its title and its pages and subsections, collapsible with a chevron while the section's title links to its route. A page SHALL show its title, and its icon when the menu or its header gives one. The section that holds the current page SHALL be expanded and the current page SHALL be marked as current. In the "Todos" scope every repository SHALL be a top-level group headed by its name, linking to its home, with its groups and sections inside. A repository without readable content SHALL show "Sin contenido todavía".

#### Scenario: Current page

- **WHEN** the user opens `/casa/red/dns`
- **THEN** the section "red" SHALL be expanded and the DNS link SHALL be marked as current

#### Scenario: Scope "Todos"

- **WHEN** the scope is "Todos" and two repositories are stored
- **THEN** the sidebar SHALL show both repositories as groups, each with its sections

#### Scenario: Groups of the menu

- **WHEN** the repository `casa` has a `menu.yaml` with the groups "Red" (`icono: network`) and "Datos" (listing `catalogo`)
- **THEN** the sidebar SHALL show the heading "Red" with its icon and entries, then the heading "Datos" with the section "Catálogo" holding one link per catalog type

### Requirement: Page view

A page SHALL show a header with its breadcrumbs (the repository, and the groups and sections above it, each section as a link and each group as text), its icon, title and description, its `actualizado` date (marked for review when older than six months) and, when present, the site's header fields as a list of labelled values, a `ficha` value linking to that page and a `ref` value linking to the entity's catalog page, titled with its label; then its body with the documentation prose styles; then links to the previous and next pages. Code blocks SHALL show their language and a "Copiar" control that copies the code. External links SHALL open in a new tab. Tables wider than the column SHALL scroll horizontally inside their frame without widening the page. Headings SHALL show an anchor link on hover. A section page SHALL list its pages and subsections, with their titles and descriptions, after its body.

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

### Requirement: Search of documentation pages

The navbar search SHALL list the pages of the current scope (every repository in "Todos") as records, once the user types, matched by title, description and the titles of their groups and sections, each shown with its trail of groups and sections ("Red › DNS", preceded by the repository's name in "Todos"), and selecting one SHALL open the page. The generated catalog type pages SHALL be listed as pages; entity pages SHALL NOT. They SHALL come from the same navigation read the sidebar uses, without another request.

#### Scenario: Finding a page

- **WHEN** the scope is "Casa" and the user types "dns" in the search
- **THEN** the DNS page of "Casa" SHALL appear as "Red › DNS", and selecting it SHALL open `/casa/red/dns`

#### Scenario: Finding a catalog type

- **WHEN** the scope is "Casa", the menu shows `catalogo` in the group "Datos" and the user types "machines"
- **THEN** the page "Machines" SHALL appear as "Datos › Catálogo › Machines", and selecting it SHALL open `/casa/catalogo/machines`
