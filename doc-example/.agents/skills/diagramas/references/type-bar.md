# Bar chart (`"type": "bar"`, variant `dumbbell`)

**Best for:** comparing one quantity across a handful of categories when the
comparison between bars *is* the message: pages per section, problems per
file kind, sign-ups per month. With two series, each category gets two bars
side by side. With `"variant": "dumbbell"`, two values per category whose
**distance** is the message: before and after, target and actual, two cohorts.

**Not for:** a trend over many ordered points (use `line`), a start total
bridged to an end total by signed steps (use `waterfall`; a dumbbell hides
what happened in between, a waterfall *is* what happened in between), parts
of a whole (use `treemap`), a category × category grid (use `heatmap`), or
three or four numbers the text can just say.

## The file

```json
{
  "type": "bar",
  "title": "Páginas por sección",
  "desc": "Cuántas páginas tiene cada sección de esta guía; Páginas es la más larga",
  "unit": "páginas",
  "focal": "Páginas",
  "categories": ["Repositorio", "Páginas", "Catálogo", "Diagramas", "Publicar"],
  "series": [{ "name": "Páginas", "values": [3, 4, 4, 5, 3] }]
}
```

The dumbbell takes the same keys, exactly two series and the variant:

```json
{
  "type": "bar",
  "variant": "dumbbell",
  "title": "Problemas antes y después de revisar",
  "desc": "Los problemas que la plataforma avisaba en cada sección antes de una revisión y los que quedan después",
  "focal": "Catálogo",
  "categories": ["Repositorio", "Páginas", "Catálogo", "Diagramas"],
  "series": [
    { "name": "Antes", "values": [6, 9, 14, 4] },
    { "name": "Después", "values": [1, 2, 3, 2] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `categories` | Required. The category names, in the order they are drawn. |
| `series` | Required. One or two series: `{ name, values }`, one value per category, plus optional `hue` and `info` (the card's sentence). |
| `orientation` | Optional. `vertical` (default) or `horizontal`, better for long names. The dumbbell is always horizontal. |
| `focal` | Optional. The **category** drawn in the accent. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- The value axis starts at zero (or crosses it, with negative values) and
  ends on a round number above the largest value, with four to six ticks and
  faint gridlines. Every bar prints its value; the focal one in the accent.
- One series with no `hue` is drawn in neutral grey, so the focal bar is the
  only colour. Two series take a hue each and get a legend.
- **Dumbbell:** one row per category on a horizontal value axis; the first
  series is a hollow dot, the second a filled one, joined by a line. Both
  values print outside the ends. The focal row's line and filled dot take the
  accent.
- Rows and bars keep the order of `categories`: the platform never sorts.

## What you decide

- **Choose the numbers.** One quantity, one unit, comparable across all
  categories. Values are JSON numbers (`1200`, not `"1.200"`); the
  separators and unit come from [items.md](items.md#values).
- **Choose the order** and say it in `desc` when it isn't obvious: by value,
  by the subject's own order (months, the sidebar), or for a dumbbell by the
  first value or by the change. An unexplained order reads as arbitrary.
- **Focus one category**, the one the page talks about. The accent marks the
  point, not the biggest bar by default.
- **Keep the axis honest.** It always includes zero; don't fake a zoom by
  subtracting a baseline from every value. If the differences look small,
  that is the true reading, or the story is a change (`dumbbell`, `line`).
- A dumbbell's line is a gap, not a path: don't narrate it as movement.

## Complexity budget

| Limit | Value |
| --- | --- |
| Categories | 12 (8 reads best) |
| Series | 2 (exactly 2 for `dumbbell`) |
| Accent elements | 1 (the focal category) |

Over budget → group categories (by period, by section) or split into two
charts.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| `focal` on a series instead of a category | Bars ignore a series' `focal`; set `"focal": "<category>"` |
| A dumbbell with one or three series | One is drawn as bars and reported; a third value has no place |
| A hue per bar | Hue groups series; one series reads in grey plus the accent |
| Values as strings or pre-formatted (`"1.234"`) | Not a number: the series is reported |
| Long category names on vertical bars | They widen every slot; use `"orientation": "horizontal"` |
| A bar chart of a time series with 20 points | That is a `line` |

## Reported

A missing `categories`, a series with more or fewer values than categories
("Lleva 5 valores, uno por categoría, y tiene 4"; the series is left out), more
than two series ("Lleva como mucho 2 series"), a `focal` that is no category
("`X` no es ninguna de las categorías"), a dumbbell without exactly two series
("Un gráfico de mancuernas compara dos series: se dibuja como barras"), more
than 12 categories, and the accents.

## Text version

A table: one row per category, one column per series, values with their unit.

## In this site

`diagramas/bar-pages-per-section.json` and `diagramas/bar-dumbbell-problems.json`,
shown in `docs/diagrams/charts.mdx`.
