# Waterfall (`"type": "waterfall"`)

**Best for:** how a start total becomes an end total through signed changes,
when the running total is the story: a budget from one year to the next,
problems from a first sync down to a clean one, headcount ± hires ± leavers.
Each bar either anchors a total or bridges one running level to the next, and
the reader walks the path from start to end.

**Not for:** two values where only the gap matters (use `bar` with
`dumbbell`), independent categories (use `bar`), a quantity that splits and
merges (use `sankey`: a waterfall never branches), or drop-off through the
stages of one funnel (use `pyramid` with `funnel`).

## The file

```json
{
  "type": "waterfall",
  "title": "De 24 problemas a 8",
  "desc": "Cómo bajan los problemas de una primera sincronización: cada arreglo resta y los diagramas nuevos suman algunos",
  "unit": "problemas",
  "start": { "name": "Primera sincronización", "value": 24 },
  "steps": [
    { "name": "Cabeceras", "delta": -9, "focal": true, "info": "Faltaban description y title en nueve páginas" },
    { "name": "Enlaces rotos", "delta": -6 },
    { "name": "Diagramas nuevos", "delta": 3 },
    { "name": "Menú", "delta": -4 }
  ],
  "end": "Tras revisar"
}
```

| Key | What it is |
| --- | --- |
| `start` | Required. The starting total: `{ name, value }`, plus optional `info`. |
| `steps` | Required. The changes, in order: `{ name, delta }`, `delta` negative for what subtracts, plus optional `focal` and `info`. |
| `end` | Optional. The end total's name; "Total" by default. You never write its value. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- Computes every running total and the end total itself, so the walk always
  adds up.
- The start and end totals stand on the baseline; each step floats from the
  running total before it to the one after. Rises and falls take different
  colours, named in the legend "Sube" and "Baja"; totals are "Total".
- A dashed carry line joins each bar to the next at the running total.
- Totals print their value; steps print their signed change ("+3", "−9"),
  above a rise and below a fall. The focal step takes the accent.
- The value axis includes zero and ends on a round number above the highest
  level, so a step is drawn at its true size against the totals.

## What you decide

- **Choose the numbers.** One unit for the whole walk; every delta is a
  change of the start's quantity. Write values as JSON numbers; formatting is
  in [items.md](items.md#values).
- **Choose the steps:** the few changes that explain the difference, in the
  order they happened or by size. Fold the small ones into one named step
  ("Otros") rather than adding slivers; drop a zero change (it still takes a
  column).
- **Focus one step**: the change the page is about, not automatically the
  biggest.
- **Keep the axis honest.** The axis starts at zero, so steps that are tiny
  next to the total look tiny. That is the true reading; if the changes are
  the story and not the total, chart the changes alone as a `bar`.
- Name the end for what it is ("Tras revisar", "Plan 2027"), not "Total".

## Complexity budget

| Limit | Value |
| --- | --- |
| Steps | 10 |
| Accent elements | 2 (focal steps) |

Over budget → merge the small steps into one, or split the walk in two at a
natural resting point (two charts, each with its own start and end).

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Writing the end total by hand somewhere | The platform computes it; a second number can only disagree |
| Mixing units between steps | The walk stops adding up |
| A step for every tiny change | Slivers nobody reads; group them |
| Every decrease `focal` | Colour already tells rises from falls; the accent is for one point |
| Steps that are not in sequence (independent categories) | That is a `bar` chart |

## Reported

A missing `start` ("Falta: es obligatorio"), a step without `name` or `delta`
(left out), more than 10 steps ("Un gráfico en cascada lleva como mucho 10
pasos y este tiene 12: pártelo en dos diagramas"), and the accents.

## Text version

A table with the columns "Cambio" and "Acumulado": the start, each step with
its signed change and the running total after it, and the end total.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/waterfall-problems.json`, in its `diagrams/charts` page.
