## MODIFIED Requirements

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

### Requirement: Page view

A page SHALL show a header with its breadcrumbs (the repository, and the groups and sections above it, each section as a link and each group as text), its icon, title and description, its `actualizado` date (marked for review when older than six months) and, when present, the site's header fields as a list of values, each named by the field's `etiqueta` (its field name when it has none), a `ficha` value linking to that page and a `ref` value linking to the entity's catalog page, titled with its label; then its body with the documentation prose styles; then links to the previous and next pages. Code blocks SHALL show their language and a "Copiar" control that copies the code. External links SHALL open in a new tab. Tables SHALL fit the reading column, their cells wrapping their text (a word longer than its column breaks), and SHALL scroll horizontally inside their frame, without widening the page, only when their columns cannot fit even wrapped. Headings SHALL show an anchor link on hover. A section page SHALL list its pages and subsections, with their titles and descriptions, after its body.

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

#### Scenario: Labelled header field

- **WHEN** `doc.config.yaml` declares the header field `files` with `etiqueta: Ficheros` and a page says `files: [diagram-file]`
- **THEN** its header SHALL list "Ficheros" with a link titled with the entity `diagram-file`'s label
