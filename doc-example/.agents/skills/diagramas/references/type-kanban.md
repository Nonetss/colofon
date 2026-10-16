# Kanban (`"type": "kanban"`)

**Best for:** a snapshot of work in progress by state: what is queued, what
is moving, what is stuck, and which column is over its limit. It is a
**census, not a flow**: no arrows at all. The reader asks "where is
everything, and where is it jammed?".

**Not for:** the flow between steps (use `swimlane` or `flowchart`), a plan
with dates (use `gantt`), the narrative of what a user does sliced into
releases (use `story-map`), or who owns what (use `org-chart`).

## The file

```json
{
  "type": "kanban",
  "title": "Las páginas de esta guía",
  "desc": "En qué estado está cada página de la guía",
  "columns": [
    { "name": "Por escribir", "cards": [{ "name": "Plantillas", "sub": "propuesta" }] },
    {
      "name": "Escribiendo",
      "limit": 2,
      "cards": [
        { "name": "Tipos de diagrama", "sub": "diagrams", "page": "diagrams" },
        { "name": "Catálogo en el lector", "page": "catalog/reader", "blocked": true }
      ]
    },
    { "name": "Publicada", "cards": [{ "name": "Componentes", "page": "pages/components" }] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `columns` | Required. Left to right: `name` (the state), `cards` (top to bottom, may be empty) and an optional `limit`, its work-in-progress limit (a whole number from 1). |
| `cards[]` | Each an item (see [items.md](items.md); no `id` needed), plus `blocked`: `true` marks it as stuck. |

## What the platform does

- Columns of equal width (192 px) side by side on a soft background, the name
  on the left of the header and a **count chip** on the right: «3», or «3 /
  2» against its limit, in the accent when the column is **over its limit**.
- Cards stack in the order written; a `sub` line goes under the name (a ticket
  id, an owner).
- A **blocked** card is drawn in the focal treatment with an accent bar on its
  left edge and the tag «Bloqueada».
- The legend appears only with blocked cards or an over-limit column:
  «Tarjeta», «Bloqueada», «Por encima del límite».

## What you decide

- **In-process columns have a `limit`**; the queue and the done column don't
  (they show a bare count). Without limits a board can't say it's jammed.
- **The accent is the problem**: one blocked card and one over-limit column
  are the whole budget. Each blocked card, each focal card and each column
  over its limit counts; don't add `focal` on top.
- **Cards are pieces of work**, not people; `sub` carries the id or owner
  («AVA-214 · nadia»).
- More cards than fit → one count card («+14 más») instead of listing them.
- Cap the done column at the last few; an unbounded «Hecho» is a second
  backlog.

## Complexity budget

| Limit | Value |
| --- | --- |
| Columns | 5 |
| Cards in one column | 4 |
| Cards | 12 |
| Accent elements | 2 (blocked and focal cards, over-limit columns) |

Over budget → aggregate the backlog into a count card, or split the board by
team.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Needing an arrow between cards | It's a flow: use `swimlane` or `flowchart` |
| Every blocked card marked, five of them | Accent everywhere reads as noise; the platform warns past two |
| One card per person | An org chart wearing a kanban skin |
| In-process columns without limits | Half the point of the type is showing where the limit breaks |
| Long card names | Names are measured against the card; the rest goes in `sub` or `info` |

## Reported

A column or card name that doesn't fit, the budget ("Un kanban lleva como
mucho 4 tarjetas en una columna y este tiene 6: pártelo en dos diagramas"),
and the accents.

## Text version

One line per column: "Escribiendo (2 / 2): Tipos de diagrama, Catálogo en el
lector (bloqueada)", with ", por encima del límite" after the count of a
column over it.

## In this site

`diagramas/kanban-guide.json`, shown in `docs/diagrams/time.mdx`.
