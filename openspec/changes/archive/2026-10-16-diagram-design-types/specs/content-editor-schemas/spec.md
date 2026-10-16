## MODIFIED Requirements

### Requirement: Schemas of the content's files

The backend SHALL serve, without authentication, as JSON Schema draft-07, for the repository named by `{repository}`:
- `GET /api/v1/content/schemas/{repository}/config`: the schema of `doc.config.yaml`;
- `GET /api/v1/content/schemas/{repository}/menu`: the schema of `menu.yaml`, where a path lists the repository's page paths, section folders, `catalogo` and `catalogo/<type>` for each type;
- `GET /api/v1/content/schemas/{repository}/diagram`: the schema of a diagram `.json` file (`content-diagrams`) in any of its forms: the drawn diagram and the chain without `type`, and each typed form (`content-diagram-types`) selected by its `type`, with its own keys and its `variant` values, accepting `$schema`, where a box's or typed item's `entity` lists `<type>/<id>` for every entity of the catalog, its `page` lists the repository's page paths, and `type`, `kind`, `shape`, `hue`, an edge's `kind`, `route`, `head` and `anchor`, and every other closed value list their values;
- `GET /api/v1/content/schemas/{repository}/type`: the schema of a `_tipo.yaml`, where a reference's `a` lists the catalog types that exist and every field declaration accepts `etiqueta`;
- `GET /api/v1/content/schemas/{repository}/entities/{type}`: the schema of an entity of `{type}`, titled with the type's `nombre`, where each declared field is titled with its `etiqueta` when it has one and carries its `descripcion`, a `ref` field lists the ids of the referenced type, a `ficha` field lists the page paths, an `enum` field lists its values, the fields without `opcional: true` are required and undeclared fields are refused.

Every `icono` in these schemas SHALL list the Lucide icon names the platform accepts. An unknown `{repository}`, an unknown `{type}`, or any schema requested for a repository without valid content SHALL answer `NOT_FOUND`.

#### Scenario: Reference suggestions

- **WHEN** the editor requests the `maquinas` schema of `documentacion` and that repository's `ubicaciones` type has `casa` and `hetzner`
- **THEN** the `ubicacion` field SHALL accept only `casa` and `hetzner`

#### Scenario: Menu suggestions

- **WHEN** the editor requests the menu schema of `documentacion`, whose pages are `network`, `network/dns` and `getting-started` and whose types are `machines` and `services`
- **THEN** a menu path SHALL accept exactly `network`, `network/dns`, `getting-started`, `catalogo`, `catalogo/machines` and `catalogo/services`

#### Scenario: Icon suggestions

- **WHEN** the editor requests the type schema of `documentacion`
- **THEN** `icono` SHALL accept only Lucide icon names, so `server` is accepted and `servr` is marked

#### Scenario: Labelled field

- **WHEN** the type `field-kinds` declares `family: { tipo: enum, valores: [scalar], etiqueta: Familia }` and the editor requests its entity schema
- **THEN** the property `family` SHALL be titled "Familia"

#### Scenario: Unknown type

- **WHEN** a client requests `GET /api/v1/content/schemas/documentacion/entities/frutas` and `documentacion` has no `frutas` type
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Repositories stay apart

- **WHEN** `documentacion` has a `maquinas` type and `homelab` does not
- **THEN** `GET /api/v1/content/schemas/homelab/entities/maquinas` SHALL answer `NOT_FOUND`

#### Scenario: Diagram suggestions

- **WHEN** the editor requests the diagram schema of `documentacion`, whose `services` type has `komodo` and whose pages are `index` and `containers/komodo`
- **THEN** a box's `entity` SHALL accept only `services/komodo`, its `page` only `index` and `containers/komodo`, and its `hue` only the ten hue names

#### Scenario: Typed diagram suggestions

- **WHEN** the editor validates a diagram file with `type: "gantt"` against the diagram schema
- **THEN** it SHALL suggest `phases` and `today`, SHALL mark `nodes` as not allowed, and a task's `entity` SHALL accept only the catalog's `<type>/<id>`
