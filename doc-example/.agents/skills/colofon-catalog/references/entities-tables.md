# Entities on pages

How pages show the catalog. The component itself (attributes, messages) is
in the `docs` skill, `references/components.md`; the generated catalog pages
are explained in the guide's `data/reader` page.

## Three ways a page uses an entity

| Way | Write | Effect |
| --- | --- | --- |
| A table of a type | `<Entities type="machines" group="kind" columns="id,role,ip" />` | Rebuilt from the valid entities on every read |
| Cite in the header | `machines: [pve-01]`, a header field of `ref`s the site declares in `doc.config.yaml` | Header links; the entity's page lists the page under "Páginas que la citan" |
| Link in the text | `[pve-01](catalog:machines/pve-01)`, `[Máquinas](catalog:machines)` | The entity's page (its `ficha`) or its catalog page; also cites it |

## Finding the tables

Before changing a field, find every table that names it:
`grep -rn '<Entities type="<type>"' docs`. Change its `columns` and `group`
in the same change.

## Choosing columns and groups

- **`columns` only when the page needs something else than `vista.columnas`**
  (one more field the page is about). Without it the table follows the
  type, which is what you want on most pages.
- **Include `id` when the id is what the reader types** (a hostname, a value
  written in a file). Skip it when the label (`etiqueta`) already says it.
- **`group` on an `enum`** to split long tables by meaning (machines by
  `kind`). Blocks follow `valores` order; the group field is not repeated as
  a column.
- **Long text columns** (lists, objects, examples) only where the page is
  about them.
- Rows are always sorted by label, and the label links to the entity's
  `page`: keep `page` right so the table leads somewhere useful.

## Citing

- Cite in the header the entities the page **explains** (its subject), so
  the entity's page sends readers to it.
- Link in the text the entity a sentence is **about**; don't link every
  mention.
- Link the type's generated page (`catalog:<type>`) from the page that
  introduces the type, so a reader finds the whole table.

## What breaks a table

| Cause | Reported | Shown |
| --- | --- | --- |
| `type` names no folder | "<Entities type="x">: no hay ese tipo en catalog/ (hay: …)" | A notice |
| A column or group that is no field | "<Entities type="x">: x no tiene el campo y" | The table without it |
| An entity that fails its type | The entity's problem, on the page | The table without that row |
| No valid entity | — | "No hay entradas en <plural>" |
