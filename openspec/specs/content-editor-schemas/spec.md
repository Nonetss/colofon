# Content Editor Schemas

## Purpose

Lets an editor complete, validate and document a content repository's YAML files and JSON diagrams from schemas the backend serves, always matching the current content, with one fixed editor setting and no generated files.
## Requirements
### Requirement: Public schema catalog

The backend SHALL serve at `GET /api/v1/content/schemas/{repository}`, where `{repository}` is a stored content repository's slug, without authentication, a schema catalog in the SchemaStore catalog format (`version` 1 and a `schemas` list of `name`, `description`, `url` and `fileMatch`). It SHALL list one entry for `doc.config.yaml`, one for `menu.yaml`, one for `diagrams/*.json`, one for `catalog/*/_type.yaml` and one per catalog type matching `catalog/<type>/*.yaml` and excluding `catalog/<type>/_*.yaml`. Each `url` SHALL be absolute, built from the public origin in `CORS_ORIGIN` and SHALL point at that same repository's schemas. A repository without valid content yet SHALL get a catalog with no schemas. An unknown slug SHALL answer `NOT_FOUND`. `GET /api/v1/content/schemas`, without a slug, SHALL NOT exist.

#### Scenario: Catalog of a site with two types

- **WHEN** the repository `documentacion` has the types `maquinas` and `ubicaciones`
- **THEN** its catalog SHALL hold six entries, the `maquinas` entry SHALL match `catalog/maquinas/*.yaml` but not `catalog/maquinas/_type.yaml`, and its `url` SHALL be `<CORS_ORIGIN>/api/v1/content/schemas/documentacion/entities/maquinas`

#### Scenario: Unknown repository

- **WHEN** a client requests `GET /api/v1/content/schemas/inexistente` and no repository has that slug
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Repository not synced yet

- **WHEN** a client requests the catalog of a repository created a moment ago whose first sync has not finished
- **THEN** the backend SHALL answer a catalog with no schemas

#### Scenario: Diagram entry

- **WHEN** a client requests the catalog of `documentacion`
- **THEN** its diagram entry SHALL match `diagrams/*.json` and SHALL NOT match `diagrams/*.yaml`

### Requirement: Schemas of the content's files

The backend SHALL serve, without authentication, as JSON Schema draft-07, for the repository named by `{repository}`:
- `GET /api/v1/content/schemas/{repository}/config`: the schema of `doc.config.yaml`;
- `GET /api/v1/content/schemas/{repository}/menu`: the schema of `menu.yaml`, where a path lists the repository's page paths, section folders, `catalog` and `catalog/<type>` for each type;
- `GET /api/v1/content/schemas/{repository}/diagram`: the schema of a diagram `.json` file (`content-diagrams`) in any of its forms: the drawn diagram and the chain without `type`, and each typed form (`content-diagram-types`) selected by its `type`, with its own keys and its `variant` values, accepting `$schema`, where a box's or typed item's `entity` lists `<type>/<id>` for every entity of the catalog, its `page` lists the repository's page paths, and `type`, `kind`, `shape`, `hue`, an edge's `kind`, `route`, `head` and `anchor`, and every other closed value list their values;
- `GET /api/v1/content/schemas/{repository}/type`: the schema of a `_type.yaml`, where a reference's `to` lists the catalog types that exist and every field declaration accepts `label`;
- `GET /api/v1/content/schemas/{repository}/entities/{type}`: the schema of an entity of `{type}`, titled with the type's `name`, where each declared field is titled with its `label` when it has one and carries its `description`, a `ref` field lists the ids of the referenced type, a `page` field lists the page paths, an `enum` field lists its values, the fields without `optional: true` are required and undeclared fields are refused.

Every `icon` in these schemas SHALL list the Lucide icon names the platform accepts. The schemas of `doc.config.yaml`, `menu.yaml`, `_type.yaml` and the entities SHALL use the names of the repository's contract version (`content-contract` "Contract versions"): the English names for a version 2 repository, and the Spanish names of "Contract 1 names" for a version 1 one. The diagram schema SHALL be the same for both. An unknown `{repository}`, an unknown `{type}`, or any schema requested for a repository without valid content SHALL answer `NOT_FOUND`.

#### Scenario: Reference suggestions

- **WHEN** the editor requests the `maquinas` schema of `documentacion` and that repository's `ubicaciones` type has `casa` and `hetzner`
- **THEN** the `ubicacion` field SHALL accept only `casa` and `hetzner`

#### Scenario: Menu suggestions

- **WHEN** the editor requests the menu schema of `documentacion`, whose pages are `network`, `network/dns` and `getting-started` and whose types are `machines` and `services`
- **THEN** a menu path SHALL accept exactly `network`, `network/dns`, `getting-started`, `catalog`, `catalog/machines` and `catalog/services`

#### Scenario: Icon suggestions

- **WHEN** the editor requests the type schema of `documentacion`
- **THEN** `icon` SHALL accept only Lucide icon names, so `server` is accepted and `servr` is marked

#### Scenario: Labelled field

- **WHEN** the type `field-kinds` declares `family: { type: enum, values: [scalar], label: Familia }` and the editor requests its entity schema
- **THEN** the property `family` SHALL be titled "Familia"

#### Scenario: A version 1 repository

- **WHEN** the editor requests the type schema of a repository whose `doc.config.yaml` says `plataforma: "1"`
- **THEN** the schema SHALL accept `campos`, `etiqueta` and `vista.columnas`, a field's `tipo` SHALL list `texto`, `numero`, `entero`, `booleano`, `fecha`, `url`, `email`, `ip`, `ficha`, `enum`, `ref`, `lista` and `objeto`, and `fields` SHALL be marked as not allowed

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

### Requirement: Schemas follow the content without regeneration

A repository's catalog and schemas SHALL reflect the content of its current checkout: a new type, entity or page SHALL appear in them after the sync that brings it, without running a command or committing generated files to the content repository.

#### Scenario: New type

- **WHEN** a writer pushes `catalog/proveedores/_type.yaml` to the `ref` of `documentacion` and the repository is synced
- **THEN** the next catalog request for `documentacion` SHALL list a `proveedores` entry

### Requirement: Only declarations are exposed

The public schema endpoints SHALL expose only the content's declarations (type and field names, kinds, descriptions and enum values), entity ids and page paths. They SHALL NOT expose page text, any entity field value other than its id, or the repository's URL, ref or credentials.

#### Scenario: Entity values stay private

- **WHEN** a machine entity holds `ip: 192.168.1.30`
- **THEN** no schema endpoint SHALL include that IP

#### Scenario: Repository URL stays private

- **WHEN** the repository `documentacion` is cloned from `https://ana:secreto@git.example.com/org/docs.git`
- **THEN** no schema endpoint SHALL include its URL or credentials

### Requirement: One editor setting

A content repository SHALL need only the editor setting `yaml.schemaStore.url`, set to the catalog URL of its slug (`<public origin>/api/v1/content/schemas/<slug>`), for its YAML files to be completed and validated; it SHALL NOT hold generated schema files or per-type schema associations.

#### Scenario: Editing in a fresh clone

- **WHEN** a writer clones the content repository stored as `documentacion`, whose editor settings point `yaml.schemaStore.url` at `<public origin>/api/v1/content/schemas/documentacion`, and opens `catalog/maquinas/nas.yaml`
- **THEN** the editor SHALL suggest the machine's fields and the ids its references accept, without the writer running anything
