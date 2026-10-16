# Scatter (`"type": "scatter"`, variants `bubble`, `beeswarm`)

**Best for:** whether two measures go together, which clusters form and which
cases stand out: page length against reads, size against links. With
`"variant": "bubble"`, a third quantity per item as area, when the
*combination* is the story. With `"variant": "beeswarm"`, one measure only:
how a crowd of values spreads, per group, and where the outliers sit.

**Not for:** one value per category (use `bar`), values over time (use
`line`), qualitative positioning on two judged axes (use `quadrant`), or a
handful of items a table states better.

## The file

```json
{
  "type": "scatter",
  "title": "Largo y lecturas de cada página",
  "desc": "Cada punto es una página: cuántas palabras tiene y cuántas veces se leyó el último mes, por sección",
  "x": { "label": "Palabras" },
  "y": { "label": "Lecturas" },
  "points": [
    { "name": "Componentes", "x": 1400, "y": 220, "group": "Páginas", "focal": true },
    { "x": 600, "y": 140, "group": "Páginas" },
    { "x": 500, "y": 60, "group": "Repositorio" },
    { "name": "Menú", "x": 1100, "y": 180, "group": "Repositorio" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `x`, `y` | Required (no `y` with `beeswarm`). Each axis: `{ label }`, plus optional `min` and `max`. |
| `points` | Required. `{ x, y }`, plus optional `name` (gets a label), `group` (its colour and legend entry), `size` (`bubble`), `focal` and `info`. |
| `variant` | Optional. `bubble` or `beeswarm`. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- Both axes run on round ticks with faint gridlines and **always include
  zero**; `min` and `max` can widen an axis, not move its origin. The axis
  labels print in capitals.
- Points are coloured by `group` (in order of appearance), grey without one.
  The focal ones take the accent. Only named or focal points get a label (in
  capitals; a focal point without `name` shows "PUNTO 3"), placed beside, above or below the dot so no two overlap; one that cannot
  fit is reported and left unlabelled.
- **Bubble:** each dot's **area** is proportional to `size` (four times the
  size is twice the radius), the biggest up to a fixed radius, translucent and
  drawn biggest first so small ones stay on top.
- **Beeswarm:** no `y`. One row per group along the `x` axis; dots of one size
  pushed apart just enough not to overlap, so the thickness of a row is where
  values crowd. The vertical spread means nothing.

## What you decide

- **Choose the numbers:** two measures that could plausibly be related, each
  on its own axis with its own label; `unit` applies to the printed values.
  Formatting is in [items.md](items.md#values).
- **Focus one point**, or two: the case the page talks about. Name only it
  and one or two notable outliers; the rest are read on hover.
- **Honest axes.** Zero is always on the axis, so values far from zero
  bunch together; that is the true distance. Don't shift values to fake a
  zoom; say what the cluster is in `desc`.
- **Bubble:** use it only when the third value changes the story; give every
  point a `size` above 0, on one scale. Magnitudes spanning several orders
  make the small bubbles vanish.
- **Beeswarm:** give every point a `group`, or none to any: with groups, a
  point without one has no row.
- Don't add a trend line by placing points; the scatter shows what is there.

## Complexity budget

| Limit | Value |
| --- | --- |
| Points | 60 |
| Labels (named or focal points) | 6 |
| Groups | 5 |
| Accent elements | 2 (focal points) |

Over budget → a beeswarm for a big crowd of one measure, fewer groups (merge
the small ones), or two charts.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A name on every point | Labels collide and are reported; name the focal and the outliers |
| `size` on a plain scatter | Ignored; use `"variant": "bubble"` or drop it |
| A bubble chart where size changes nothing | Decoration that costs legibility |
| A group per point | The legend becomes a list; use `name` |
| Two measures in different units on one axis | The position means nothing |
| `min` above zero to zoom in | Ignored: the axis always includes zero |

## Reported

A missing axis ("Falta: es obligatorio"), a point without `y` outside a
beeswarm ("Falta: un punto lleva x e y"; left out), a bubble without a
positive `size` ("Una burbuja lleva size, un número mayor que 0"), a label
that can't fit ("La etiqueta "Menú" no cabe sin tapar otra"), the budget and
the accents.

## Text version

A table: one row per point (its name, or "Punto 3"), with the `x` and `y`
values and, when used, "Tamaño" and "Grupo".

## In this site

`diagrams/scatter-pages.json`, `scatter-bubble-sections.json` and
`scatter-beeswarm-sync.json`, shown in `docs/diagrams/charts.mdx`.
