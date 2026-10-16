# Sankey (`"type": "sankey"`)

**Best for:** where a **quantity** goes as it splits and merges across two or
three stages: reads by channel and then by section, a budget by team and then
by vendor. It is the one type where a band's **thickness is data**, so use it
only when comparing those amounts matters.

**Not for:** a sequence where nothing splits or merges (a `flowchart`, or a
drawn chain), one quantity narrowing through stages (use `pyramid` with
`funnel`), a start total walked to an end total (use `waterfall`), or
connections whose size doesn't matter (a flow diagram says it with less ink).

## The file

```json
{
  "type": "sankey",
  "title": "Por dónde llegan las lecturas",
  "desc": "Las lecturas de un mes por cómo se leyeron y por sección",
  "unit": "lecturas",
  "columns": [
    [{ "id": "readings", "name": "Lecturas" }],
    [
      { "id": "web", "name": "Lector web", "page": "catalog/reader" },
      { "id": "llm", "name": "llm.txt", "page": "publishing/agents" }
    ],
    [
      { "id": "writing", "name": "Escritura", "page": "pages" },
      { "id": "data", "name": "Datos", "page": "catalog" }
    ]
  ],
  "flows": [
    { "from": "readings", "to": "web", "value": 940 },
    { "from": "readings", "to": "llm", "value": 410, "focal": true },
    { "from": "web", "to": "writing", "value": 610 },
    { "from": "web", "to": "data", "value": 330 },
    { "from": "llm", "to": "writing", "value": 260, "focal": true },
    { "from": "llm", "to": "data", "value": 150 }
  ]
}
```

| Key | What it is |
| --- | --- |
| `columns` | Required. 2 or 3 columns, left to right, each a list of nodes. A node is an item with an `id` (`name`, `sub`, `info`, `focal`, `entity` or `page`; see [items.md](items.md#pieces)). |
| `flows` | Required. `{ from, to, value }` from a node to one in the **next** column, `value` above 0, plus optional `focal` and `info`. |
| `unit`, `decimals` | Optional. How values print: [items.md](items.md#values). |

## What the platform does

- Nodes and bands share **one scale** for the whole diagram: the column with
  the most fills the height, the others are centred, and a node's bar is as
  tall as what passes through it.
- Bands leave and arrive horizontally, stacked in the order of the nodes they
  reach, with no arrowheads: the order of the columns is the direction.
- Ordinary bands are one neutral tint ("Flujo" in the legend); the `focal`
  bands form the highlighted path ("Camino destacado"), drawn in the accent
  over the rest, and the whole path counts as **one** accent.
- Names and amounts sit outside the bars in the first and last columns, and
  centred in the gap above each node in the middle one.
- Nodes keep the written order within their column.

## What you decide

- **Choose the numbers:** one quantity in one unit from start to end. A
  middle node must send exactly what it receives; check the sums before
  writing. Formatting is in [items.md](items.md#values).
- **Focus one path**: the flow the page is about, marked `focal` on each of
  its bands, end to end. Don't also mark nodes `focal` unless the point is a
  node.
- **Order the nodes** in each column to match their targets and sources, so
  bands don't cross; the platform keeps your order.
- **Honest bands.** Don't drop a small flow to tidy up; merge the slivers
  into one named node ("Otros") so every node still balances.
- Link nodes that are pages or entities (`page`, `entity`): the bars become
  links.

## Complexity budget

| Limit | Value |
| --- | --- |
| Columns | 3 |
| Nodes | 8 |
| Flows | 12 |
| Accent elements | 2 (the focal path counts once; each focal node once) |

Over budget → two Sankeys: an overview of the first two columns and a detail
of the last two.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A middle node that doesn't balance | Reported; the bar and its bands disagree |
| A flow that skips a column or goes back | Left out; add the middle node or rethink the stages |
| Nodes in an order that makes bands cross twice | A tangle in the middle; reorder the column |
| A Sankey with no splits or merges | It's a flowchart or a funnel |
| A hue per band | Bands are one tint; the accent marks the path |
| Percentages that don't add up to the source | Reads as an error |

## Reported

Fewer than two columns ("Un Sankey lleva al menos 2 columnas"; nothing is
drawn), a flow end that is no node ("`x` no es ninguno de los nodos"), a flow
that doesn't go to the next column ("Un flujo va de una columna a la
siguiente: `a` está en la columna 1 y `b` en la 3"; left out), a middle node
out of balance ("`web` recibe 940 y envía 900: lo que entra en un nodo del
medio sale de él"), more than 3 columns, 8 nodes or 12 flows, and the
accents.

## Text version

A list with one line per flow: "Lecturas → Lector web: 940 lecturas".

## In this site

`diagramas/sankey-guide-readings.json`, shown in `docs/diagrams/proportions.mdx`.
