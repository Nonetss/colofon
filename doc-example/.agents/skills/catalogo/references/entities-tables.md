# Entities on pages

How the guide's pages show this catalog. The component itself (attributes,
messages) is in the `docs` skill, `references/components.md`; the generated
catalog pages are explained in `docs/catalog/reader.mdx`.

## Three ways a page uses an entity

| Way | Write | Effect |
| --- | --- | --- |
| A table of a type | `<Entities type="files" group="kind" columns="path,required,purpose" />` | Rebuilt from the valid entities on every read |
| Cite in the header | `files: [menu]`, `components: [callout]`, `diagram_types: [flowchart]` | Header links; the entity's page lists the page under "Páginas que la citan" |
| Link in the text | `[menu.yaml](catalogo:files/menu)`, `[Tipos de campo](catalogo:field-kinds)` | The entity's page (its `page`) or its catalog page; also cites it |

## The tables this guide shows

| Page | Component |
| --- | --- |
| `docs/index.mdx` | `<Entities type="files" />` (the type's `vista.columnas`) |
| `docs/repository/index.mdx` | `<Entities type="files" group="kind" columns="path,required,purpose" />` |
| `docs/pages/header.mdx` | `<Entities type="header-fields" columns="id,required,kind,meaning,rule" />` |
| `docs/pages/components.mdx` | `<Entities type="components" columns="tag,purpose,attributes" />`, and `field-kinds` grouped by `family` as the example |
| `docs/catalog/types.mdx` | `<Entities type="field-kinds" group="family" columns="id,value,takes,example" />` |
| `docs/diagrams/index.mdx` | `<Entities type="diagram-types" group="family" columns="id,purpose,variants,budget" />` |

Before changing a field, find every table that names it:
`grep -rn '<Entities type="<type>"' docs`.

## Choosing columns and groups

- **`columns` only when the page needs something else than `vista.columnas`**
  (`rule` on the header page, `attributes` on the components page). Without
  it the table follows the type, which is what you want on most pages.
- **Include `id` when the id is what the reader types** (`field-kinds`,
  `header-fields`, `diagram-types`: the id is the value written in the file).
  Skip it when the label already says it (`files` by `path`, `components` by
  `tag`).
- **`group` on an `enum`** to split long tables by meaning: `files` by `kind`,
  `field-kinds` by `family`, `diagram-types` by `family`. Blocks follow
  `valores` order; the group field is not repeated as a column.
- **Long text columns** (`attributes`, `example`) only where the page is about
  them.
- Rows are always sorted by label, and the label links to the entity's
  `page`: keep `page` right so the table leads somewhere useful.

## Citing

- Cite in the header the entities the page **explains** (its subject), so
  the entity's page sends readers to it.
- Link in the text the entity a sentence is **about**; don't link every
  mention.
- The home and `docs/catalog/index.mdx` link the type tables
  (`catalogo:files`, `catalogo:field-kinds`…) so a reader finds the generated
  "Referencia" pages.

## What breaks a table

| Cause | Reported | Shown |
| --- | --- | --- |
| `type` names no folder | "<Entities type="x">: no hay ese tipo en catalogo/ (hay: …)" | A notice |
| A column or group that is no field | "<Entities type="x">: x no tiene el campo y" | The table without it |
| An entity that fails its type | The entity's problem, on the page | The table without that row |
| No valid entity | — | "No hay entradas en <plural>" |
