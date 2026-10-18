## ADDED Requirements

### Requirement: Contract versions

The platform SHALL read two major versions of the content contract: `"2"`, whose keys and fixed values are in English and which every requirement of the content specs describes, and `"1"`, the same contract with the Spanish names listed in "Contract 1 names". A repository SHALL declare its version in `doc.config.yaml`: `contract: "2"` for version 2, or `plataforma: "1"` for version 1. That version SHALL decide how every file of the repository is read (`doc.config.yaml`, `menu.yaml`, each `_type.yaml`, each entity and each page header); the two sets of names SHALL never be mixed within one repository. A `doc.config.yaml` that declares neither key SHALL be reported as missing `contract`, and one that declares both SHALL be reported on `plataforma` as a key that contract 2 does not accept. Diagram files, the MDX components and their attributes, and the folder and file names SHALL be the same in both versions.

#### Scenario: A version 2 repository

- **WHEN** `doc.config.yaml` says `contract: "2"` and a page header says `title: DNS`
- **THEN** the repository SHALL be read with the English names and the page SHALL be titled "DNS"

#### Scenario: A version 1 repository

- **WHEN** `doc.config.yaml` says `plataforma: "1"` and a page header says `titulo: DNS`
- **THEN** the repository SHALL be read with the Spanish names and the page SHALL be titled "DNS"

#### Scenario: English keys in a version 1 repository

- **WHEN** `doc.config.yaml` says `plataforma: "1"` and a page header says `title: DNS`
- **THEN** the page SHALL be reported on `title` as a key it does not accept and on `titulo` as missing, as for any unknown key

#### Scenario: No version

- **WHEN** `doc.config.yaml` declares neither `contract` nor `plataforma`
- **THEN** the platform SHALL report on `doc.config.yaml` that `contract` is missing

### Requirement: Contract 1 names

A version 1 repository SHALL be read exactly as a version 2 one, with each name below replaced by its former Spanish name. Field names, type ids, entity ids, page paths and every other name chosen by the content SHALL be read as written in both versions.

| Where | Version 2 | Version 1 |
|---|---|---|
| `doc.config.yaml` | `name`, `description`, `contract`, `header` | `nombre`, `descripcion`, `plataforma`, `cabecera` |
| `menu.yaml` | `sections`, `title`, `icon`, `description`, `pages`, `path` | `secciones`, `titulo`, `icono`, `descripcion`, `paginas`, `ruta` |
| `_type.yaml` | `name`, `plural`, `icon`, `description`, `title_field`, `fields`, `view.columns` | `nombre`, `plural`, `icono`, `descripcion`, `etiqueta`, `campos`, `vista.columnas` |
| A field declaration | `type`, `optional`, `description`, `label`, `values`, `to`, `of`, `fields` | `tipo`, `opcional`, `descripcion`, `etiqueta`, `valores`, `a`, `de`, `campos` |
| Field kinds | `text`, `number`, `integer`, `boolean`, `date`, `page`, `list`, `object` | `texto`, `numero`, `entero`, `booleano`, `fecha`, `ficha`, `lista`, `objeto` |
| Page header | `title`, `description`, `icon`, `order`, `updated` | `titulo`, `descripcion`, `icono`, `orden`, `actualizado` |
| Every entity | `source`, `updated` | `fuente`, `actualizado` |

The kinds `url`, `email`, `ip`, `enum` and `ref` SHALL have the same name in both versions. Problems found in a version 1 repository SHALL name the keys as that repository writes them.

#### Scenario: A version 1 type declaration

- **WHEN** a version 1 `_type.yaml` declares `etiqueta: hostname`, `vista: { columnas: [hostname, ip] }` and `campos: { hostname: { tipo: texto, etiqueta: Nombre }, ip: { tipo: ip } }`
- **THEN** the type SHALL be valid, its entities SHALL be named by `hostname`, its table SHALL show the columns `hostname` and `ip`, and the field `hostname` SHALL be shown as "Nombre"

