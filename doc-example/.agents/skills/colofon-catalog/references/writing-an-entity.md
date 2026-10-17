# Writing an entity

One YAML file per entity in its type's folder, with only the fields its type
declares. The contract is the guide's `data/entities` page. An entity that fails
its type is left out of every table and reported; the rest of the catalog is
published.

## An entity

```yaml
# catalog/header-fields/icono.yaml → id: icono (from the guide)
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
- Pick the name the thing already has when there is one (a hostname, a
  stack's name, the value as written in a file), following the id rule the
  type's `descripcion` or `AGENTS.md` («Este sitio») gives; otherwise a short
  name in the language of the existing ids. The id is what `catalog:` links,
  `ref` fields and diagrams name: don't rename it lightly.

## Fields

- **Only the fields the type declares**, and every required one. An unknown
  field fails the entity.
- **One fact per field, one line per value.** A value is a table cell.
- Values meant to be read (`purpose`, `meaning`) are sentences in the site's
  prose language, without a final period; `enum` values are exactly as
  declared.
- No field the type doesn't have, even "for later": declare it first.

## Provenance: `fuente` and `actualizado`

Every entity accepts them without declaring them:

- `fuente`: where the data was read from: the panel, API or command (`komodo`,
  `proxmox`), or `manual` when it is written by hand. When the entity and its
  source disagree, the source wins. Which sources a site uses is in
  `AGENTS.md` («Este sitio»).
- `actualizado:` the date the entity was **last checked against its
  source**, `YYYY-MM-DD`. Update it whenever you re-check, even with no
  change.

## References: `ref` and `ficha`

| Kind | Write | Must exist |
| --- | --- | --- |
| `ref` | The target's id: `host: pve-01` | `catalog/<a>/<id>.yaml` |
| `ficha` | A page path under `docs/`, no `.mdx`, no `docs/`: `page: network/dns`, `page: network` for a section's `index.mdx` | `docs/network/dns.mdx`, `docs/network/index.mdx` |

A `ref` makes the target's page list this entity under its references; a
`ficha` makes this entity's label link to that page instead of its generated
catalog page.

## YAML traps

Quote the value when it:

- contains `: ` → `purpose: "La vía de entrada: Pangolin"`;
- starts with `<` (`tag: "<Callout>"`), or with `[`, `{`,
  `*`, `&`, `!`, `%` or `@`, which YAML reads as syntax; a `<` mid-string
  (`path: diagrams/<id>.json`) needs nothing;
- reads as `yes`, `no`, `on`, `off`, `null` or a number → `value: "true o
  false; …"`;
- is a port with a slash → `"53:53/udp"`.

Dates are always `YYYY-MM-DD`, unquoted. The editor marks every one of these
as you type.

## Lists of objects

```yaml
# catalog/components/entities.yaml (part, from the guide)
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

- Cite the entity from the page that explains it (a header field the site
  declares in `doc.config.yaml`, or a `catalog:` link), and point its
  `ficha` field there when the type has one.
- No secret in any field, not even provisionally.
