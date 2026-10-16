# Heatmap (`"type": "heatmap"`)

**Best for:** a table of rows × columns where *which crossing stands out* is
the story: warnings per file kind and week, failures per service and sprint,
reads per section and month. The reader scans the whole grid at once and one
cell, or one cluster, jumps out.

**Not for:** comparing a few values precisely (use `bar`), a trend along one
axis (use `line`), levels or permissions that are categories, not numbers
(use `matrix`), or a grid with no cell worth pointing at (write the table).

## The file

```json
{
  "type": "heatmap",
  "title": "Avisos por fichero y semana",
  "desc": "Cuántos avisos dejó cada clase de fichero en las sincronizaciones de cinco semanas; la semana en que se añadieron los diagramas destaca",
  "rows": ["Páginas", "Menú", "Catálogo", "Diagramas"],
  "columns": ["S1", "S2", "S3", "S4", "S5"],
  "values": [
    [6, 4, 5, 3, 2],
    [1, 0, 2, 0, 0],
    [3, 5, 2, 2, 1],
    [0, 1, 2, 14, 3]
  ],
  "focal": [3, 3]
}
```

| Key | What it is |
| --- | --- |
| `rows` | Required. The name of each row, top to bottom. |
| `columns` | Required. The name of each column, left to right. |
| `values` | Required. One list per row, one number per column, or `null` for an empty cell. |
| `focal` | Optional. `[row, column]`, counted from 0, of the cell that stands out. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- Shades every cell on **one grey ramp** from the smallest value (a pale grey
  still visible on the paper) to the largest (dark), and prints its value
  inside, in the paper colour on dark cells.
- The focal cell is drawn in the accent and **left out of the ramp**, so an
  outlier doesn't wash every other cell into the same pale grey.
- A `null` cell is a dashed empty outline, "—" in the text version.
- The legend says "Menos (0)" and "Más (6)" with the ramp's two ends, plus
  "Destacada" for the focal cell.
- Rows and columns keep the written order; cells widen to fit the longest
  column name or value.

## What you decide

- **Choose the numbers:** one quantity per cell, comparable across the whole
  grid (counts in the same period, rates on the same base). Formatting is in
  [items.md](items.md#values).
- **Focus one cell**: the crossing the title is about. Say its value and why
  it matters in `desc`; the ramp is for comparison, the number in the cell
  for the exact value.
- **Order rows and columns** by their own order (weeks, the sidebar) or so the
  pattern shows; never drop a row because it spoils the pattern, since a
  missing row reads as "no problem there".
- **Honest grid.** Use `null` for "not measured", `0` for "measured, none":
  they read differently. The ramp is a single grey for unsigned counts; it
  has no centre, so don't use a heatmap for values that are good above and
  bad below a midpoint.

## Complexity budget

| Limit | Value |
| --- | --- |
| Rows | 12 |
| Columns | 12 |
| Accent elements | 1 (the focal cell) |

Over budget → aggregate (weeks into months), or split the rows into two grids
with the same columns.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A heatmap with no cell that stands out | It's a table with grey; write the table |
| `0` where nothing was measured | Reads as a real zero; use `null` |
| Mixing quantities in one grid (counts and percentages) | One ramp can't compare them |
| Rows or columns dropped to clean the pattern | The reader can't see what's missing |
| `focal` counted from 1 | It is `[row, column]` from 0; off by one points at the wrong cell |

## Reported

A missing `rows` or `columns` ("Falta: es obligatorio"), a different number of
value lists and rows ("Hay 4 filas y 3 listas de valores: una por fila"), a
row with another count ("La fila "Menú" tiene 4 valores y hay 5 columnas";
padded with empty cells or cut), a `focal` outside the grid ("[4, 0] no es
ninguna celda"), and more than 12 rows or columns.

## Text version

A table: one row per row, one column per column, each value with its unit and
"—" for an empty cell.

## In this site

`diagrams/heatmap-sync-problems.json`, shown in `docs/diagrams/proportions.mdx`.
