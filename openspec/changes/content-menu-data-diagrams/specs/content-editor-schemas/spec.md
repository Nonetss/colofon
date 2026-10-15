## MODIFIED Requirements

### Requirement: Public schema catalog

The backend SHALL serve at `GET /api/v1/content/schemas/{repository}`, where `{repository}` is a stored content repository's slug, without authentication, a schema catalog in the SchemaStore catalog format (`version` 1 and a `schemas` list of `name`, `description`, `url` and `fileMatch`). It SHALL list one entry for `doc.config.yaml`, one for `menu.yaml`, one for `diagramas/*.yaml`, one for `catalogo/*/_tipo.yaml` and one per catalog type matching `catalogo/<type>/*.yaml` and excluding `catalogo/<type>/_*.yaml`. Each `url` SHALL be absolute, built from the public origin in `CORS_ORIGIN` and SHALL point at that same repository's schemas. A repository without valid content yet SHALL get a catalog with no schemas. An unknown slug SHALL answer `NOT_FOUND`. `GET /api/v1/content/schemas`, without a slug, SHALL NOT exist.

#### Scenario: Catalog of a site with two types

- **WHEN** the repository `documentacion` has the types `maquinas` and `ubicaciones`
- **THEN** its catalog SHALL hold six entries, the `maquinas` entry SHALL match `catalogo/maquinas/*.yaml` but not `catalogo/maquinas/_tipo.yaml`, and its `url` SHALL be `<CORS_ORIGIN>/api/v1/content/schemas/documentacion/entities/maquinas`

#### Scenario: Unknown repository

- **WHEN** a client requests `GET /api/v1/content/schemas/inexistente` and no repository has that slug
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Repository not synced yet

- **WHEN** a client requests the catalog of a repository created a moment ago whose first sync has not finished
- **THEN** the backend SHALL answer a catalog with no schemas

### Requirement: Schemas of the content's files

The backend SHALL serve, without authentication, as JSON Schema draft-07, for the repository named by `{repository}`:
- `GET /api/v1/content/schemas/{repository}/config`: the schema of `doc.config.yaml`;
- `GET /api/v1/content/schemas/{repository}/menu`: the schema of `menu.yaml`, where a path lists the repository's page paths, section folders, `catalogo` and `catalogo/<type>` for each type;
- `GET /api/v1/content/schemas/{repository}/diagram`: the schema of a diagram file, where `entidad` lists `<type>/<id>` for every entity of the catalog;
- `GET /api/v1/content/schemas/{repository}/type`: the schema of a `_tipo.yaml`, where a reference's `a` lists the catalog types that exist;
- `GET /api/v1/content/schemas/{repository}/entities/{type}`: the schema of an entity of `{type}`, titled with the type's `nombre`, where each declared field carries its `descripcion`, a `ref` field lists the ids of the referenced type, a `ficha` field lists the page paths, an `enum` field lists its values, the fields without `opcional: true` are required and undeclared fields are refused.

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

#### Scenario: Unknown type

- **WHEN** a client requests `GET /api/v1/content/schemas/documentacion/entities/frutas` and `documentacion` has no `frutas` type
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Repositories stay apart

- **WHEN** `documentacion` has a `maquinas` type and `homelab` does not
- **THEN** `GET /api/v1/content/schemas/homelab/entities/maquinas` SHALL answer `NOT_FOUND`
