## MODIFIED Requirements

### Requirement: Field kinds

A field SHALL declare its `tipo` as one of: `texto`, `numero`, `entero`, `booleano`, `fecha` (`YYYY-MM-DD`), `url`, `email`, `ip` (IPv4 or IPv6), `ficha` (the path of a page), `enum` (with a non-empty `valores` list), `ref` (with `a`, the id of an existing catalog type), `lista` (with `de`, the field that repeats) or `objeto` (with `campos`, at least one named field). Every field MAY add `opcional: true`, a `descripcion` and an `etiqueta` (a non-empty text: how the reader names the field; the field's name when it has none). Any other kind or key SHALL be refused. The same kinds SHALL apply to `cabecera`, to nested `lista` and `objeto` fields, at any depth. A field's `etiqueta` is unrelated to a type's `etiqueta` (the field shown as the entity's name).

#### Scenario: Reference to a missing type

- **WHEN** a `_tipo.yaml` declares a field `centro: { tipo: lista, de: { tipo: ref, a: centros } }` and the catalog has no `centros` type
- **THEN** the platform SHALL report, on that `_tipo.yaml`, that `centros` is not a catalog type, naming the field path and the types that exist

#### Scenario: Field with a label

- **WHEN** a `_tipo.yaml` declares `family: { tipo: texto, etiqueta: Familia }`
- **THEN** the declaration SHALL be valid and the field's name SHALL stay `family`

#### Scenario: Empty label

- **WHEN** `doc.config.yaml` declares the header field `files: { tipo: texto, etiqueta: "" }`
- **THEN** the platform SHALL report on `cabecera.files.etiqueta` that it cannot be empty
