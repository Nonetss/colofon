# Line chart (`"type": "line"`, variants `slope`, `ridgeline`, `stream`, `bump`)

**Best for:** how one to four series move over ordered points (months,
weeks, versions) when the direction and rate of change are the message:
reads per month, problems per release. The variants read the same data a
different way; pick one below.

**Not for:** comparing categories with no order (use `bar`), a single change
from a start total to an end total (use `waterfall`), two measures against
each other (use `scatter`), or a value per hour or weekday where the cycle
matters (use `polar`).

## The file

```json
{
  "type": "line",
  "title": "Lectores y agentes",
  "desc": "Las lecturas de la guía al mes, en el lector y por agentes que leen su llm.txt",
  "unit": "lecturas",
  "x": ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"],
  "series": [
    { "name": "Lector", "values": [320, 410, 380, 450, 300, 520] },
    { "name": "Agentes (llm.txt)", "values": [80, 140, 260, 340, 390, 610], "focal": true }
  ]
}
```

| Key | What it is |
| --- | --- |
| `x` | Required. The points of the x axis, in order: labels (`"S1"`, `"v2"`) or dates (`YYYY-MM-DD`, `YYYY-MM`). |
| `series` | Required. `{ name, values }`, one value per point of `x`, plus optional `hue`, `focal` and `info`. With `bump`, the values are ranks. |
| `variant` | Optional. `slope`, `ridgeline`, `stream` or `bump`. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- Points are **evenly spaced in the order written**: `x` is a sequence, not a
  time scale. A date ([items.md](items.md#dates)) shows in Spanish ("abr
  2026"); anything else, an impossible date included, shows as written and
  is not reported. With more than 12 points only every few labels are printed.
- The value axis includes zero and ends on a round number above the largest
  value. Straight segments join the points (no smoothing), with a dot on every
  point; each series is named beside its last point, names nudged apart.
- A focal series is drawn thicker in the accent; the others take a hue each.
  Two or more series get a legend; hovering one lights its marks.

## The variants

### `slope`: before and after

Exactly two points in `x` (two years, before and after a change), several
series, read as direction, steepness and who overtook whom. Two vertical
rules with the `x` labels in capitals under them; each series a straight line
with its name and value printed at both ends. Close labels are spread apart,
the dots never move. A series without `hue` is grey, so the focal one stands
out. With more than two points it is reported and drawn as plain lines.
Example: `diagramas/line-slope-sections.json`.

### `ridgeline`: when each series rises

Each series in its own row as a filled ridge, all ridges on **one shared
height scale**, the name on the left. Use it to compare *when* each series
peaks (edits per section, week by week), with up to eight series. There is
no value axis: values are read on hover and in the text version. Negative
values are drawn at zero. Example: `diagramas/line-ridgeline-edits.json`.

### `stream`: a total and how it splits

The series stacked around a centred baseline: the stream's height at each
point is the total, each layer its share. Use it for composition over many
points (files changed per month, by kind), with few layers. No value axis;
the card gives each layer's total ("120 ficheros en total"). Negative values
count as zero. Example: `diagramas/line-stream-files.json`.

### `bump`: ranks, not values

Each value is a rank, a whole number from 1, and rank 1 is on top. Each
point is a dot with its rank inside, names at both ends. Use it when position
is the story (the most-read sections, quarter by quarter) across three to six
snapshots. A value that is not a whole number from 1 is reported and the
chart is drawn as plain lines. Example: `diagramas/line-bump-sections.json`.

## What you decide

- **Choose the numbers:** one quantity and unit for every series. If two
  series are in different units, they are two charts.
- **Focus one series**, the one the page is about; with `slope` and `bump`,
  often the one that moved against the others, not the winner.
- **Honest axes.** The value axis always starts at zero; don't subtract a
  baseline to exaggerate a change. Uneven dates (a gap of three months among
  monthly points) are drawn evenly: fill the missing points or say so in
  `desc`.
- A slope's line is a connector, not a path: two ends say nothing about what
  happened in between. In a bump chart, state in `desc` what the ranking is
  by, and give each snapshot every rank once (the platform does not check
  ties or gaps).

## Complexity budget

| Limit | Value |
| --- | --- |
| Points per series | 24 (2 exactly for `slope`) |
| Series | 4 (8 for `ridgeline` and `bump`) |
| Accent elements | 2 (focal series) |

Over budget → split by series (two charts with the same axis) or aggregate the
points (weeks to months).

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| More than four plain lines | Spaghetti; focus one or use `ridgeline` |
| `slope` with three or more points | Reported; it's a plain line or a `bump` |
| `bump` with values instead of ranks | Reported; magnitude belongs in plain lines |
| `stream` when exact values matter | Layers give shape and share, not numbers; use bars or plain lines |
| A hue per series *and* a focal one in a busy chart | Leave the rest without `hue` (slope) or few, and let the accent lead |
| A line over unordered categories | The slope between them means nothing; use `bar` |

## Reported

A missing `x` ("Falta: es una lista con al menos un elemento"), a series with
another number of values ("Lleva 6 valores, uno por punto de x, y tiene 5";
left out), `slope` without exactly two points ("Un gráfico de pendiente compara
exactamente dos puntos: se dibuja como líneas"), a bad rank ("Un rango es un
número entero desde 1: se dibuja como líneas"), the budget and the accents.

## Text version

A table: one row per point of `x`, one column per series (ranks with `bump`).

## In this site

`diagramas/line-reads.json`, `line-slope-sections.json`,
`line-ridgeline-edits.json`, `line-stream-files.json` and
`line-bump-sections.json`, shown in `docs/diagrams/charts.mdx`.
