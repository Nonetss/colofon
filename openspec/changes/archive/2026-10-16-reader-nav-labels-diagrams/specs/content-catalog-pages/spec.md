## MODIFIED Requirements

### Requirement: Entity page

An entity's page SHALL be titled with its label, described with its type's `nombre`, iconed with its type's `icono`, dated with its `actualizado`, and its breadcrumbs SHALL be those of its type's page followed by the type ("Catálogo" and the type, after the menu group that shows the catalog when there is one). Its body SHALL show, in this order:
- a table of field and value, one row per declared field it sets, in declaration order, each named by its `etiqueta` (its field name when it has none) and each value shown by its kind as `<Entities>` shows it; `fuente` and `actualizado` SHALL NOT be rows;
- when `fuente` is set, a note under the table reading "Fuente: <fuente>";
- when it has a page (the first `ficha` field set), a link to it;
- "Páginas que la citan": every page whose header names it in a `ref` field, or whose body links to it with `catalogo:<type>/<id>`, as links titled with the page's title, in reading order;
- "Referencias": for each type with a `ref` field (at any depth) that names it, a table of the entities of that type that do, titled with that type's `plural`;
- "Diagramas": every diagram that has it as a node, rendered as `<Diagram>` renders it.
A section with nothing to show SHALL be left out.

#### Scenario: A virtual machine

- **WHEN** the machine `docker-01` has `host: pve-01`, the stack `docker-01-adguard` has `machine: docker-01`, and the page `network/dns` says `machines: [docker-01]`
- **THEN** the page of `docker-01` SHALL show its fields with `host` linking to `catalogo/machines/pve-01`, a "Páginas que la citan" list with DNS, and a "Referencias" table "Stacks" holding `docker-01-adguard`

#### Scenario: Entity cited only in a link

- **WHEN** the page `backups/duplicati` links `[NAS](catalogo:machines/nas)`
- **THEN** the page of `nas` SHALL list Duplicati under "Páginas que la citan"

#### Scenario: Labelled fields and source

- **WHEN** the type `field-kinds` declares `family` with `etiqueta: Familia` and `value` without one, and the entity `booleano` sets `family: scalar`, `value: "true o false"` and `fuente: manual`
- **THEN** the table SHALL hold the rows "Familia" → `scalar` and `value` → "true o false", no `fuente` row, and the note "Fuente: manual" SHALL follow it