#### Scenario: Problem paths keep the version 1 names

- **WHEN** a version 1 `_type.yaml` sets `etiqueta: hostname` and declares no `hostname` field
- **THEN** the platform SHALL report the problem on `etiqueta`, not on `title_field`

#### Scenario: A version 1 entity

- **WHEN** a version 1 entity says `fuente: komodo` and `actualizado: 2026-10-15`
- **THEN** the entity SHALL be valid and its source and date SHALL be those values

### Requirement: Contract 1 is reported as superseded

Each time a version 1 repository is read, the platform SHALL report one site problem on `doc.config.yaml` saying that the repository uses contract 1, with its keys in Spanish, that it is still read, and that contract 2 names the same keys in English, pointing to where the platform's writing guide explains the move. This problem SHALL NOT make the repository's declarations invalid: everything else SHALL be read and published as for a version 2 repository.

#### Scenario: A version 1 repository syncs

- **WHEN** a repository whose `doc.config.yaml` says `plataforma: "1"` and has no other problem is read
- **THEN** its pages, catalog, menu, diagrams and styles SHALL be published, and its only problem SHALL be the one on `doc.config.yaml` about contract 1

#### Scenario: A version 2 repository has no such problem

- **WHEN** a repository whose `doc.config.yaml` says `contract: "2"` and has no other problem is read
- **THEN** it SHALL have no problem

## MODIFIED Requirements

### Requirement: Site configuration

`doc.config.yaml` SHALL declare `name` (required text), `description` (optional text), `contract` (required, the contract major version, written as a quoted string, `"2"`; `content-contract` "Contract versions" for version 1) and `header` (optional extra page header fields, each declared with a field kind). `header` SHALL NOT declare `title`, `description`, `icon`, `order` or `updated`, which every page has. Any other key SHALL be refused.

#### Scenario: Unquoted platform version

- **WHEN** `doc.config.yaml` says `contract: 2`
- **THEN** the platform SHALL report that `contract` is the contract version between quotes

#### Scenario: Redeclared common header field

- **WHEN** `header` declares `title`
- **THEN** the platform SHALL report that `title` cannot be declared because every page has it

### Requirement: Catalog type declarations

