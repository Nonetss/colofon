## MODIFIED Requirements

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

- **WHEN** a user reads a page of a repository that holds `styles/theme.css`
- **THEN** the answer SHALL carry the repository's cleaned stylesheet, the same for every page of that repository

### Requirement: Sidebar navigation

The sidebar SHALL list, for the current scope, an "Inicio" link to the scope's home and then the repository's navigation in order. A group of `menu.yaml` (`content-menu`) SHALL show as a heading with its icon and title, not a link, with its entries under it. A section SHALL show its icon (a default icon when it has none), its title and its pages and subsections, collapsible with a chevron while the section's title links to its route. A page SHALL show its title, and its icon when the menu or its header gives one. The sections that hold the current page SHALL be expanded and the current page SHALL be marked as current. When the current page is not listed in the navigation (an entity page, or a page the menu leaves to no entry), the closest listed page above it by path SHALL be marked as current instead and the sections that hold it SHALL be expanded; a page with no listed page above it SHALL mark nothing. A section SHALL show a chevron only when it holds at least one page or subsection. In the "Todos" scope every repository SHALL be a top-level group headed by its name, linking to its home, with its groups and sections inside. A repository without readable content SHALL show "Sin contenido todavía".

#### Scenario: Current page

- **WHEN** the user opens `/casa/red/dns`
- **THEN** the section "red" SHALL be expanded and the DNS link SHALL be marked as current

#### Scenario: Scope "Todos"

- **WHEN** the scope is "Todos" and two repositories are stored
- **THEN** the sidebar SHALL show both repositories as groups, each with its sections

#### Scenario: Groups of the menu

- **WHEN** the repository `casa` has a `menu.yaml` with the groups "Red" (`icono: network`) and "Datos" (listing `catalog`)
- **THEN** the sidebar SHALL show the heading "Red" with its icon and entries, then the heading "Datos" with the section "Catálogo" holding one link per catalog type

#### Scenario: Entity page

- **WHEN** the group "Datos" lists `catalog` titled "Referencia" and the user opens `/prueba/catalog/field-kinds/booleano`
- **THEN** the section "Referencia" SHALL be expanded and its page "Tipos de campo" SHALL be marked as current

#### Scenario: Folder with only an index

- **WHEN** the group "Escritura" lists `diagrams` and `docs/diagrams/` holds only `index.mdx`
- **THEN** "Diagramas" SHALL show as a page link without a chevron

### Requirement: Search of documentation pages

The navbar search SHALL list the pages of the current scope (every repository in "Todos") as records, once the user has typed at least two characters, found by their title, description, header fields, the titles of their groups and sections, their headings and their body as `documentation-search` defines, in the order of relevance the search returns. Each SHALL be shown with its trail of groups and sections ("Red › DNS", preceded by the repository's name in "Todos") and, when the match is in a heading or the body, with an excerpt of the text around it with the matched words highlighted instead of the page's description. Selecting one SHALL open the page, at the section that holds the match when there is one. The generated catalog type pages SHALL be listed as pages; entity pages SHALL NOT. They SHALL come from `v1.docs.search` asked for the scope's repository, or for every repository in "Todos".

#### Scenario: Finding a page

- **WHEN** the scope is "Casa" and the user types "dns" in the search
- **THEN** the DNS page of "Casa" SHALL appear as "Red › DNS", and selecting it SHALL open `/casa/red/dns`

#### Scenario: Finding a catalog type

- **WHEN** the scope is "Casa", the menu shows `catalog` in the group "Datos" and the user types "machines"
- **THEN** the page "Machines" SHALL appear as "Datos › Catálogo › Machines", and selecting it SHALL open `/casa/catalog/machines`

#### Scenario: Finding a page by its body

- **WHEN** the scope is "Casa" and the user types "inversa", a word only the body of "DNS" holds, under its heading "Resolución inversa"
- **THEN** "Red › DNS" SHALL appear with an excerpt where "inversa" is highlighted, and selecting it SHALL open `/casa/red/dns` at that heading

#### Scenario: Title matches come first

- **WHEN** the user types "vlan", the title of one page and a word in the body of another
- **THEN** the page titled "VLAN" SHALL be listed before the other

#### Scenario: Search respects the scope

- **WHEN** the scope is "Casa" and a page of another repository also matches
- **THEN** only pages of "Casa" SHALL be listed

#### Scenario: One character searches nothing

- **WHEN** the user types a single character
- **THEN** no documentation page SHALL be listed

### Requirement: Repository styles on its pages

When a page's answer carries a stylesheet, the reader SHALL apply it to that page after the platform's styles, so that where both set the same property with the same selector weight the repository's value wins, the theme tokens of `:root` and `.dark` included. The stylesheet SHALL be part of the page's HTML, so it applies on the first paint and leaves with the page when the reader navigates to a page of another repository. Pages of other repositories, the "Todos" home and every page outside the reader SHALL NOT get it.

#### Scenario: A repository with its own primary colour

- **WHEN** a repository's `styles/theme.css` sets `--primary` on `:root` and on `.dark`, and a user opens one of its pages
- **THEN** the page's links, accents and tokens built on `--primary` SHALL take the repository's colour in both themes

#### Scenario: Leaving for another repository

- **WHEN** the user goes from a page of a repository with styles to a page of a repository without them
- **THEN** the second page SHALL show the platform's styles only

#### Scenario: The admin area

- **WHEN** the user opens `/admin` after reading a repository with styles
- **THEN** no style of that repository SHALL apply
