# Quadrant (`"type": "quadrant"`)

**Best for:** a 2×2 frame where two independent criteria sort a handful of
things: value × effort, reach × frequency, urgency × importance. The reader
sees at a glance which corner each thing lands in, and which one to do first.

**Not for:** a real measured correlation with many points (use `scatter`), a
value chain against maturity (use `wardley`), entities scored on more than two
criteria (use `radar`), or four named scenarios with no positioned items (write
a four-row table, or a `matrix`).

## The file

```json
{
  "type": "quadrant",
  "title": "Qué documentar primero",
  "desc": "Las partes de un repositorio de contenido según lo que le valen al lector y el esfuerzo de escribirlas",
  "x": { "label": "Esfuerzo de escribirla", "low": "Poco", "high": "Mucho" },
  "y": { "label": "Valor para el lector", "low": "Bajo", "high": "Alto" },
  "quadrants": ["Hazlo ya", "Planifícalo", "Si sobra tiempo", "Déjalo"],
  "items": [
    { "name": "Primeros pasos", "page": "getting-started", "x": 22, "y": 88, "focal": true },
    { "entity": "files/menu", "x": 14, "y": 66 },
    { "name": "Catálogo", "page": "data", "x": 76, "y": 82 },
    { "name": "Rehacer todo el menú", "x": 84, "y": 14 }
  ]
}
```

| Key | What it is |
| --- | --- |
| `x`, `y` | Required. Each axis is `{ "label", "low", "high" }`: its name and one word at each end. |
| `quadrants` | Required. Exactly four names, in reading order: top-left, top-right, bottom-left, bottom-right. |
| `items` | Required. The things placed, each an item (see [items.md](items.md)) plus `x` (0 left, 100 right) and `y` (0 bottom, 100 top). Both are required. |

## What the platform does

- Draws a square frame with an axis cross through its centre, an arrowhead on
  the right and top ends. `y.high` (in capitals) and `y.label` sit above the
  top tip, `y.low` below the frame; `x.high` and `x.label` right of the right
  tip, `x.low` left of the frame.
- Writes each quadrant's name in capitals, muted, in its outer corner.
- Places each item as a small dot at its `x`, `y`, and its name beside it:
  right, left, above or below, the first spot that overlaps no other label,
  dot or axis line.
- An item at `x: 50` counts as right, at `y: 50` as top: that decides the
  quadrant named in the hover card and the text version.
- `focal` items get the accent dot and label; an item with `hue` gets a dot
  in its hue. `sub` is not drawn; `info` shows in the hover card.

## What you decide

- **Name the axes as criteria**, and the ends with one word each (`Poco` /
  `Mucho`, `Bajo` / `Alto`). No arrows, no "(alto)" in the text: the platform
  draws the arrows.
- **Name the quadrants as verdicts** ("Hazlo ya", "Déjalo"), not as
  restatements of the axes ("Mucho valor, poco esfuerzo").
- **Put the high-value corner where the reader looks**: with value up, the
  best corner is top-left or top-right depending on which way effort runs.
- **One focal item**, the "do first" one. Positions are judgements, not
  measurements: round numbers are fine, but keep items clear of 50 so none
  sits on an axis.

## Complexity budget

| Limit | Value |
| --- | --- |
| Items | 12 |
| Accent elements | 2 (focal items) |

Over budget → group items that land together into one, or split into two
quadrants by area.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| An item at `x: 50` or `y: 50` | It sits on the axis; the reader can't tell its quadrant |
| Items piled in one corner | The labels can't all be placed, and the frame says nothing; rethink the axes |
| Axes that are not independent ("valor" and "utilidad") | Everything lands on a diagonal |
| Every item `focal` | Focus is for the one thing to do first |
| Measured data with real units | That is a `scatter`, with its scale |
| Sentences as axis ends | One word at each tip; the explanation goes in `desc` |

## Reported

An axis that is not three texts ("Es { label, low, high }, tres textos"),
`quadrants` that is not four names, an item missing `x` or `y`, a coordinate
out of range ("Va de 0 a 100"; the item is left out), a label that can't be
placed (`La etiqueta de "…" no cabe sin pisar otra: sepáralo de los demás`;
the dot is still drawn), more than 12 items and more than two accents.

## Text version

A list with each item and its quadrant: "Primeros pasos: Hazlo ya",
"Catálogo: Planifícalo".

## In this site

`diagrams/quadrant-what-to-write.json`, shown in `docs/diagrams/concepts.mdx`.
