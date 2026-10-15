## MODIFIED Requirements

### Requirement: Navigation tree

A repository's pages SHALL form a tree: `docs/index.mdx` is the repository's home, each folder under `docs/` that holds at least one page besides its `index.mdx` (directly or in a subfolder) is a section titled and described by its `index.mdx` (by its folder name when it has none), and each other `.mdx` file is a page of its folder's section. A folder whose only page is its `index.mdx` SHALL be a page, not a section: it SHALL have no children, and its route SHALL show its `index.mdx`. Within a section, sections and pages SHALL be ordered by `orden` (pages without one last) and then by title in Spanish collation. The reading order SHALL visit each section's index before its pages and subsections, depth first, and give every page its previous and next page and its breadcrumbs (the sections above it). When the repository has a valid `menu.yaml`, the top of the navigation, the reading order and the breadcrumbs SHALL follow it instead (`content-menu`), and each folder it shows SHALL keep the order described here inside it.

#### Scenario: Order inside a section

- **WHEN** `docs/red/` holds `dns.mdx` (`orden: 2`), `vpn.mdx` (`orden: 1`) and `anexo.mdx` (no `orden`)
- **THEN** the section "red" SHALL list VPN, DNS and Anexo, in that order

#### Scenario: Folder without index

- **WHEN** `docs/varios/` holds pages but no `index.mdx`
- **THEN** it SHALL be a section titled "varios", and its route SHALL show the list of its pages

#### Scenario: Folder with only an index

- **WHEN** `docs/diagrams/` holds only `index.mdx`, titled "Diagramas"
- **THEN** "Diagramas" SHALL be a page with no children at the route `diagrams`, ordered among its siblings by its `orden` and title

#### Scenario: Previous and next

- **WHEN** the section "red" lists VPN then DNS
- **THEN** VPN's next page SHALL be DNS and DNS's previous page SHALL be VPN

#### Scenario: Order kept inside a menu entry

- **WHEN** `menu.yaml` lists the folder `red` and `docs/red/` holds `dns.mdx` (`orden: 2`) and `vpn.mdx` (`orden: 1`)
- **THEN** the section "red" SHALL list VPN then DNS inside its group

### Requirement: Entities component

`<Entities type="…" />`, written as a block, SHALL render a table of the valid entities of the catalog type its `type` names, as part of the page's render tree. `columns` (field names separated by commas, `id` included) SHALL choose the columns in that order; without it the columns SHALL be the type's `vista.columnas`, and without those the type's `etiqueta` field (or `id` when the type has none) followed by every other declared field in declaration order. Each column's header SHALL be its field's `etiqueta`, or its field name when it has none (`id`, `fuente` and `actualizado` keep their name). Rows SHALL be ordered by the entity's label: its `etiqueta` value, or its id when the type has no `etiqueta` or the entity leaves it out. The label column (the `etiqueta` field, or `id`) SHALL show the label, linked to the entity's page — the value of the first `ficha` field its type declares — or, when the entity has none, to its generated catalog page (`content-catalog-pages`).

Other cells SHALL show their value by field kind: `texto`, `numero`, `entero`, `fecha`, `ip` and `enum` as written; `booleano` as "Sí" or "No"; `ref` as the referenced entity's label, linked to its page, or to its generated catalog page when it has none; `ficha` as a link to that page titled with the page's title; `url` and `email` as links out; `lista` as its values shown by their kind and joined by commas; `objeto` as its `name: value` pairs joined by semicolons. An absent optional value SHALL leave the cell empty.

`group` SHALL split the table into one block per value of the field it names, each preceded by that value shown by its kind, in the order of the field's `valores` for an `enum` and by shown value otherwise, with a last block for the entities that leave the field out; the group field's own column SHALL be left out of every block. A type with no valid entities SHALL render a line saying so.

An attribute other than `type`, `columns` and `group`, an attribute value in braces, a column or `group` naming a field the type does not declare, and an entity file that fails its type's schema SHALL each be reported with the component's line (the entity file's problem naming the file); the unknown column or group SHALL be left out and the invalid entity left out of the table, while the rest renders. A missing or unknown `type` SHALL be reported naming the catalog's types and SHALL render a notice in place of the table. An `<Entities>` inside a paragraph's text SHALL be reported as needing its own block and rendered as a notice.

#### Scenario: Grouped table with chosen columns

- **WHEN** the catalog type `services` declares `category` as an `enum` with `valores: [network, containers, backups]` and a page holds `<Entities type="services" group="category" columns="name,status,summary" />`
- **THEN** the page SHALL show a "network" block, then "containers", then "backups", each a table with the columns `name`, `status` and `summary` holding the services of that category ordered by name, and no problem SHALL be reported

#### Scenario: Columns from the type's view

- **WHEN** the type `machines` declares `etiqueta: name`, `vista: { columnas: [name, ip, kind, location, purpose] }` and `location` as a `ref` to `locations`, and a page holds `<Entities type="machines" />`
- **THEN** the table SHALL have those five columns, the machine `docker-01` without a `name` SHALL show `docker-01` in the `name` column, and its `location` SHALL show the label of the referenced location

#### Scenario: Entity linked to its page

- **WHEN** the service `komodo` has `page: containers/komodo` in repository `casa`, and the service `adguard` has no `page`
- **THEN** "Komodo" SHALL link to `/casa/containers/komodo` and "AdGuard" SHALL link to `/casa/catalogo/services/adguard`

#### Scenario: Unknown column

- **WHEN** a page holds `<Entities type="services" columns="name,owner" />` and `services` declares no `owner`
- **THEN** the page SHALL be reported on that line naming `owner`, and the table SHALL render with the `name` column only

#### Scenario: Unknown type

- **WHEN** a page holds `<Entities type="servers" />` and the catalog has no `servers` type
- **THEN** the page SHALL be reported naming `servers` and the catalog's types, and a notice SHALL render where the table would be

#### Scenario: Invalid entity

- **WHEN** `catalogo/machines/nas.yaml` lacks the required field `ip` and a page holds `<Entities type="machines" />`
- **THEN** the page SHALL be reported naming `catalogo/machines/nas.yaml` and the missing field, and the table SHALL hold every other machine

#### Scenario: Labelled column

- **WHEN** the type `field-kinds` declares `family: { tipo: enum, valores: [scalar], etiqueta: Familia }` and `example: { tipo: texto }`, and a page holds `<Entities type="field-kinds" columns="id,family,example" />`
- **THEN** the table's headers SHALL be `id`, "Familia" and `example`
