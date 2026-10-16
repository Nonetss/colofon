# Story map (`"type": "story-map"`)

**Best for:** Jeff Patton's user story map: what a person does, as a
backbone of activities in narrative order left to right, the stories under
each activity, and **where the first release is cut**. The reader asks "what
is the whole story, and what ships first?".

**Not for:** work by state (use `kanban`: its columns are states, not
narrative), how one person feels across stages (use `journey`), a plan with
dates (use `gantt`), or a backlog with no release to cut (a list or an
`<Entities>` table).

## The file

```json
{
  "type": "story-map",
  "title": "Lo que necesita quien lee",
  "desc": "Qué hace quien lee esta documentación y qué sale en la primera entrega",
  "activities": [
    { "id": "find", "name": "Encontrar" },
    { "id": "read", "name": "Leer" },
    { "id": "reuse", "name": "Reutilizar" }
  ],
  "releases": ["Primera entrega", "Después"],
  "cut": "Primera entrega",
  "stories": [
    { "name": "La barra lateral", "activity": "find", "release": "Primera entrega", "entity": "files/menu" },
    { "name": "Buscar", "activity": "find", "release": "Después" },
    { "name": "Los diagramas", "activity": "read", "release": "Primera entrega", "entity": "components/diagram" },
    { "name": "llm.txt para agentes", "activity": "reuse", "release": "Primera entrega", "focal": true }
  ]
}
```

| Key | What it is |
| --- | --- |
| `activities` | Required. The backbone, left to right, each an item with an `id` (see [items.md](items.md)). |
| `releases` | Required. The release names, first to last, each once. |
| `stories` | Required (may be empty). Each an item (no `id` needed) with `activity` (an activity id) and `release` (a name from `releases`). |
| `cut` | Optional. The release the cut goes under: what ships first. |

## What the platform does

- The backbone is a row of activity cards (168 px wide), each tagged
  «Actividad 1», «Actividad 2»… in the order written.
- Under it, **one band per release**, top to bottom, its name in capitals in
  the left margin, alternate bands shaded. Each story sits in its activity's
  column, stacked in the order written; a band is as tall as its fullest
  cell.
- The **cut** is a bold accent line under its release's band, labelled
  «CORTE DE ENTREGA». It counts as one accent.
- The legend shows «Actividad», «Historia» and, with a cut, «Corte de
  entrega».

## What you decide

- **Activities in narrative order**, the order the person lives them, never by
  priority. Verbs work well («Encontrar», «Leer»).
- **Stories are outcomes the person sees** («Buscar»), not engineering tasks
  («Refactorizar el índice»).
- **Releases are scopes, not dates**: «Primera entrega», «Después», «Más
  adelante». Three at most; beyond that nobody believes the order.
- **Always set `cut`**: a map without a cut is a backlog in a grid. With the
  cut there is room for **one** focal story, the riskiest one.
- One persona per map.

## Complexity budget

| Limit | Value |
| --- | --- |
| Activities | 5 |
| Releases | 3 |
| Stories | 12 |
| Stories in one activity and release | 4 |
| Accent elements | 2 (the cut, focal stories and focal activities) |

Over budget → one map per activity, or collapse a release into a count card.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| No `cut` | Nothing is decided; it's a backlog |
| Activities ordered by priority | The backbone is a story told left to right |
| Releases named by quarter | Scope drifts from the calendar the moment it slips |
| State columns («Hecho», «En curso») | That's a `kanban` |
| Two personas on one map | Their stories mix; one map each |

## Reported

A story whose activity or release doesn't exist ("`x` no es ninguna de las
actividades", "`x` no es ninguna de las entregas (…)"; left out), a repeated
release ("`x` ya es otra entrega"), a `cut` that is no release, a name that
doesn't fit its card, the budget and the accents.

## Text version

One entry per release with a line per activity that has stories in it,
"Encontrar: La barra lateral", then "Corte de entrega tras Primera entrega".

## In this site

`diagrams/story-map-reader.json`, shown in `docs/diagrams/time.mdx`.
