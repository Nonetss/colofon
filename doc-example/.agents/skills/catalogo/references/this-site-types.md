# This site's types

Five types, one per part of the contract a writer needs as a table. Each
also shows a different part of the contract working: `files` has an `enum`
and a `ficha`, `header-fields` a `ref`, `components` a `lista` of `objeto`,
`diagram-types` an `enum` used to group.

| Type | One entity per… | Label (`etiqueta`) | `vista.columnas` |
| --- | --- | --- | --- |
| `files` | File or folder a content repository may hold | `path` | `path, kind, required, purpose` |
| `field-kinds` | Field kind; the id is the kind (`texto`, `ref`) | the id (no `etiqueta`) | `id, value, takes, example` |
| `header-fields` | Field every page header has; the id is the field (`titulo`) | the id | `id, required, kind, meaning` |
| `components` | Page component | `tag` | `tag, purpose` |
| `diagram-types` | Diagram type the platform lays out; the id is its `type` value | `name` | `id, purpose, variants, budget` |

## `files`

`nombre: Fichero`, `icono: file-code`. The id is a short name for each file
(`doc-config`, `menu`, `page`, `type-declaration`, `entity`, `diagram-file`,
`diagram-illustration`, `served-skill`).

| Field | Kind | Why |
| --- | --- | --- |
| `path` | `texto` | Where it goes from the root (`menu.yaml`, `docs/**/*.mdx`); the label, quoted when it has `<` |
| `kind` | `enum` `declaration`, `content`, `agents` | How the platform reads it (a declaration first, kept at its last valid version when broken); `docs/repository/index.mdx` groups by it |
| `required` | `booleano` | Whether every repository needs it (only `doc-config` and `page`) |
| `purpose` | `texto` | One line on what it holds |
| `page` | `ficha`, optional | The page that explains it |

```yaml
# catalogo/files/menu.yaml
path: menu.yaml
kind: declaration
required: false
purpose: La barra lateral, como grupos de páginas, carpetas y páginas del catálogo; prevalece sobre las cabeceras de las páginas
page: repository/menu
fuente: manual
actualizado: 2026-10-15
```

## `field-kinds`

`nombre: Tipo de campo`, `icono: shapes`. No `page`: they are all explained
in `docs/catalog/types.mdx`.

| Field | Kind | Why |
| --- | --- | --- |
| `family` | `enum` `scalar`, `choice`, `reference`, `composite` | Groups the table (`group="family"`) |
| `value` | `texto` | What a value looks like and how it is shown |
| `takes` | `texto`, optional | The extra key the declaration needs (`valores`, `a`, `de`, `campos`); only `enum`, `ref`, `lista`, `objeto` |
| `example` | `texto` | A declaration and a value as written: `"host: { tipo: ref, a: machines } → host: pve-01"` |

## `header-fields`

`nombre: Campo de cabecera`, `icono: heading`. Only the five common fields
(`titulo`, `descripcion`, `icono`, `orden`, `actualizado`); this site's own
header fields are declared in `doc.config.yaml`, not here.

| Field | Kind | Why |
| --- | --- | --- |
| `required` | `booleano` | Whether a page without it is reported |
| `kind` | `ref` to `field-kinds` | Its value's kind, shown as a link to the kind |
| `meaning` | `texto` | What it is for and where it shows |
| `rule` | `texto`, optional | The rule its value follows when the kind says too little (Lucide names, the menu winning) |

## `components`

`nombre: Componente`, `icono: component`. One per component the platform
reads: `callout`, `entities`, `diagram`.

| Field | Kind | Why |
| --- | --- | --- |
| `tag` | `texto` | How it is written, quoted: `tag: "<Callout>"`; the label |
| `purpose` | `texto` | What it shows |
| `attributes` | `lista` of `objeto` `{ name: texto, required: booleano, meaning: texto }` | Every attribute it accepts; the source of truth for `docs` skill's `references/components.md` |
| `page` | `ficha`, optional | The page that explains it |

## `diagram-types`

`nombre: Tipo de diagrama`, `icono: chart-pie`. One per typed form (30); the
`diagramas` skill has a reference for each.

| Field | Kind | Why |
| --- | --- | --- |
| `name` | `texto` | Its name in the guide ("Diagrama de flujo"); the label |
| `family` | `enum` `graph`, `time`, `concept`, `chart`, `comparison` | Which page of `docs/diagrams/` explains it; groups the table |
| `purpose` | `texto` | What it is for, one line |
| `keys` | `texto` | Its own keys besides `type`, `title`, `desc` (`steps, links`) |
| `variants` | `texto`, optional | The `variant` values it accepts |
| `budget` | `texto` | Its complexity limit, as the platform checks it |
| `page` | `ficha`, optional | The family page that explains it (`diagrams/graphs`) |

`family` maps to pages: `graph` → `diagrams/graphs`, `time` →
`diagrams/time`, `concept` → `diagrams/concepts`, `chart` → `diagrams/charts`
or `diagrams/proportions`, `comparison` → `diagrams/comparison`. Check the
entity's `page`, not this mapping, when in doubt.
