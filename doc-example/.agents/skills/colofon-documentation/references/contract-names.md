# Contract names and the site's names

The platform reads a fixed set of names: files and folders in English, the
keys of the YAML files in Spanish, and a diagram's keys in English (those of
the earlier documentation's schemas). They must be written exactly so, or the content stops validating.
Everything else is the site's own. The source is the guide's `repository` page
("Nombres del contrato y nombres tuyos").

## The contract's names

| Where | Contract names |
| --- | --- |
| Files and folders | `doc.config.yaml`, `menu.yaml`, `docs/`, `index.mdx`, `catalog/`, `_type.yaml`, `diagrams/`, `styles/` and its modules (`theme.css`, `page.css`, `controls.css`, `code.css`, `tables.css`, `diagrams.css`, `images.css`, `callouts.css`, `sections.css`), `skills/` |
| `doc.config.yaml` | `nombre`, `descripcion`, `plataforma`, `cabecera` |
| `menu.yaml` | `secciones`, `titulo`, `icono`, `descripcion`, `paginas`, `ruta` |
| `_type.yaml` | `nombre`, `plural`, `icono`, `descripcion`, `etiqueta`, `campos`, `vista`, `columnas` |
| A field | `tipo`, `opcional`, `descripcion`, `valores`, `a`, `de`, `campos` |
| Field kinds | `texto`, `numero`, `entero`, `booleano`, `fecha`, `url`, `email`, `ip`, `ficha`, `enum`, `ref`, `lista`, `objeto` |
| Every page header | `titulo`, `descripcion`, `icono`, `orden`, `actualizado` |
| Every entity | `fuente`, `actualizado` |
| A diagram (JSON) | `type`, `variant`, `title`, `desc` and its form's keys: `width`, `height`, `nodes`, `edges`, `zones`, `notes` drawn by hand, `items` and `links` in a chain, its type's keys with a `type` (`colofon-diagrams` skill) |
| Links | `catalog:` followed by a type, or a type and an id |
| Component names and attributes | `Callout` (`type`, `title`), `Entities` (`type`, `columns`, `group`), `Diagram` (`id`) |

The guide's "Referencia" pages list them as tables: `catalog/field-kinds`,
`catalog/header-fields`, `catalog/components`, `catalog/files`,
`catalog/diagram-types`.

## The site's names

Everything the contract doesn't fix belongs to the site, which picks it
once and keeps it:

| What | Where the site's names are |
| --- | --- |
| Type ids (folders of `catalog/`) and their field names | `catalog/*/_type.yaml` |
| Enum values | The `valores` of each `enum` field |
| Header fields | `cabecera` in `doc.config.yaml` |
| Folders under `docs/`, file names, entity and diagram ids | The tree itself |
| Titles, values meant to be read, prose, menu groups | The pages, entities and `menu.yaml` |

Prose, titles and values meant to be read are Spanish, like the platform's
own interface. The language of ids, field names and folders is the site's
choice, written down in `AGENTS.md`, «Este sitio» (often English). Whatever
it is, an existing name keeps its language.

## Traps

| Trap | Why |
| --- | --- |
| `catalog/` (contract, the data) vs a section of `docs/` about the data | `docs/catalog/` is reserved for the generated pages: never create it |
| `descripcion` (contract) vs `description` | Only the Spanish key is read, in every YAML |
| `titulo` in YAML vs `title` in a diagram JSON | YAML keys are Spanish, diagram keys English |
| `type` in `<Entities type="…">` and `<Callout type="…">` | Component attributes are English; `tipo` is the field key in YAML |
| `etiqueta` (the type's label field) vs a site field named `label` or `tag` | One is contract, one is the site's |
| A site field named `page` (a `ficha`) vs `paginas` (a menu key) | Same idea, different owners |
| `.yml` | Only `.yaml` is read |

## Rule

Never translate a contract name, and never rename one of the site's
existing names: ids, fields and folders are cited by links, `ref`s, `ficha`s,
headers, menu entries and diagrams, and every one would break.
