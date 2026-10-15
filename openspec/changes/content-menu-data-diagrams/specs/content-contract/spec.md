## MODIFIED Requirements

### Requirement: Content repository layout

A content repository SHALL be a folder holding `doc.config.yaml`, a `docs/` folder with the pages as `.mdx` files, a `catalogo/` folder with one subfolder per catalog type and, optionally, `menu.yaml` (the navigation, `content-menu`), a `diagramas/` folder (the diagrams, `content-diagrams`) and `skills/`. Each type subfolder SHALL hold its declaration `_tipo.yaml` and one `.yaml` file per entity. Files whose name starts with `_` inside a type folder SHALL NOT be entities. `docs/catalogo/` SHALL be reserved for the generated catalog pages (`content-catalog-pages`). The platform SHALL NOT require any type, field or page name: every name below `docs/`, `catalogo/` and `diagramas/` is chosen by the content.

#### Scenario: A domain the platform does not know

- **WHEN** a content repository declares the types `frutas` and `proveedores` and no other
- **THEN** the platform SHALL read them like any other types, without requiring machines, services or any other built-in type

#### Scenario: Optional files left out

- **WHEN** a content repository has no `menu.yaml` and no `diagramas/`
- **THEN** its declarations SHALL be valid and no problem SHALL be reported for the missing files

### Requirement: Catalog type declarations

A catalog type's id SHALL be its folder name, made of lowercase letters, digits and single hyphens. Its `_tipo.yaml` SHALL declare `nombre` and `plural` (required text), `icono` (a Lucide icon name), `descripcion`, `etiqueta` (the field shown as the entity's name) and `vista.columnas` (the columns of the type's list) as optional, and `campos` with at least one field. Field names SHALL be lowercase letters, digits and underscores, starting with a letter. `campos` SHALL NOT declare `fuente` or `actualizado`. `etiqueta` SHALL name a declared field; each column SHALL name a declared field, `id`, `fuente` or `actualizado`. Any other key SHALL be refused.

#### Scenario: Label that is not a field

- **WHEN** a `_tipo.yaml` sets `etiqueta: hostname` and declares no `hostname` field
- **THEN** the platform SHALL report the problem on `etiqueta`

#### Scenario: Badly named type folder

- **WHEN** the catalog holds a folder named `Equipos`
- **THEN** the platform SHALL report that a type name is lowercase, without accents and with hyphens

#### Scenario: Unknown icon

- **WHEN** a `_tipo.yaml` sets `icono: servr`
- **THEN** the platform SHALL report on `icono` that it is not a Lucide icon name

## ADDED Requirements

### Requirement: Icon names

Every `icono` the contract accepts (in `_tipo.yaml`, `menu.yaml`, page headers and diagram nodes) SHALL be the name of an icon of the Lucide version the web draws, in lowercase kebab-case as Lucide names it (`server`, `map-pin`). The platform SHALL hold that list of names, matching the Lucide version the web uses, and SHALL report any other value as not being a Lucide icon name.

#### Scenario: Valid icon

- **WHEN** a `_tipo.yaml` sets `icono: map-pin`
- **THEN** the declaration SHALL be valid

#### Scenario: A name Lucide does not have

- **WHEN** a `_tipo.yaml` sets `icono: cohete`
- **THEN** the platform SHALL report on `icono` that it is not a Lucide icon name
