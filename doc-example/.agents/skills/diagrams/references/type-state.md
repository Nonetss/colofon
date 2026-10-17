# State machine (`"type": "state"`)

**Best for:** the finite states of one thing and what moves it between them:
the life of a page, a sync's status, a job queue, a review, a connection.
The reader asks "where can it go from here, and what makes it go?".

**Not for:** a path of decisions to an outcome (use `flowchart`), messages
between actors over time (use `sequence`), dated events (use `timeline`), or a
process split among people (use `swimlane`). A cycle with no states, only
stages that feed each other, is a `loop`.

## The file

```json
{
  "type": "state",
  "title": "La vida de una página",
  "desc": "Cómo pasa una página de tu copia al lector y de vuelta",
  "states": [
    { "id": "draft", "name": "Sin publicar", "initial": true },
    { "id": "published", "name": "Publicada", "focal": true, "page": "publishing" },
    { "id": "removed", "name": "Retirada", "final": true, "row": 1, "col": 1 },
    { "id": "warned", "name": "Con avisos" }
  ],
  "transitions": [
    { "from": "draft", "to": "published", "label": "PUSH" },
    { "from": "published", "to": "published", "label": "PUSH" },
    { "from": "published", "to": "warned", "label": "PUSH CON ERRORES" },
    { "from": "warned", "to": "published", "label": "CORRIGES" },
    { "from": "published", "to": "removed", "label": "BORRAS" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `states` | Required. The states, each an item with an `id` (see [items.md](items.md)), plus `initial` (`true`: where it starts), `final` (`true`: a state it ends in), and `row`, `col` (from 0) to pin a state by hand. |
| `transitions` | Optional. `{ from, to, label?, kind?, info? }` between state ids; `label` is what fires it, written `evento [guarda] / acción` with the parts you don't need left out; `kind` is `default`, `accent` (the main path) or `dash`. |

## What the platform does

- Laid out like a flowchart: a state's **row** is its longest distance from
  the `initial` states (or from the states no transition reaches), its
  **column** its place in that row, ordered to reduce crossings, unless it
  gives `row` or `col`.
- Every state is a **rounded rectangle**. An `initial` state gets a filled dot
  above it with a short arrow in; a `final` one a short line down into a
  ringed dot.
- Transitions run at right angles through the gutters; one back to an earlier
  row goes round the side and **keeps its own `kind`** (unlike a flowchart, it
  is not dashed for you). A transition from a state to itself is a **loop over
  its top right corner**, its label beside it.
- The legend shows «Estado», and «Inicio», «Fin», «Camino principal»,
  «Opcional» when used.

## What you decide

- **Every transition is labelled** with its trigger: the event in capitals
  (`PUSH`, `BORRAS`), and a guard or action only when it changes the meaning
  (`PUSH [CON ERRORES]`). An unlabelled transition hides the whole point.
- **States are nouns or participles** («Publicada», «Con avisos»), not
  actions; actions are the labels.
- **One `initial` state.** Mark `final` only on states nothing leaves.
- The accent goes on the state the reader should notice (the happy outcome or
  the error state), and at most the transition that leads there.
- A transition "from any state" (a timeout, a delete) drawn from every state
  turns the chart into a mesh: draw it once from the most typical state and
  say "desde cualquier estado" in its `info`.
- When placement reads badly, pin states with `row` and `col` (the example
  pins «Retirada» under «Con avisos»).

## Complexity budget

| Limit | Value |
| --- | --- |
| States | 8 |
| Transitions | 14 |
| Accent elements | 2 (each focal state, and each run of joined accent transitions) |

Over budget → it is probably two machines: a parent with the main states, and
the detail of one state's sub-states in another diagram.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Unlabelled transitions | The reader can't tell what moves the thing |
| More transitions than twice the states | Two machines tangled into one |
| States named as actions («Publicar») | Mixes the states with what moves between them |
| No `initial` state | The ranking starts from wherever no arrow arrives; the reader has no entry |
| A state machine with one path and no loops | It is a list of steps, or a `timeline` |

## Reported

A state without `id`, a transition to an id that is no state ("`x` no es
ninguna de las partes del diagrama"; the transition is left out), the budget
("Una máquina de estados lleva como mucho 8 estados y este tiene 10: pártelo
en dos diagramas") and the accents. Everything valid is still drawn.

## Text version

One line per transition, in order: "Sin publicar → Publicada: PUSH",
"Publicada → Publicada: PUSH", with the state names linked.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/state-page-lifecycle.json`, in its `diagrams/graphs` page.
