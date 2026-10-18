## MODIFIED Requirements

### Requirement: Menu file

A content repository MAY hold a `menu.yaml` file at its root. It SHALL declare `sections`, a non-empty list of groups. Each group SHALL declare `title` (required text), `icon` (optional, a Lucide icon name), `description` (optional text) and `pages`, a non-empty list of entries. An entry SHALL be either a path written as text, or an object with `path` (the path, required), `title` (optional text) and `icon` (optional, a Lucide icon name). A path SHALL name a page, a section folder under `docs/`, the catalog (`catalog`) or a catalog type (`catalog/<type>`). Any other key, a missing required key or an icon that is not a Lucide icon name SHALL make the file invalid, reported per file with the field path.

#### Scenario: A valid menu

- **WHEN** `menu.yaml` holds a group `title: Red`, `icon: network` with `pages: [network, { path: containers/komodo, icon: layers }]`, and both paths exist
- **THEN** the file SHALL be valid and the group SHALL list the section "network" and then the section "containers/komodo"

#### Scenario: Misspelt icon

- **WHEN** a group says `icon: netwrok`
- **THEN** `menu.yaml` SHALL be reported on `sections.0.icon` as not being a Lucide icon name

#### Scenario: Unknown key

- **WHEN** a group says `order: 2`
- **THEN** `menu.yaml` SHALL be reported naming `order` as a key it does not accept

### Requirement: Navigation from the menu

When the repository has a valid `menu.yaml`, its navigation SHALL be one group per entry of `sections`, in that order, each titled, described and iconed by the group. A group's children SHALL be its entries in the order written: a page entry SHALL be a page; a section folder entry SHALL be that section with its whole subtree, ordered inside as the folder navigation orders it, except a folder whose only page is its `index.mdx`, which SHALL be a page (`content-pages`, "Navigation tree"); `catalog` SHALL be the catalog section holding one page per catalog type; `catalog/<type>` SHALL be that type's page. Groups SHALL NOT be routes. The reading order (previous and next page) SHALL follow the menu, depth first, and SHALL skip the catalog's pages. A page's breadcrumbs SHALL be its group (as text, without a link) followed by the sections above it inside its entry.

#### Scenario: A folder shown in another group

- **WHEN** the group "Críticas" lists `containers/komodo` and the group "Red" lists `network`
- **THEN** the sidebar SHALL show "Red" with the section "network" and its pages, then "Críticas" with the section "containers/komodo" and its pages, and the URL of every page SHALL still be its file path

#### Scenario: A folder entry with only an index

- **WHEN** the group "Escritura" lists `diagrams` and `docs/diagrams/` holds only `index.mdx`
- **THEN** the group SHALL hold "Diagramas" as a page with no children, keeping the title and icon the entry gives

#### Scenario: Breadcrumbs follow the menu

- **WHEN** the group "Críticas" lists `containers/komodo` and the user opens `containers/komodo/new-stack`
- **THEN** its breadcrumbs SHALL be "Críticas" without a link, then "Komodo" linking to `containers/komodo`

#### Scenario: Previous and next across groups

- **WHEN** the group "Red" ends with the page `network/dns` and the next group starts with the section `containers/komodo`
- **THEN** the next page of `network/dns` SHALL be `containers/komodo`

### Requirement: The menu wins over page headers

What `menu.yaml` says about an entry SHALL be what every view shows for it: an entry's `title` and `icon` SHALL be the page's or section's title and icon in the sidebar, the page header, the breadcrumbs, the section listings, the search and the `llms.txt` indexes, whatever its header says. The header's `title` and `icon` SHALL only apply where the menu says nothing. When a page's header sets `title` or `icon` to a different value than its entry, the page SHALL be reported naming both values and saying that `menu.yaml` wins.

#### Scenario: Icon set in both places

- **WHEN** `menu.yaml` lists `{ path: containers/komodo, icon: layers }` and `docs/containers/komodo/index.mdx` says `icon: box`
- **THEN** the sidebar and the page header SHALL show the `layers` icon, and the page SHALL be reported saying its `icon` `box` is overridden by `menu.yaml` (`layers`)

#### Scenario: Only the header says it

- **WHEN** `menu.yaml` lists `network` without `icon` and `docs/network/index.mdx` says `icon: network`
- **THEN** the section SHALL show the `network` icon and no problem SHALL be reported
