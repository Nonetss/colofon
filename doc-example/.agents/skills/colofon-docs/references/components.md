# Components

The only JSX the platform reads: `<Callout>`, `<Entities>` and `<Diagram>`.
The contract is the guide's `pages/components` page; the guide's catalog
also lists them, with every attribute, as its `components` type
(`catalog:components` in repository `doc-example`).

## Rules for all three

- **A block of its own**, with a blank line before and after. Inside a
  paragraph it is reported ("El componente <X> va en su propio bloque…").
- **Attributes are literal strings in quotes**, never `{…}`: "El atributo X de
  <Y> va entre comillas", "<Y> no admite atributos entre llaves {…}".
- An unknown attribute is reported ("<Y> no tiene el atributo X") and ignored.
- Any other component is reported and replaced by a notice that names it.

## `<Callout>`

A highlighted note around Markdown.

```mdx
<Callout type="tip" title="Antes de empezar">
Mantén configurado el catálogo de esquemas del editor: marca la mayoría de los errores antes de que hagas push.
</Callout>
```

| Attribute | What it is |
| --- | --- |
| `type` | Optional. `note` (default), `info`, `tip`, `important`, `warning`, `caution` or `danger`. An unknown type is reported and renders as a note. |
| `title` | Optional. Its title; without it, the type's ("Nota", "Información", "Consejo", "Importante", "Aviso", "Precaución", "Peligro"). |

- The body is Markdown (links, lists, code).
- For a one-line warning with no title, the Markdown alert
  (`> [!WARNING]`) does the same with less markup.
- **Use sparingly:** one per page section at most, for what the reader must
  not miss (a reported mistake, a trap). A page of callouts has none.

## `<Entities>`

The table of a catalog type, rebuilt from its entities every time the site is
read, so it never goes stale.

```mdx
<Entities type="machines" group="role" columns="id,ip,os" />
```

| Attribute | What it is |
| --- | --- |
| `type` | Required. The type, as its folder name in `catalog/` (`machines` for `catalog/machines/`). |
| `columns` | Optional. The fields shown, comma-separated, `id` included. Without it, the type's `vista.columnas`; without that, its label and every field. |
| `group` | Optional. A field that splits the table into one block per value, in `valores` order for an `enum`, entities without it last. The group field is not repeated as a column. |

- Rows are sorted by label; each label links to the entity's page (its
  `ficha`) or its generated catalog page. `ref` cells show the target's label,
  linked.
- Only valid entities appear. An unknown type, column or group field, and
  every entity that fails its type, is reported on the page; the rest of the
  table renders.
- Picking columns and groups for a type: `catalog` skill,
  `references/entities-tables.md`.

## `<Diagram>`

A diagram written in its own file under `diagrams/`, shown where the page
needs it.

```mdx
<Diagram id="homelab" />
```

| Attribute | What it is |
| --- | --- |
| `id` | Required. The file name in `diagrams/` without `.json` or `.svg`. |

- The same diagram can be in any number of pages (an overview on the home
  and on its section's page, say). Before reusing one, check it still says
  what this page needs.
- A missing or unreadable file is reported ("<Diagram id="…">: no hay ningún
  diagrams/….json ni diagrams/….svg que se pueda leer (hay: …)") and shows a
  notice; the diagram's own problems are reported on the page too.
- Choosing and writing the diagram: `diagrams` skill.

## Which one

| You want… | Use |
| --- | --- |
| Every entity of a catalog type as a table | `<Entities>` |
| A note or warning the reader must not miss | `<Callout>` (or a `> [!…]` alert) |
| How things connect, a flow, a structure | `<Diagram>` of a file in `diagrams/` |
| A small table of options that are not catalog data | A Markdown table |
| One entity mentioned in a sentence | A `catalog:` link (`links.md`) |
