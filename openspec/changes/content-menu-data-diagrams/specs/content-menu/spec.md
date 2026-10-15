## Purpose

Lets a content repository declare its sidebar in one YAML file, grouping pages, sections and catalog pages independently of the folders that store them, with typed icons and the YAML taking precedence over page headers.

## ADDED Requirements

### Requirement: Menu file

A content repository MAY hold a `menu.yaml` file at its root. It SHALL declare `secciones`, a non-empty list of groups. Each group SHALL declare `titulo` (required text), `icono` (optional, a Lucide icon name), `descripcion` (optional text) and `paginas`, a non-empty list of entries. An entry SHALL be either a path written as text, or an object with `ruta` (the path, required), `titulo` (optional text) and `icono` (optional, a Lucide icon name). A path SHALL name a page, a section folder under `docs/`, the catalog (`catalogo`) or a catalog type (`catalogo/<type>`). Any other key, a missing required key or an icon that is not a Lucide icon name SHALL make the file invalid, reported per file with the field path.

#### Scenario: A valid menu

- **WHEN** `menu.yaml` holds a group `titulo: Red`, `icono: network` with `paginas: [network, { ruta: containers/komodo, icono: layers }]`, and both paths exist
- **THEN** the file SHALL be valid and the group SHALL list the section "network" and then the section "containers/komodo"

#### Scenario: Misspelt icon

- **WHEN** a group says `icono: netwrok`
- **THEN** `menu.yaml` SHALL be reported on `secciones.0.icono` as not being a Lucide icon name

#### Scenario: Unknown key

- **WHEN** a group says `orden: 2`
- **THEN** `menu.yaml` SHALL be reported naming `orden` as a key it does not accept

### Requirement: Entries that point at nothing

An entry whose path names no page, section folder, catalog or catalog type, an entry naming the home (`""` or `index`), and an entry equal to, inside or containing the path of an earlier entry SHALL each be reported on `menu.yaml` with the entry's field path, and SHALL be left out of the navigation while the rest of the menu is used.

#### Scenario: Missing page

- **WHEN** a group lists `network/vpn` and there is no such page or folder
- **THEN** `menu.yaml` SHALL be reported naming `network/vpn`, and the group SHALL show its other entries

#### Scenario: Overlapping entries

- **WHEN** one group lists `containers` and a later group lists `containers/komodo`
- **THEN** the later entry SHALL be reported as already shown by `containers` and left out

### Requirement: Navigation from the menu

When the repository has a valid `menu.yaml`, its navigation SHALL be one group per entry of `secciones`, in that order, each titled, described and iconed by the group. A group's children SHALL be its entries in the order written: a page entry SHALL be a page; a section folder entry SHALL be that section with its whole subtree, ordered inside as the folder navigation orders it; `catalogo` SHALL be the catalog section holding one page per catalog type; `catalogo/<type>` SHALL be that type's page. Groups SHALL NOT be routes. The reading order (previous and next page) SHALL follow the menu, depth first, and SHALL skip the catalog's pages. A page's breadcrumbs SHALL be its group (as text, without a link) followed by the sections above it inside its entry.

#### Scenario: A folder shown in another group

- **WHEN** the group "Críticas" lists `containers/komodo` and the group "Red" lists `network`
- **THEN** the sidebar SHALL show "Red" with the section "network" and its pages, then "Críticas" with the section "containers/komodo" and its pages, and the URL of every page SHALL still be its file path

#### Scenario: Breadcrumbs follow the menu

- **WHEN** the group "Críticas" lists `containers/komodo` and the user opens `containers/komodo/new-stack`
- **THEN** its breadcrumbs SHALL be "Críticas" without a link, then "Komodo" linking to `containers/komodo`

#### Scenario: Previous and next across groups

- **WHEN** the group "Red" ends with the page `network/dns` and the next group starts with the section `containers/komodo`
- **THEN** the next page of `network/dns` SHALL be `containers/komodo`

### Requirement: Pages left out of the menu

When the repository has a valid `menu.yaml`, every page and catalog type page that no entry shows SHALL be listed in a last group titled "Otros", arranged as the folder navigation would arrange them, and each such page SHALL be reported with a problem saying it is not in `menu.yaml`. With every page shown, there SHALL be no "Otros" group.

#### Scenario: A new page not yet in the menu

- **WHEN** a writer adds `docs/monitoring/grafana.mdx` and no entry shows it
- **THEN** the page SHALL be listed under "Otros", it SHALL still be served at its route, and admins reading it SHALL see the problem that it is not in `menu.yaml`

### Requirement: Without a menu

A repository without `menu.yaml` SHALL be navigated from its folders (`content-pages`, "Navigation tree"), followed by the catalog section when the catalog has at least one type.

#### Scenario: Old repository

- **WHEN** a repository has no `menu.yaml` and declares the types `machines` and `services`
- **THEN** its navigation SHALL be its folder sections and pages as before, then a section "Catálogo" listing "Machines" and "Services"

### Requirement: The menu wins over page headers

What `menu.yaml` says about an entry SHALL be what every view shows for it: an entry's `titulo` and `icono` SHALL be the page's or section's title and icon in the sidebar, the page header, the breadcrumbs, the section listings, the search and the `llms.txt` indexes, whatever its header says. The header's `titulo` and `icono` SHALL only apply where the menu says nothing. When a page's header sets `titulo` or `icono` to a different value than its entry, the page SHALL be reported naming both values and saying that `menu.yaml` wins.

#### Scenario: Icon set in both places

- **WHEN** `menu.yaml` lists `{ ruta: containers/komodo, icono: layers }` and `docs/containers/komodo/index.mdx` says `icono: box`
- **THEN** the sidebar and the page header SHALL show the `layers` icon, and the page SHALL be reported saying its `icono` `box` is overridden by `menu.yaml` (`layers`)

#### Scenario: Only the header says it

- **WHEN** `menu.yaml` lists `network` without `icono` and `docs/network/index.mdx` says `icono: network`
- **THEN** the section SHALL show the `network` icon and no problem SHALL be reported
