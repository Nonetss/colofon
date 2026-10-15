## Purpose

Lets an editor complete, validate and document a content repository's YAML files from schemas the backend serves, always matching the current content, with one fixed editor setting and no generated files.

## ADDED Requirements

### Requirement: Public schema catalog

The backend SHALL serve at `GET /api/v1/content/schemas`, without authentication, a schema catalog in the SchemaStore catalog format (`version` 1 and a `schemas` list of `name`, `description`, `url` and `fileMatch`). It SHALL list one entry for `doc.config.yaml`, one for `catalogo/*/_tipo.yaml` and one per catalog type matching `catalogo/<type>/*.yaml` and excluding `catalogo/<type>/_*.yaml`. Each `url` SHALL be absolute, built from the public origin in `CORS_ORIGIN`. Without content, the catalog SHALL list no schemas.

#### Scenario: Catalog of a site with two types

- **WHEN** the content has the types `maquinas` and `ubicaciones`
- **THEN** the catalog SHALL hold four entries, and the `maquinas` entry SHALL match `catalogo/maquinas/*.yaml` but not `catalogo/maquinas/_tipo.yaml`

### Requirement: Schemas of the content's files

The backend SHALL serve, without authentication, as JSON Schema draft-07:
- `GET /api/v1/content/schemas/config`: the schema of `doc.config.yaml`;
- `GET /api/v1/content/schemas/type`: the schema of a `_tipo.yaml`, where a reference's `a` lists the catalog types that exist;
- `GET /api/v1/content/schemas/entities/{type}`: the schema of an entity of `{type}`, titled with the type's `nombre`, where each declared field carries its `descripcion`, a `ref` field lists the ids of the referenced type, a `ficha` field lists the page paths, an `enum` field lists its values, the fields without `opcional: true` are required and undeclared fields are refused.

An unknown `{type}`, or any schema requested without content, SHALL answer `NOT_FOUND`.

#### Scenario: Reference suggestions

- **WHEN** the editor requests the `maquinas` schema and the `ubicaciones` type has `casa` and `hetzner`
- **THEN** the `ubicacion` field SHALL accept only `casa` and `hetzner`

#### Scenario: Unknown type

- **WHEN** a client requests `GET /api/v1/content/schemas/entities/frutas` and there is no `frutas` type
- **THEN** the backend SHALL answer `NOT_FOUND`

### Requirement: Schemas follow the content without regeneration

The catalog and the schemas SHALL reflect the content the backend currently reads: a new type, entity or page SHALL appear in them without running a command or committing generated files to the content repository.

#### Scenario: New type

- **WHEN** a writer adds `catalogo/proveedores/_tipo.yaml` under `CONTENT_DIR`
- **THEN** the next catalog request SHALL list a `proveedores` entry

### Requirement: Only declarations are exposed

The public schema endpoints SHALL expose only the content's declarations (type and field names, kinds, descriptions and enum values), entity ids and page paths. They SHALL NOT expose page text or any entity field value other than its id.

#### Scenario: Entity values stay private

- **WHEN** a machine entity holds `ip: 192.168.1.30`
- **THEN** no schema endpoint SHALL include that IP

### Requirement: One editor setting

A content repository SHALL need only the editor setting `yaml.schemaStore.url`, set to the catalog URL, for its YAML files to be completed and validated; it SHALL NOT hold generated schema files or per-type schema associations.

#### Scenario: Editing in a fresh clone

- **WHEN** a writer clones the content repository, whose editor settings point `yaml.schemaStore.url` at the platform's catalog, and opens `catalogo/maquinas/nas.yaml`
- **THEN** the editor SHALL suggest the machine's fields and the ids its references accept, without the writer running anything
