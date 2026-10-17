# Radar (`"type": "radar"`)

**Best for:** a few entities compared on three to six criteria scored on the
**same scale**, when the *shape* of each profile is the message: the ways of
reading a site scored 0 to 5, tools against a checklist, teams on a
scorecard. It reads as "which one is all-round, which one is a specialist".

**Not for:** one or two entities (a table or a `bar` with two series says it
better), a single series over cyclic categories (use `polar`), criteria
measured in different units, or exact values (the shape hides them; use a
table).

## The file

```json
{
  "type": "radar",
  "title": "Tres formas de leer la guía",
  "desc": "El lector web, llm.txt y el editor puntuados de 0 a 5 en lo que ofrece cada uno; el lector web es el más completo para una persona",
  "axes": ["Navegación", "Búsqueda", "Diagramas", "Para agentes", "Validación"],
  "max": 5,
  "series": [
    { "name": "Lector web", "values": [5, 4, 5, 2, 2], "focal": true },
    { "name": "llm.txt", "values": [2, 1, 2, 5, 1] },
    { "name": "Editor", "values": [1, 3, 1, 2, 5] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `axes` | Required. The criteria, 3 to 6; the first at the top, the rest clockwise. |
| `max` | Required. The top of the scale, above 0. The scale always starts at 0. |
| `series` | Required. The entities, 1 to 5: `{ name, values }`, one value per axis, plus optional `hue`, `focal` and `info`. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- Draws five rings at 20 %, 40 %, 60 %, 80 % and 100 % of `max`, a spoke per
  axis, and prints the scale only on the top spoke.
- Each series is a translucent polygon of its hue (the next of the palette
  when it has none), the biggest at the back. The focal series is drawn last,
  in the accent, with a dot on each vertex; the others have no dots.
- The legend lists every series; hovering one lights it, and its card lists
  its value on every axis.
- A value above `max` or below 0 is drawn on the edge and reported.

## What you decide

- **Choose the numbers.** Every axis on the same scale and in the same
  direction (higher is better everywhere). Convert criteria to a common score
  (0 to 5, 0 to 100) before writing them; formatting is in
  [items.md](items.md#values).
- **Choose `max`** as the real top of the scale (5 for a score out of 5), not
  the largest value: a shrunken scale exaggerates every difference.
- **Focus one series**: the entity the page is about. Without a focal
  series, three overlapping polygons are hard to tell apart.
- **Order the axes** so related criteria sit next to each other: the shape
  depends on the order, so keep it fixed across charts that are compared.
- Write in `desc` what the shapes say ("el lector web es el más completo");
  the reader shouldn't have to decode it.

## Complexity budget

| Limit | Value |
| --- | --- |
| Axes | 3 to 6 |
| Series | 5 (3 reads best) |
| Accent elements | 1 (the focal series) |

Over budget → split by group of criteria into two radars, or switch to a
table.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Criteria in different units or directions | The polygon's shape means nothing |
| `max` set to the largest value | Inflates the differences; use the scale's true top |
| A radar of two entities | A two-column table or paired bars read better |
| More than three series without a focal one | Overlapping polygons blur together |
| Axes that are categories, not scores ("Color", "Año") | Only measurable criteria belong on a spoke |

## Reported

Fewer than three axes ("Un radar lleva al menos 3 ejes"; nothing is drawn), a
missing `axes` or `max`, a series with another count of values (""Editor"
tiene 4 valores y hay 5 ejes"; left out), a value outside the scale ("7 está
por encima de max (5): se dibuja en 5", "-1 está por debajo de 0: se dibuja
en 0"), more than 6 axes or 5 series, and the accents.

## Text version

A table: one row per series, one column per axis.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/radar-reading-surfaces.json`, in its `diagrams/proportions` page.
