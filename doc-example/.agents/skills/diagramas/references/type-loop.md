# Loop (`"type": "loop"`)

**Best for:** a cycle that really starts over, where each pass leaves
something in a shared centre: a flywheel, a writing cycle, a
build–measure–learn loop. The reader sees both motions at once: work going
round the ring, and what each pass writes back to the hub.

**Not for:** a path that ends or branches towards an outcome (use
`flowchart`), the states of one thing and what moves it (use `state`), steps
across people with handoffs (use `swimlane`), or a sequence that never returns
to its first step (a numbered list, or a `timeline`).

## The file

```json
{
  "type": "loop",
  "title": "El ciclo de escribir",
  "desc": "Escribir, validar, publicar, leer y preguntar, y vuelta a escribir",
  "steps": [
    { "id": "write", "name": "Escribir", "sub": "una página", "entity": "files/page" },
    { "id": "validate", "name": "Validar", "sub": "en el editor", "focal": true },
    { "id": "publish", "name": "Publicar", "sub": "push y sincronizar" },
    { "id": "read", "name": "Leer", "sub": "en el lector" },
    { "id": "ask", "name": "Preguntar", "sub": "ronda de preguntas" }
  ],
  "hub": { "id": "repo", "name": "Repositorio", "sub": "la única fuente", "page": "repository" },
  "writes": [0, 4]
}
```

| Key | What it is |
| --- | --- |
| `steps` | Required. 3 to 8 items (see [items.md](items.md)), clockwise from the top. |
| `hub` | Optional. One item in the centre: what accumulates with each pass. |
| `writes` | Optional. The steps that write to the hub, by position (0 is the first). Needs `hub`. |

## What the platform does

- Spaces the steps evenly on a ring, the first at the top, then clockwise.
  All steps get the same box size (the widest name decides, at least 120px).
- Joins each step to the next with an arrow along the ring, and the last back
  to the first: the loop always closes.
- Draws the hub as a store box in the centre, and grows the ring until every
  step stays well clear of it.
- Draws a dashed arrow from each step in `writes` straight to the hub. The
  legend ("Siguiente paso", "Escribe en el centro") appears only when there
  are writes.
- Steps and hub are boxes like a drawn diagram's: `focal`, `hue`, `sub`,
  `info` and links all work.

## What you decide

- **Is it really a loop?** If the last step doesn't lead back to the first,
  it is a flowchart drawn in a circle.
- **Order is meaning**: the first step is at the top, where the eye starts.
  Start with the step that triggers the cycle.
- **The hub is what grows**, a store or a record ("Repositorio", "Memoria
  compartida"), not a step. A loop without anything shared can drop the hub.
- **Only the steps that really write** go in `writes`. All of them writing is
  no signal.
- **One focal step**: the gate, the step where a person decides or where the
  loop most often breaks.

## Complexity budget

| Limit | Value |
| --- | --- |
| Steps | 3 to 8 |
| Hubs | 1 |
| Accent elements | 2 (focal steps and a focal hub) |

Over budget → an overview loop of phases, each detailed in its own diagram.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A cycle that never returns | The closing arrow lies; use a `flowchart` |
| Two things in the centre | Two shared states are two systems; draw two loops |
| Every step in `writes` | The spokes stop saying which steps leave something behind |
| Several focal steps | The gate the reader should see disappears |
| A hub that is a step ("Revisar") | The centre is state, not action |
| More than 8 steps | The ring crowds; split into overview and detail |

## Reported

Fewer than 3 steps ("Un ciclo tiene al menos 3 pasos"), more than 8, `writes`
without a hub ("Sin hub no hay centro en el que escribir"), a `writes` index
past the last step ("No hay ningún paso 7: van del 0 al 4"), and more than two
accents.

## Text version

The cycle on one line, back to the first ("Escribir → Validar → Publicar →
Leer → Preguntar → Escribir"), then "Centro: Repositorio" and "Escriben en
Repositorio: Escribir, Preguntar", with linked names linked.

## In this site

`diagramas/loop-writing.json`, shown in `docs/diagrams/concepts.mdx`.
