# Treemap (`"type": "treemap"`, variant `marimekko`)

**Best for:** part of a whole where the *relative sizes* are the story: what
a repository is made of, where a budget goes, which section takes most reads.
The reader's question is "what dominates, and by how much?". With
`"variant": "marimekko"`, a whole split **two ways at once** (reads by section
and by channel), when both splits matter.

**Not for:** exact values that matter more than the proportion (use `bar`),
containment or scope with no quantity (draw it by hand, the `nested` recipe),
a hierarchy to trace parent to child (use `tree`), or a quantity flowing
between stages (use `sankey`).

## The file

```json
{
  "type": "treemap",
  "title": "De qué está hecho este repositorio",
  "desc": "El peso de cada clase de fichero de la guía, agrupado en contenido y configuración; las páginas son casi la mitad",
  "unit": "KB",
  "items": [
    { "entity": "files/page", "name": "Páginas", "value": 96, "group": "Contenido", "focal": true },
    { "entity": "files/entity", "name": "Entidades", "value": 38, "group": "Contenido" },
    { "entity": "files/diagram-file", "name": "Diagramas", "value": 31, "group": "Contenido" },
    { "entity": "files/menu", "name": "Menú", "value": 3, "group": "Configuración" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `items` | Required (not in a marimekko). The parts, each an item (`name`, `sub`, `info`, `focal`, `entity` or `page`; see [items.md](items.md#pieces)) with `value`, a number above 0, and optional `group`. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

A marimekko takes `columns` instead of `items`:

```json
{
  "type": "treemap",
  "variant": "marimekko",
  "unit": "lecturas",
  "columns": [
    { "name": "Inicio", "parts": [
      { "name": "Lector web", "value": 420 },
      { "name": "llm.txt", "value": 90 }
    ] },
    { "name": "Escritura", "parts": [
      { "name": "Lector web", "value": 610 },
      { "name": "llm.txt", "value": 260 },
      { "name": "Editor", "value": 140 }
    ] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `columns` | Required in a marimekko. `{ name, parts }`, each part `{ name, value, info? }`, value above 0. A part with the same `name` in several columns is the same series. |

## What the platform does

- **Treemap:** squarified rectangles whose areas follow the values, biggest
  first. Parts of the same `group` sit together inside a frame titled with
  the group's name in capitals; groups are ordered by their total.
- Cells go from the strongest grey (biggest) to the faintest (smallest), so
  the order survives without colour; the focal cell takes the accent. Each
  cell prints its name, and its value and share ("96 KB · 54 %") when they
  fit; a sliver shows nothing, but its card and the text version name it.
- With `entity`, a cell links to the entity's page and that page lists the
  diagram.
- **Marimekko:** each column's width is its share of the total, and each
  column is split by its parts, which stack in the same order everywhere
  (the biggest overall on top), each series with its own grey and a legend
  entry. Under each column, its name and share ("Escritura · 35 %").
  Columns keep the written order. A marimekko has no accent.

## What you decide

- **Choose the numbers:** parts of one real total, in one unit, none zero or
  negative. If the parts don't add up to something meaningful, it's a `bar`.
  Formatting is in [items.md](items.md#values).
- **Focus one part**: the one the page is about, not automatically the
  biggest (it already dominates by area).
- **Honest area.** Never drop a part because it is small: the treemap claims
  a whole. Merge the slivers into one named part ("Otros").
- Use `group` for one meaningful level (content against configuration);
  don't group to decorate. One level is all the type draws.
- **Marimekko:** order columns by their subject (the sidebar) or by size, and
  use the same part names across columns so the series line up.

## Complexity budget

| Limit | Value |
| --- | --- |
| Parts (`items`) | 16 (8 reads best) |
| Marimekko columns | 6 |
| Parts per marimekko column | 5 |
| Accent elements | 1 (the focal part) |

Over budget → merge the small parts into "Otros", or split by group into two
treemaps.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A value of 0 or below | Area has no sign; the part is reported and left out |
| Every part in its own `group` | Frames around single cells; drop `group` |
| A treemap of values that aren't parts of one total | The areas compare nothing; use `bar` |
| `items` in a marimekko, or `columns` without the variant | Reported; the other key is ignored |
| A marimekko where only one split matters | It's a treemap (one way) or a `bar` |
| Retyping catalog files as plain names | Use `entity`: the cell links and the entity lists the diagram |

## Reported

A value that is not above 0 ("Es un número mayor que 0"; the part is left
out), `items` in a marimekko ("Un marimekko lleva columns, no items"),
`columns` without the variant ("columns va en un marimekko (variant:
marimekko)"), more than 16 parts or 6 columns, a column with more than five
parts ("Una columna de un marimekko lleva como mucho 5 partes y "X" tiene 6:
pártelo en dos diagramas"), and the accents.

## Text version

Treemap: a table "Parte", "Valor", "Parte del total", biggest first.
Marimekko: a table "Columna", "Parte", "Valor", "En su columna".

## In this site

`diagramas/treemap-repository-files.json` and
`diagramas/treemap-reading-channels.json` (marimekko), shown in
`docs/diagrams/proportions.mdx`.
