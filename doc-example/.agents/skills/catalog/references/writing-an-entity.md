# Writing an entity

One YAML file per entity in its type's folder, with only the fields its type
declares. The contract is `docs/data/entities.mdx`. An entity that fails
its type is left out of every table and reported; the rest of the catalog is
published.

## A real entity

```yaml
# catalog/header-fields/icono.yaml → id: icono
required: false
kind: texto
meaning: El icono de la página, en la barra lateral, la cabecera de la página y su tarjeta
rule: Un nombre de icono de Lucide (server, map-pin); menu.yaml puede dar otro, y entonces prevalece ese
fuente: manual
actualizado: 2026-10-15
```

## The id

- **The file name is the id:** lowercase, digits and hyphens, no accents.
  Otherwise: "El nombre del fichero es el id: en minúsculas, sin acentos y con
  guiones (c11-sonic)".
- **`.yaml`, never `.yml`** ("La extensión es .yaml, no .yml").
- A file starting with `_` is not an entity (that is how `_type.yaml` hides).
- Pick the id the contract uses when there is one (`field-kinds/ref`,
  `header-fields/titulo`, `diagram-types/org-chart`: the value as written);
  otherwise a short English name (`files/doc-config`). The id is what
  `catalog:` links and header `ref` fields name: don't rename it lightly.

## Fields

- **Only the fields the type declares**, and every required one. An unknown
  field fails the entity.
- **One fact per field, one line per value.** A value is a table cell.
- Values meant to be read (`purpose`, `meaning`, `value`) are Spanish
  sentences without a final period; `enum` values are exactly as declared.
- No field the type doesn't have, even "for later": declare it first.

## Provenance: `fuente` and `actualizado`

Every entity accepts them without declaring them. In this site:

- `fuente: manual` on every entity (they are written by hand from the
  platform's behaviour; on other sites it names the panel the data was read
  from, and the panel wins when they disagree).
- `actualizado:` the date the entity was **checked against the platform**,
  `YYYY-MM-DD`. Update it whenever you re-check, even with no change.

## References: `ref` and `ficha`

| Kind | Write | Must exist |
| --- | --- | --- |
| `ref` | The target's id: `kind: texto` (in `header-fields`) | `catalog/<a>/<id>.yaml` |
| `ficha` | A page path under `docs/`, no `.mdx`, no `docs/`: `page: repository/menu`, `page: diagrams` for a section's `index.mdx` | `docs/repository/menu.mdx`, `docs/diagrams/index.mdx` |

A `ref` makes the target's page list this entity under its references; a
`ficha` makes this entity's label link to that page instead of its generated
catalog page.

## YAML traps

Quote the value when it:

- contains `: ` → `purpose: "La vía de entrada: Pangolin"`;
- starts with `<` (this site's rule: `tag: "<Callout>"`), or with `[`, `{`,
  `*`, `&`, `!`, `%` or `@`, which YAML reads as syntax; a `<` mid-string
  (`path: diagrams/<id>.json`) needs nothing;
- reads as `yes`, `no`, `on`, `off`, `null` or a number → `value: "true o
  false; …"`;
- is a port with a slash → `"53:53/udp"`.

Dates are always `YYYY-MM-DD`, unquoted. The editor marks every one of these
as you type.

## Lists of objects

```yaml
# catalog/components/entities.yaml (part)
attributes:
  - name: type
    required: true
    meaning: El tipo, como el nombre de su carpeta en catalog/
  - name: columns
    required: false
    meaning: Los campos que se muestran, separados por comas (también id); sin él, la vista.columnas del tipo
```

Each item has exactly the `objeto`'s `campos`, all required unless declared
`opcional`.

## Then

- Cite the entity from the page that explains it (header `files`,
  `components` or `diagram_types`), and point its `page` there.
- No secret in any field, not even provisionally.
