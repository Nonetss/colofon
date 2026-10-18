## Why

The content contract still mixes languages. A previous change moved the folders and files to English (`catalog/`, `_type.yaml`, `diagrams/`, `styles/`), and the MDX components (`<Entities type columns group>`, `<Diagram id>`) and the diagram files (`title`, `nodes`, `kind`…) were already in English. But every YAML key and fixed value the platform reads is still Spanish: `doc.config.yaml`, `menu.yaml`, `_type.yaml`, field declarations, field kinds, page headers and the reserved entity fields. The site's own ids are English by convention, so one file ends up reading `diagram_types: { tipo: lista, de: { tipo: ref, a: diagram-types } }`. The user wants the contract readable by people outside Spanish-speaking teams, with one simple rule: **the contract is English, the content is in the site's language**.

## What Changes

- A new contract major version, `"2"`, with every key and fixed value in English. It is declared as `contract: "2"` in `doc.config.yaml`, replacing `plataforma: "1"`:
  - `doc.config.yaml`: `name`, `description`, `contract`, `header` (formerly `nombre`, `descripcion`, `plataforma`, `cabecera`).
  - `menu.yaml`: `sections` of groups with `title`, `icon`, `description`, `pages`, and entries `{ path, title, icon }` (formerly `secciones`, `titulo`, `icono`, `descripcion`, `paginas`, `ruta`).
  - `_type.yaml`: `name`, `plural`, `icon`, `description`, `title_field`, `fields`, `view.columns` (formerly `nombre`, `plural`, `icono`, `descripcion`, `etiqueta`, `campos`, `vista.columnas`).
  - Field declarations: `type`, `optional`, `description`, `label`, `values`, `to`, `of`, `fields` (formerly `tipo`, `opcional`, `descripcion`, `etiqueta`, `valores`, `a`, `de`, `campos`).
  - Field kinds: `text`, `number`, `integer`, `boolean`, `date`, `url`, `email`, `ip`, `page`, `enum`, `ref`, `list`, `object` (formerly `texto`, `numero`, `entero`, `booleano`, `fecha`, `ficha`, `lista`, `objeto`; the rest unchanged).
  - Page header: `title`, `description`, `icon`, `order`, `updated` (formerly `titulo`, `descripcion`, `icono`, `orden`, `actualizado`).
  - Reserved entity fields: `source`, `updated` (formerly `fuente`, `actualizado`).
- The double meaning of `etiqueta` is split: a type's `title_field` (the field shown as the entity's name) and a field's `label` (how the reader names the field) are different keys.
- Contract `"1"` keeps working. A repository whose `doc.config.yaml` says `plataforma: "1"` is read with the Spanish keys exactly as today, its problems name the keys as they are written in its files, and the editor gets schemas with those keys. Each sync reports one site problem on `doc.config.yaml` saying that contract 1 is still read but superseded, and pointing to how to move to `contract: "2"`. The two versions are never mixed: the version declared in `doc.config.yaml` decides how every file of the repository is read.
- Problem messages, editor descriptions and every text shown to whoever writes content stay in Spanish; only the names the platform reads change.
- `doc-example/` moves to contract 2: its YAML files, page headers, entities, the guide pages and catalog entities that describe the contract (`field-kinds`, `header-fields`, `files`…), its `AGENTS.md` and `README.md`, its served skill and the `colofon-*` writing skills that the platform serves from it. The guide gains a short note on moving a repository from contract 1 to 2.
- `docs/` (this monorepo's own documentation) moves to contract 2 in the same change, at the user's request.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-contract`: contract versions 1 and 2, how the version is detected, the site configuration, catalog type and field declarations, field kinds and reserved entity fields under their English names, and the report on contract 1 repositories.
- `content-pages`: the page header fields under their English names, and the field kinds named by `<Entities>` rendering.
- `content-menu`: the keys of `menu.yaml`.
- `content-catalog-pages`: the type and entity keys the generated pages read (`plural`, `description`, `icon`, `name`, `view.columns`, `label`, `source`, `updated`, the first `page` field).
- `content-editor-schemas`: the schemas follow the repository's contract version.
- `documentation-reader`: the site and page keys it shows (`name`, `description`, `updated`, a header field's `label`).

## Impact

- `packages/content`: the meta-schema, entity schema, catalog loader, page header, menu and navigation readers, catalog pages, editor schemas, and a contract 1 reader that maps the Spanish keys onto the English model; the internal types (`SiteConfig`, `TypeDefinition`, `FieldDefinition`, `PageHeader`, `Menu`) move to English keys. Fixtures and tests for both versions.
- `packages/api`: `src/v1/docs/handler.ts` and any other reader of the contract types, OpenAPI descriptions that name contract keys, the content fixture and tests. The API's own output shapes are already English and do not change.
- `apps/frontend`: no source change expected; its tests only if a fixture names a contract key.
- `doc-example/` (git subtree of its own repository): full move to contract 2, to be pushed to its repository by the user. The writing skills served to every agent change with it.
- `docs/`: full move to contract 2 (pages, catalog, `doc.config.yaml`, `menu.yaml`).
- `AGENTS.md` («Este sitio»), `README.md`, `apps/site` docs (`content`, `index`, `upgrading`, in English and Spanish) and the `stack` references that name contract keys.
- Every other connected repository (such as garabato's documentation) keeps publishing on contract 1 and shows the superseded-contract problem until it is moved.
- No database schema or migration change.
