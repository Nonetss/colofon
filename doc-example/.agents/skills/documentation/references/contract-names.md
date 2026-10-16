# Contract names and this site's names

The platform reads a fixed set of names, written in Spanish except a
diagram's keys, which are those of the earlier documentation's schemas, in
English. They must be written exactly so, or the content stops validating.
Everything else is this site's own. The source is `docs/repository/index.mdx`
("Nombres del contrato y nombres tuyos").

## The contract's names

| Where | Contract names |
| --- | --- |
| Files and folders | `doc.config.yaml`, `menu.yaml`, `docs/`, `index.mdx`, `catalogo/`, `_tipo.yaml`, `diagramas/`, `estilos/` and its modules (`tema.css`, `pagina.css`, `controles.css`, `codigo.css`, `tablas.css`, `diagramas.css`, `imagenes.css`, `avisos.css`, `secciones.css`), `skills/` |
| `doc.config.yaml` | `nombre`, `descripcion`, `plataforma`, `cabecera` |
| `menu.yaml` | `secciones`, `titulo`, `icono`, `descripcion`, `paginas`, `ruta` |
| `_tipo.yaml` | `nombre`, `plural`, `icono`, `descripcion`, `etiqueta`, `campos`, `vista`, `columnas` |
| A field | `tipo`, `opcional`, `descripcion`, `valores`, `a`, `de`, `campos` |
| Field kinds | `texto`, `numero`, `entero`, `booleano`, `fecha`, `url`, `email`, `ip`, `ficha`, `enum`, `ref`, `lista`, `objeto` |
| Every page header | `titulo`, `descripcion`, `icono`, `orden`, `actualizado` |
| Every entity | `fuente`, `actualizado` |
| A diagram (JSON) | `type`, `variant`, `title`, `desc` and its form's keys: `width`, `height`, `nodes`, `edges`, `zones`, `notes` drawn by hand, `items` and `links` in a chain, its type's keys with a `type` (`diagramas` skill) |
| Links | `catalogo:` followed by a type, or a type and an id |
| Component names and attributes | `Callout` (`type`, `title`), `Entities` (`type`, `columns`, `group`), `Diagram` (`id`) |

The field kinds are also the `field-kinds` entities; the header fields the
`header-fields` entities; the components the `components` entities.

## This site's names

| What | This site's names | Language |
| --- | --- | --- |
| Type ids (folders of `catalogo/`) | `files`, `field-kinds`, `header-fields`, `components`, `diagram-types` | English, never renamed |
| Field names | `path`, `kind`, `required`, `purpose`, `page`, `family`, `value`, `takes`, `example`, `meaning`, `rule`, `tag`, `attributes`, `name`, `keys`, `variants`, `budget` | English, never renamed |
| Enum values | `declaration`, `content`, `agents`; `scalar`, `choice`, `reference`, `composite`; `graph`, `time`, `concept`, `chart`, `comparison` | English, never renamed |
| Header fields in `cabecera` | `files`, `components`, `diagram_types`, `open_questions` | English, never renamed |
| Folders under `docs/` and file names | `repository`, `pages`, `catalog`, `diagrams`, `publishing`, `getting-started.mdx`… | English, never renamed |
| Entity ids and diagram ids | `doc-config`, `menu`, `flowchart-where-it-goes`… | English (or the contract's own value as id, like `titulo`, `ref`) |
| Values meant to be read, titles, prose, menu groups | «Escribir documentación», "Inicio", `purpose: Una línea…` | Spanish |

## Traps

| Trap | Why |
| --- | --- |
| `catalogo/` (contract, the data) vs `docs/catalog/` (this site's section about it) | `docs/catalogo/` is reserved for the generated pages: never create it |
| `descripcion` (contract) vs `description` | Only the Spanish key is read, in every YAML |
| `titulo` in YAML vs `title` in a diagram JSON | YAML keys are Spanish, diagram keys English |
| `type` in `<Entities type="…">` and `<Callout type="…">` | Component attributes are English; `tipo` is the field key in YAML |
| `etiqueta` (the type's label field) vs `tag` (a field of `components`) | One is contract, one is this site's |
| `page` (this site's `ficha` field) vs `paginas` (a menu key) | Same idea, different owners |
| `.yml` | Only `.yaml` is read |

## Rule

Never translate a contract name, and never rename one of this site's
existing names: ids, fields and folders are cited by links, `ref`s, `ficha`s,
headers, menu entries and diagrams, and every one would break.