A catalog type's id SHALL be its folder name, made of lowercase letters, digits and single hyphens. Its `_type.yaml` SHALL declare `name` and `plural` (required text), `icon` (a Lucide icon name), `description`, `title_field` (the field shown as the entity's name) and `view.columns` (the columns of the type's list) as optional, and `fields` with at least one field. Field names SHALL be lowercase letters, digits and underscores, starting with a letter. `fields` SHALL NOT declare `source` or `updated`. `title_field` SHALL name a declared field; each column SHALL name a declared field, `id`, `source` or `updated`. Any other key SHALL be refused.

#### Scenario: Label that is not a field

- **WHEN** a `_type.yaml` sets `title_field: hostname` and declares no `hostname` field
- **THEN** the platform SHALL report the problem on `title_field`

#### Scenario: Badly named type folder

- **WHEN** the catalog holds a folder named `Equipos`
- **THEN** the platform SHALL report that a type name is lowercase, without accents and with hyphens

#### Scenario: Unknown icon

- **WHEN** a `_type.yaml` sets `icon: servr`
- **THEN** the platform SHALL report on `icon` that it is not a Lucide icon name

### Requirement: Field kinds

A field SHALL declare its `type` as one of: `text`, `number`, `integer`, `boolean`, `date` (`YYYY-MM-DD`), `url`, `email`, `ip` (IPv4 or IPv6), `page` (the path of a page), `enum` (with a non-empty `values` list), `ref` (with `to`, the id of an existing catalog type), `list` (with `of`, the field that repeats) or `object` (with `fields`, at least one named field). Every field MAY add `optional: true`, a `description` and a `label` (a non-empty text: how the reader names the field; the field's name when it has none). Any other kind or key SHALL be refused. The same kinds SHALL apply to `header`, to nested `list` and `object` fields, at any depth. A field's `label` is unrelated to a type's `title_field` (the field shown as the entity's name).

#### Scenario: Reference to a missing type

- **WHEN** a `_type.yaml` declares a field `centro: { type: list, of: { type: ref, to: centros } }` and the catalog has no `centros` type
- **THEN** the platform SHALL report, on that `_type.yaml`, that `centros` is not a catalog type, naming the field path and the types that exist

#### Scenario: Field with a label

- **WHEN** a `_type.yaml` declares `family: { type: text, label: Familia }`
- **THEN** the declaration SHALL be valid and the field's name SHALL stay `family`

#### Scenario: Empty label

- **WHEN** `doc.config.yaml` declares the header field `files: { type: text, label: "" }`
- **THEN** the platform SHALL report on `header.files.label` that it cannot be empty

### Requirement: Entities

An entity's id SHALL be its file name without `.yaml`, made of lowercase letters, digits and single hyphens; a `.yml` file SHALL be reported. An entity SHALL be valid when it holds every field its type declares without `optional: true`, no undeclared field, and every value matches its field kind: a `ref` value SHALL be the id of an existing entity of the referenced type and a `page` value the path of an existing page. Every entity SHALL accept, without declaring them, `source` (where the data comes from) and `updated` (the date of the data).

#### Scenario: Reference to an entity that does not exist

- **WHEN** a machine says `ubicacion: oficina` and the `ubicaciones` type has only `casa` and `hetzner`
- **THEN** the value SHALL be invalid

#### Scenario: Provenance without declaring it

- **WHEN** an entity of a type that declares neither `source` nor `updated` says `source: komodo` and `updated: 2026-10-15`
- **THEN** the entity SHALL be valid

### Requirement: Page paths

A page's path SHALL be its file path under `docs/` without `.mdx`, using `/` as the separator. A folder's `index.mdx` SHALL be named by the folder's path, and `docs/index.mdx` (the home page) SHALL have no path that a `page` field can name.

#### Scenario: A section index

- **WHEN** `docs/contenedores/komodo/index.mdx` and `docs/red/dns.mdx` exist
- **THEN** their paths SHALL be `contenedores/komodo` and `red/dns`

### Requirement: Problems are reported per file

Reading a content repository SHALL report every problem it finds, not only the first, each with the file path relative to the content root and a message in Spanish that names the field path when there is one. A YAML syntax error SHALL give its line and column, and an unquoted text containing `": "` SHALL be reported as needing quotes. A missing `doc.config.yaml` or `_type.yaml` SHALL be reported as missing. A type whose `_type.yaml` is broken SHALL still count as existing, so references to it are not reported again.

#### Scenario: Unquoted colon

- **WHEN** `doc.config.yaml` holds the line `name: Casa: la red`
- **THEN** the platform SHALL report, on `doc.config.yaml`, the line and column and that a text with `": "` inside has to go between quotes

#### Scenario: Broken type does not cascade

- **WHEN** `catalog/ubicaciones/_type.yaml` is missing and `catalog/maquinas/_type.yaml` declares a reference to `ubicaciones`
- **THEN** the platform SHALL report only the missing `_type.yaml`

### Requirement: Icon names

Every `icon` the contract accepts (in `_type.yaml`, `menu.yaml` and page headers; diagram boxes take no icon) SHALL be the name of an icon of the Lucide version the web draws, in lowercase kebab-case as Lucide names it (`server`, `map-pin`). The platform SHALL hold that list of names, matching the Lucide version the web uses, and SHALL report any other value as not being a Lucide icon name.

#### Scenario: Valid icon

- **WHEN** a `_type.yaml` sets `icon: map-pin`
- **THEN** the declaration SHALL be valid

#### Scenario: A name Lucide does not have

- **WHEN** a `_type.yaml` sets `icon: cohete`
- **THEN** the platform SHALL report on `icon` that it is not a Lucide icon name
