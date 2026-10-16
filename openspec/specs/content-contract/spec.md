# Content Contract

## Purpose

Defines what a content repository may declare (site configuration, catalog types, entities and the pages they point at) and how the platform reads and reports problems in it, independently of any domain.
## Requirements
### Requirement: Content repository layout

A content repository SHALL be a folder holding `doc.config.yaml`, a `docs/` folder with the pages as `.mdx` files, a `catalog/` folder with one subfolder per catalog type and, optionally, `menu.yaml` (the navigation, `content-menu`), a `diagrams/` folder (the diagrams, `content-diagrams`), a `styles/` folder (the repository's style modules, `content-styles`) and `skills/`. Each type subfolder SHALL hold its declaration `_type.yaml` and one `.yaml` file per entity. Files whose name starts with `_` inside a type folder SHALL NOT be entities. `docs/catalog/` SHALL be reserved for the generated catalog pages (`content-catalog-pages`). The platform SHALL NOT require any type, field or page name: every name below `docs/`, `catalog/` and `diagrams/` is chosen by the content. The file names under `styles/` SHALL be the platform's module names.

#### Scenario: A domain the platform does not know

- **WHEN** a content repository declares the types `frutas` and `proveedores` and no other
- **THEN** the platform SHALL read them like any other types, without requiring machines, services or any other built-in type

#### Scenario: Optional files left out

- **WHEN** a content repository has no `menu.yaml`, no `diagrams/` and no `styles/`
- **THEN** its declarations SHALL be valid and no problem SHALL be reported for the missing files

### Requirement: Site configuration

`doc.config.yaml` SHALL declare `nombre` (required text), `descripcion` (optional text), `plataforma` (required, one of the contract major versions the platform reads, written as a quoted string, currently `"1"`) and `cabecera` (optional extra page header fields, each declared with a field kind). `cabecera` SHALL NOT declare `titulo`, `descripcion`, `icono`, `orden` or `actualizado`, which every page has. Any other key SHALL be refused.

#### Scenario: Unquoted platform version

- **WHEN** `doc.config.yaml` says `plataforma: 1`
- **THEN** the platform SHALL report that `plataforma` is the contract version between quotes

#### Scenario: Redeclared common header field

- **WHEN** `cabecera` declares `titulo`
- **THEN** the platform SHALL report that `titulo` cannot be declared because every page has it

### Requirement: Catalog type declarations

A catalog type's id SHALL be its folder name, made of lowercase letters, digits and single hyphens. Its `_type.yaml` SHALL declare `nombre` and `plural` (required text), `icono` (a Lucide icon name), `descripcion`, `etiqueta` (the field shown as the entity's name) and `vista.columnas` (the columns of the type's list) as optional, and `campos` with at least one field. Field names SHALL be lowercase letters, digits and underscores, starting with a letter. `campos` SHALL NOT declare `fuente` or `actualizado`. `etiqueta` SHALL name a declared field; each column SHALL name a declared field, `id`, `fuente` or `actualizado`. Any other key SHALL be refused.

#### Scenario: Label that is not a field

- **WHEN** a `_type.yaml` sets `etiqueta: hostname` and declares no `hostname` field
- **THEN** the platform SHALL report the problem on `etiqueta`

#### Scenario: Badly named type folder

- **WHEN** the catalog holds a folder named `Equipos`
- **THEN** the platform SHALL report that a type name is lowercase, without accents and with hyphens

#### Scenario: Unknown icon

- **WHEN** a `_type.yaml` sets `icono: servr`
- **THEN** the platform SHALL report on `icono` that it is not a Lucide icon name

### Requirement: Field kinds

A field SHALL declare its `tipo` as one of: `texto`, `numero`, `entero`, `booleano`, `fecha` (`YYYY-MM-DD`), `url`, `email`, `ip` (IPv4 or IPv6), `ficha` (the path of a page), `enum` (with a non-empty `valores` list), `ref` (with `a`, the id of an existing catalog type), `lista` (with `de`, the field that repeats) or `objeto` (with `campos`, at least one named field). Every field MAY add `opcional: true`, a `descripcion` and an `etiqueta` (a non-empty text: how the reader names the field; the field's name when it has none). Any other kind or key SHALL be refused. The same kinds SHALL apply to `cabecera`, to nested `lista` and `objeto` fields, at any depth. A field's `etiqueta` is unrelated to a type's `etiqueta` (the field shown as the entity's name).

#### Scenario: Reference to a missing type

- **WHEN** a `_type.yaml` declares a field `centro: { tipo: lista, de: { tipo: ref, a: centros } }` and the catalog has no `centros` type
- **THEN** the platform SHALL report, on that `_type.yaml`, that `centros` is not a catalog type, naming the field path and the types that exist

#### Scenario: Field with a label

- **WHEN** a `_type.yaml` declares `family: { tipo: texto, etiqueta: Familia }`
- **THEN** the declaration SHALL be valid and the field's name SHALL stay `family`

#### Scenario: Empty label

- **WHEN** `doc.config.yaml` declares the header field `files: { tipo: texto, etiqueta: "" }`
- **THEN** the platform SHALL report on `cabecera.files.etiqueta` that it cannot be empty

### Requirement: Entities

An entity's id SHALL be its file name without `.yaml`, made of lowercase letters, digits and single hyphens; a `.yml` file SHALL be reported. An entity SHALL be valid when it holds every field its type declares without `opcional: true`, no undeclared field, and every value matches its field kind: a `ref` value SHALL be the id of an existing entity of the referenced type and a `ficha` value the path of an existing page. Every entity SHALL accept, without declaring them, `fuente` (where the data comes from) and `actualizado` (the date of the data).

#### Scenario: Reference to an entity that does not exist

- **WHEN** a machine says `ubicacion: oficina` and the `ubicaciones` type has only `casa` and `hetzner`
- **THEN** the value SHALL be invalid

#### Scenario: Provenance without declaring it

- **WHEN** an entity of a type that declares neither `fuente` nor `actualizado` says `fuente: komodo` and `actualizado: 2026-10-15`
- **THEN** the entity SHALL be valid

### Requirement: Page paths

A page's path SHALL be its file path under `docs/` without `.mdx`, using `/` as the separator. A folder's `index.mdx` SHALL be named by the folder's path, and `docs/index.mdx` (the home page) SHALL have no path that a `ficha` field can name.

#### Scenario: A section index

- **WHEN** `docs/contenedores/komodo/index.mdx` and `docs/red/dns.mdx` exist
- **THEN** their paths SHALL be `contenedores/komodo` and `red/dns`

### Requirement: Problems are reported per file

Reading a content repository SHALL report every problem it finds, not only the first, each with the file path relative to the content root and a message in Spanish that names the field path when there is one. A YAML syntax error SHALL give its line and column, and an unquoted text containing `": "` SHALL be reported as needing quotes. A missing `doc.config.yaml` or `_type.yaml` SHALL be reported as missing. A type whose `_type.yaml` is broken SHALL still count as existing, so references to it are not reported again.

#### Scenario: Unquoted colon

- **WHEN** `doc.config.yaml` holds the line `nombre: Casa: la red`
- **THEN** the platform SHALL report, on `doc.config.yaml`, the line and column and that a text with `": "` inside has to go between quotes

#### Scenario: Broken type does not cascade

- **WHEN** `catalog/ubicaciones/_type.yaml` is missing and `catalog/maquinas/_type.yaml` declares a reference to `ubicaciones`
- **THEN** the platform SHALL report only the missing `_type.yaml`

### Requirement: Icon names

Every `icono` the contract accepts (in `_type.yaml`, `menu.yaml` and page headers; diagram boxes take no icon) SHALL be the name of an icon of the Lucide version the web draws, in lowercase kebab-case as Lucide names it (`server`, `map-pin`). The platform SHALL hold that list of names, matching the Lucide version the web uses, and SHALL report any other value as not being a Lucide icon name.

#### Scenario: Valid icon

- **WHEN** a `_type.yaml` sets `icono: map-pin`
- **THEN** the declaration SHALL be valid

#### Scenario: A name Lucide does not have

- **WHEN** a `_type.yaml` sets `icono: cohete`
- **THEN** the platform SHALL report on `icono` that it is not a Lucide icon name

### Requirement: Former Spanish names are reported

The platform SHALL read the content folders and files only by their English names. A repository that still holds a former Spanish name SHALL have it reported as a site problem naming the English name it moved to, and SHALL NOT have it read: a root folder `catalogo/` (now `catalog/`), `diagramas/` (now `diagrams/`) or `estilos/` (now `styles/`), and a `_tipo.yaml` inside a catalog type folder (now `_type.yaml`). A style module under `styles/` with a former Spanish name (`tema.css`…) SHALL be reported as any other file that is not a style module.

#### Scenario: A repository with the old catalog folder

- **WHEN** a repository holds `catalogo/machines/_tipo.yaml` and no `catalog/`
- **THEN** `catalogo/` SHALL be reported saying the catalog now lives in `catalog/`, and the repository SHALL have no catalog types

#### Scenario: A type folder with the old declaration file

- **WHEN** `catalog/machines/` holds `_tipo.yaml` and no `_type.yaml`
- **THEN** `catalog/machines/_tipo.yaml` SHALL be reported saying the declaration is now `_type.yaml`, and the missing `_type.yaml` SHALL be reported as for any type without one

#### Scenario: Old diagrams and styles folders

- **WHEN** a repository holds `diagramas/red.json` and `estilos/tema.css`
- **THEN** `diagramas/` and `estilos/` SHALL each be reported naming `diagrams/` and `styles/`, no diagram `red` SHALL exist, and the repository SHALL have no stylesheet

