# Flowchart (`"type": "flowchart"`)

**Best for:** decision logic and routing: "should I…?" questions, where
something belongs, triage, onboarding paths. The reader follows one path from
a start to an outcome, answering questions on the way.

**Not for:** who does each step (use `swimlane`), what state a thing is in and
what moves it (use `state`), messages between actors over time (use
`sequence`), or a plain list of steps with no decision (write a numbered list,
or a drawn diagram's chain).

## The file

```json
{
  "type": "flowchart",
  "title": "Dónde va cada cosa",
  "desc": "Qué preguntarse ante algo que contar",
  "steps": [
    { "id": "start", "name": "Tengo algo que contar", "kind": "start" },
    { "id": "repeats", "name": "¿Se repite con los mismos campos?", "kind": "decision" },
    { "id": "entity", "entity": "files/entity" },
    { "id": "connects", "name": "¿Cuenta cómo se conectan?", "kind": "decision" },
    { "id": "diagram", "entity": "files/diagram-file", "focal": true },
    { "id": "page", "entity": "files/page" }
  ],
  "links": [
    { "from": "start", "to": "repeats" },
    { "from": "repeats", "to": "entity", "label": "SÍ" },
    { "from": "repeats", "to": "connects", "label": "NO" },
    { "from": "connects", "to": "diagram", "label": "SÍ", "kind": "accent" },
    { "from": "connects", "to": "page", "label": "NO" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `steps` | Required. The steps, each an item (`id`, `name`, `sub`, `info`, `hue`, `focal`, `entity` or `page`; see [items.md](items.md)) with an `id`, plus `kind`: `step` (default, a rectangle), `start` or `end` (a pill), `decision` (a diamond) or `io` (a parallelogram, data in or out); and `row`, `col` (from 0) to pin a step by hand. |
| `links` | Optional. `{ from, to, label?, kind?, info? }` between step ids; `kind` is `default`, `accent` (the main path) or `dash`. |

## What the platform does

- A step's **row** is its longest distance from a `start` step (or from the
  first step), unless it gives `row`; its **column** is its place in that row,
  ordered to reduce crossings and centred under the longest row, unless it
  gives `col`.
- Links run at **right angles through the gutters** between rows and columns
  and never cross a step. A link far to one side leaves from the step's side;
  one to an earlier row goes **round the right side, dashed** unless it says
  its `kind`.
- A label goes on the link's first long horizontal stretch, or beside its
  first segment.
- The legend lists the step kinds and link kinds the chart uses.

## What you decide

- **Decisions are questions**, ending in `?`, and their exits are the answers
  in short capitals (`SÍ`, `NO`, `MÁS DE 3`). Two or three exits, never more.
- **One start.** Several entry points are several charts.
- **Outcomes are the leaves**: a step with no outgoing link. Make the one the
  reader is looking for `focal`, and the path to it `accent`.
- When the automatic placement reads badly (a long back link, two branches
  crossing), pin the offending steps with `row` and `col`; don't add dummy
  steps.

## Complexity budget

| Limit | Value |
| --- | --- |
| Steps | 12 |
| Links | 16 |
| Exits per decision | 3 |
| Accent elements | 2 (focal steps, and each run of joined accent links) |

Over budget → split by the first decision: an overview chart whose outcomes
are the entry points of detail charts.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A decision that is not a question ("Validación") | The reader can't tell what the exits answer |
| Exit labels that are sentences | Labels are what is chosen, short; the reason goes in `info` |
| Every outcome `focal` | Focus is for the one outcome the page is about |
| A flowchart with no decision | It is a list; write it as one |
| Back links everywhere | A chart that loops is a `state` machine or a `loop` |

## Reported

A step without `id`, a link to an id that is no step (the link is left out), a
decision with more than three exits, the budget and the accents. Everything
valid is still drawn.

## Text version

One line per link, in order: "Tengo algo que contar → ¿Se repite con los
mismos campos?", "… → Entidad: SÍ", with linked names linked.

## In this site

`diagramas/flowchart-where-it-goes.json`, shown in `docs/diagrams/graphs.mdx`.
