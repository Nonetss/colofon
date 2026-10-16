# Matrix (`"type": "matrix"`)

**Best for:** rows by columns where every cell holds one level of a short
ordered scale: who can do what with each component (permissions), what each
tool covers, how far each team has adopted each practice. The reader audits a
row or a column and sees where access is broad or narrow.

**Not for:** numeric values per cell where one cluster stands out (use
`heatmap`), how permissions are granted (use `sequence` or `swimlane`), who
talks to what (draw a data flow by hand, `drawn-data-flow.md`), or a table of
free text (write a Markdown table).

## The file

```json
{
  "type": "matrix",
  "title": "Quién toca cada fichero",
  "desc": "Qué hace con cada fichero quien escribe, un agente y la plataforma",
  "rows": [{ "entity": "files/doc-config" }, { "entity": "files/menu" }, { "entity": "files/page" }],
  "columns": [{ "name": "Quien escribe" }, { "name": "Agente" }, { "name": "Plataforma" }],
  "levels": ["Lee", "Propone", "Escribe"],
  "cells": [
    ["Escribe", "Propone", "Lee"],
    ["Escribe", "Propone", "Lee"],
    ["Escribe", "Escribe", "Lee"]
  ]
}
```

| Key | What it is |
| --- | --- |
| `rows`, `columns` | Required. The rows (the things: files, components) and the columns (who or what: roles, teams), each an item (see [items.md](items.md)). |
| `levels` | Required. 2 to 5 names, **from least to most** ("Sin acceso", "Lectura", "Escritura", "Admin"). |
| `cells` | Required. One list per row, in order, with one level name per column, or `null` for an empty cell. |

## What the platform does

- Writes the column names above the grid and the row names right-aligned on
  its left; both link to their `entity` or `page`.
- Shades each cell in ink, darker the more its level allows (from 10 % for
  the first level to 72 % for the last), with the level's name inside,
  shortened with a "." when it doesn't fit (cells are at least 84px wide, or
  as wide as the longest column name).
- An empty cell (`null`, or a level that isn't in `levels`) is drawn blank.
- The legend lists the levels with their shade; hovering one lights every
  cell at that level. A cell's hover card names its row, column and level.
- Rows' and columns' `sub`, `hue` and `focal` are not drawn: a matrix has no
  accent.

## What you decide

- **Rows are the things, columns are who acts on them.** Rows can be many,
  columns few: names are short above narrow cells.
- **A closed, ordered scale.** Name levels so each includes the one before
  ("Lee" < "Propone" < "Escribe"); the shading says "more", so an unordered
  scale ("Lectura", "Login", "SQL") lies.
- **Fill every cell you know.** `null` means "nothing here"; if a value is
  unknown, say so in the page rather than leaving a blank that reads as "no
  access".
- **Rows that are catalog entities are entities**, so their pages list the
  matrix.

## Complexity budget

| Limit | Value |
| --- | --- |
| Rows | 10 |
| Columns | 8 |
| Levels | 2 to 5 |

Over budget → split by domain (storage, publishing…) into two matrices, or
human roles and services apart.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Levels in the wrong order | The darkest cell isn't the one that allows most |
| One level per distinct wording | More than 5 is reported; merge into a real scale |
| `null` for "unknown" | It reads as "nothing"; unknowns belong in the page |
| Cells with free text | A matrix holds levels; write a table |
| Trying to accent a cell or row | There is no accent here; say what matters in `desc` |
| Columns with long names | They widen every cell; shorten or swap rows and columns |

## Reported

`levels` missing ("Falta: es obligatorio") or not 2 to 5 names, `cells`
missing ("Falta: es una lista por fila"), a row that is not a list, a row with
the wrong number of cells ("La fila tiene 2 celdas y hay 3 columnas"), a level
that isn't in `levels` (`` `Edita` no es ninguno de los niveles (Lee, Propone,
Escribe) ``; the cell is drawn empty), a different number of cell rows than
rows ("Hay 2 filas de celdas y 3 filas"), more than 10 rows and more than 8
columns.

## Text version

A Markdown table: a header with the column names, then one row per row with
its level in each column, "—" for an empty cell.

## In this site

`diagramas/matrix-who-writes.json`, shown in `docs/diagrams/concepts.mdx`.
