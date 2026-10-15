## MODIFIED Requirements

### Requirement: Navigation from the menu

When the repository has a valid `menu.yaml`, its navigation SHALL be one group per entry of `secciones`, in that order, each titled, described and iconed by the group. A group's children SHALL be its entries in the order written: a page entry SHALL be a page; a section folder entry SHALL be that section with its whole subtree, ordered inside as the folder navigation orders it, except a folder whose only page is its `index.mdx`, which SHALL be a page (`content-pages`, "Navigation tree"); `catalogo` SHALL be the catalog section holding one page per catalog type; `catalogo/<type>` SHALL be that type's page. Groups SHALL NOT be routes. The reading order (previous and next page) SHALL follow the menu, depth first, and SHALL skip the catalog's pages. A page's breadcrumbs SHALL be its group (as text, without a link) followed by the sections above it inside its entry.

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
