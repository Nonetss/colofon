# content-catalog-pages Specification

## Purpose
Makes a content repository's catalog browsable in the reader: the platform generates a page for the catalog, one per type and one per entity, with no MDX behind them, served like any other page.
## Requirements
### Requirement: Generated catalog pages

The platform SHALL generate, for every repository with valid declarations, reader pages at the page paths `catalog` (the catalog), `catalog/<type>` (each catalog type) and `catalog/<type>/<id>` (each valid entity). They SHALL be read through the same reader procedures and routes as the pages of `docs/` (`/<slug>/catalog…`), with a header, a render tree, headings and breadcrumbs, and SHALL have their `llm.txt` like any page. They SHALL have no previous or next page. Entity pages SHALL NOT be listed in the navigation; type pages SHALL be listed where the navigation puts them (`content-menu`). An unknown type or entity, or an invalid entity, SHALL answer `NOT_FOUND`.

#### Scenario: Opening a type

- **WHEN** a signed-in user opens `/casa/catalog/machines`
- **THEN** the response SHALL hold the type's page rendered on the server

#### Scenario: Unknown entity

- **WHEN** a user opens `/casa/catalog/machines/old-01` and `machines` has no `old-01`
- **THEN** the not-found page SHALL render with status 404

### Requirement: Catalog page

The page `catalog` SHALL be titled "Catálogo", described as the structured data of the site, and SHALL show a table with one row per catalog type: its plural name (linked to the type's page), its description, its number of valid entities and how many of them have a page (the first `page` field set).

#### Scenario: Two types

- **WHEN** the catalog holds four valid machines, two of them with `page`, and three locations
- **THEN** the catalog page SHALL show the row "Machines", 4 entities, 2 with a page, and the row "Locations", 3 entities

### Requirement: Type page

A type's page SHALL be titled with the type's `plural`, described with its `description` (or "Datos de <plural>" when it has none) and iconed with its `icon`, and its body SHALL be the type's table as `<Entities type="<type>" />` renders it, with every label linking to the entity's page, or to its generated entity page when it has none. Entity files that fail their type's schema SHALL be reported on the type's page.

#### Scenario: Machines

- **WHEN** a user opens the page of the type `machines`, whose `view.columns` is `[name, ip, kind]`
- **THEN** the body SHALL be a table with those columns and one row per valid machine, and `docker-01`, which has no `page`, SHALL link to `catalog/machines/docker-01`

### Requirement: Entity page

An entity's page SHALL be titled with its label, described with its type's `name`, iconed with its type's `icon`, dated with its `updated`, and its breadcrumbs SHALL be those of its type's page followed by the type ("Catálogo" and the type, after the menu group that shows the catalog when there is one). Its body SHALL show, in this order:
- a table of field and value, one row per declared field it sets, in declaration order, each named by its `label` (its field name when it has none) and each value shown by its kind as `<Entities>` shows it; `source` and `updated` SHALL NOT be rows;
- when `source` is set, a note under the table reading "Fuente: <source>";
- when it has a page (the first `page` field set), a link to it;
- "Páginas que la citan": every page whose header names it in a `ref` field, or whose body links to it with `catalog:<type>/<id>`, as links titled with the page's title, in reading order;
- "Referencias": for each type with a `ref` field (at any depth) that names it, a table of the entities of that type that do, titled with that type's `plural`;
- "Diagramas": every diagram that has it as a node, rendered as `<Diagram>` renders it.
A section with nothing to show SHALL be left out.

#### Scenario: A virtual machine

- **WHEN** the machine `docker-01` has `host: pve-01`, the stack `docker-01-adguard` has `machine: docker-01`, and the page `network/dns` says `machines: [docker-01]`
- **THEN** the page of `docker-01` SHALL show its fields with `host` linking to `catalog/machines/pve-01`, a "Páginas que la citan" list with DNS, and a "Referencias" table "Stacks" holding `docker-01-adguard`

#### Scenario: Entity cited only in a link

- **WHEN** the page `backups/duplicati` links `[NAS](catalog:machines/nas)`
- **THEN** the page of `nas` SHALL list Duplicati under "Páginas que la citan"

#### Scenario: Labelled fields and source

- **WHEN** the type `field-kinds` declares `family` with `label: Familia` and `value` without one, and the entity `boolean` sets `family: scalar`, `value: "true o false"` and `source: manual`
- **THEN** the table SHALL hold the rows "Familia" → `scalar` and `value` → "true o false", no `source` row, and the note "Fuente: manual" SHALL follow it

### Requirement: Entity page edit date

An entity's page SHALL carry, as `editado`, the last commit date the source read for its entity file (`catalog/<type>/<id>.yaml`), independent of the entity's `updated`. The generated catalog index page and each type's page SHALL have no `editado`.

#### Scenario: Entity edited

- **WHEN** `catalog/machines/docker-01.yaml` sets no `updated` and its last commit is of 2026-09-30
- **THEN** the page of `docker-01` SHALL have `editado` 2026-09-30 and no `updated`

#### Scenario: Type page

- **WHEN** the reader opens the generated page of the type `machines`
- **THEN** it SHALL have no `editado`, whatever the dates of its entity files

### Requirement: Reserved catalog path

A folder `docs/catalog/` SHALL be reported, and the pages under it SHALL NOT be served or listed, so the generated catalog pages always own the `catalog` paths.

#### Scenario: A docs folder named catalog

- **WHEN** a repository holds `docs/catalog/index.mdx`
- **THEN** that page SHALL be reported as using a reserved path, and `/<slug>/catalog` SHALL show the generated catalog page
