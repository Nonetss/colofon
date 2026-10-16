# Polar chart (`"type": "polar"`, variant `lollipop`)

**Best for:** one series of values over four to eight categories whose
**clockwise order means something**: hours of the day, days of the week,
months, compass directions. The circle shows where in the cycle the peak
falls and how the ends wrap round (late night next to early morning).

**Not for:** categories with no cyclic order (use `bar`), several series
(use `radar`, or `line` for a trend), more than eight time buckets (use
`line`), or negative values (there is no inside to the centre).

## The file

```json
{
  "type": "polar",
  "title": "Sincronizaciones por franja horaria",
  "desc": "Cuántos pushes se sincronizaron en cada franja de tres horas durante un mes; el pico es a media mañana",
  "unit": "sincronizaciones",
  "categories": ["00–03", "03–06", "06–09", "09–12", "12–15", "15–18", "18–21", "21–24"],
  "values": [4, 1, 12, 46, 30, 38, 17, 9],
  "max": 50,
  "focal": "09–12"
}
```

| Key | What it is |
| --- | --- |
| `categories` | Required. 4 to 8 categories, the first at the top, the rest clockwise. |
| `values` | Required. One value per category, from 0 to the top of the scale. |
| `max` | Optional. The top of the scale, above 0; without it, a round number above the largest value. |
| `focal` | Optional. The category drawn in the accent. |
| `variant` | Optional. `lollipop`. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- Draws five rings (20 % to 100 % of the scale) and a spoke per category,
  printing the scale on the top spoke and each category's name and value
  outside the circle.
- **Default:** each category is a wedge from the centre, as long as its
  value, grey; the focal one in the accent.
- **Lollipop** (`"variant": "lollipop"`): each category is a ray from the
  centre with a dot at its end. The **length** is the value and no area
  exaggerates it.
- A category at 0 draws nothing but keeps its name and value; a value above
  the scale or below 0 is drawn on the edge and reported.

## What you decide

- **Choose the numbers:** one quantity per category, all on the same base
  (counts in the same period). Formatting is in [items.md](items.md#values).
- **Keep the categories in their real order**, starting where the cycle
  starts (midnight, Monday, January). Never sort them by value: the order is
  the point of the type.
- **Focus one category**, the peak or the gap the page is about.
- **Honest scale.** The centre is always zero. A wedge's radius follows the
  value, so its *area* grows with the square: a value twice as big looks
  four times as heavy. When the reader must compare sizes, use
  `"variant": "lollipop"`; keep the wedges for the overall rhythm. Set `max`
  to a round top, and to the same top on charts that are compared.
- Write a missing measurement as a gap in `desc`, not a 0 in `values`.

## Complexity budget

| Limit | Value |
| --- | --- |
| Categories | 4 to 8 |
| Series | 1 |
| Accent elements | 1 (the focal category) |

Over budget → aggregate (24 hours into eight three-hour slots), or use a
`line` over the full sequence.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Categories with no cyclic order (sections, teams) | The circle invents an adjacency; use `bar` |
| Categories sorted by value | Destroys the cycle the type exists for |
| Wedges when exact comparison matters | Area exaggerates the large values; use `lollipop` |
| `max` lower than the data | Values are clipped to the edge and reported |
| 0 for "not measured" | Reads as a real zero |

## Reported

Fewer than four categories ("Un gráfico polar lleva al menos 4 categorías";
nothing is drawn), a missing `categories` or `values` ("Falta: es
obligatorio"), a different count ("Hay 8 categorías y 7 valores: uno por
categoría"), a value outside the scale ("60 está por encima de max (50): se
dibuja en 50"), a `focal` that is no category ("`X` no es ninguna de las
categorías"), more than 8 categories, and the accents.

## Text version

A table "Categoría", "Valor", one row per category in order.

## In this site

`diagrams/polar-sync-hours.json` and `diagrams/polar-sync-hours-lollipop.json`,
shown in `docs/diagrams/proportions.mdx`.
