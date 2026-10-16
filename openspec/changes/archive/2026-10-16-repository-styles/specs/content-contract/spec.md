## MODIFIED Requirements

### Requirement: Content repository layout

A content repository SHALL be a folder holding `doc.config.yaml`, a `docs/` folder with the pages as `.mdx` files, a `catalogo/` folder with one subfolder per catalog type and, optionally, `menu.yaml` (the navigation, `content-menu`), a `diagramas/` folder (the diagrams, `content-diagrams`), an `estilos/` folder (the repository's style modules, `content-styles`) and `skills/`. Each type subfolder SHALL hold its declaration `_tipo.yaml` and one `.yaml` file per entity. Files whose name starts with `_` inside a type folder SHALL NOT be entities. `docs/catalogo/` SHALL be reserved for the generated catalog pages (`content-catalog-pages`). The platform SHALL NOT require any type, field or page name: every name below `docs/`, `catalogo/` and `diagramas/` is chosen by the content. The file names under `estilos/` SHALL be the platform's module names.

#### Scenario: A domain the platform does not know

- **WHEN** a content repository declares the types `frutas` and `proveedores` and no other
- **THEN** the platform SHALL read them like any other types, without requiring machines, services or any other built-in type

#### Scenario: Optional files left out

- **WHEN** a content repository has no `menu.yaml`, no `diagramas/` and no `estilos/`
- **THEN** its declarations SHALL be valid and no problem SHALL be reported for the missing files
