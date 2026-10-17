# Sequence (`"type": "sequence"`)

**Best for:** requests and responses between a few actors in time order:
protocols, API call traces, an auth flow with a branch, the reconstruction of
an incident. The reader follows the messages top to bottom and asks "who says
what to whom, and when?".

**Not for:** who does each step of a process (use `swimlane`: lanes, not
lifelines), the states of one thing (use `state`), dated events (use
`timeline`), or how components connect regardless of order (draw it by hand,
`drawn-architecture.md`).

## The file

```json
{
  "type": "sequence",
  "title": "De un push a la versión publicada",
  "desc": "Qué se dicen quien escribe, el servidor git, la plataforma y el lector",
  "actors": [
    { "id": "writer", "name": "Quien escribe" },
    { "id": "git", "name": "Servidor git" },
    { "id": "platform", "name": "Plataforma", "page": "publishing", "focal": true },
    { "id": "reader", "name": "Lector" }
  ],
  "messages": [
    { "from": "writer", "to": "git", "label": "git push" },
    { "from": "git", "to": "platform", "label": "aviso de push", "kind": "async" },
    { "from": "platform", "to": "git", "label": "git fetch" },
    { "from": "git", "to": "platform", "label": "commits nuevos", "kind": "return" },
    { "from": "platform", "to": "platform", "label": "valida el contrato" },
    { "from": "platform", "to": "reader", "label": "publica la versión", "kind": "accent" },
    { "from": "platform", "to": "writer", "label": "problemas en su página" }
  ],
  "fragments": [
    { "kind": "alt", "label": "sin errores de contrato", "first": 5, "last": 6, "else": 6 }
  ]
}
```

| Key | What it is |
| --- | --- |
| `actors` | Required. The actors, left to right, each an item with an `id` (see [items.md](items.md)). |
| `messages` | Required. Top to bottom: `from`, `to` (actor ids), `label` (required), `info`, and `kind`: `call` (default), `return` (dashed), `async` (no reply awaited, hollow head) or `accent` (the main path). `from` = `to` is a self-call. |
| `fragments` | Optional. Frames over consecutive messages: `kind` (`alt`, `opt`, `loop` or `par`), `label` (its condition), `first` and `last` (message indexes, from 0) and, in an `alt`, `else` (the message the other branch starts with). |

## What the platform does

- Each actor is a box on top with a **dashed lifeline** down to the bottom.
  The gap between two neighbours widens to fit the longest label of a message
  between them.
- Messages are horizontal arrows, 36 px apart, in the order written; a
  self-call is a short loop to the right, its label beside it.
- A fragment is a frame around its messages with its kind in a tab (`ALT`,
  `OPT`, `LOOP`, `PAR`), its `label` as `[condición]`, and for `else` a dashed
  divider marked `[ELSE]`. Room is made above each frame for its tab.
- Hovering an actor lights every message it sends or receives.
- The legend lists the message kinds used: «Llamada», «Respuesta», «Sin
  esperar respuesta», «Camino principal».

## What you decide

- **Labels are what travels**, lowercase and short (`git fetch`, `token
  válido`), not sentences; put the why in `info`.
- **Every call that gets an answer shows it** as `return`; an `async` message
  is one nobody waits for (an event, a notification).
- **Branches are fragments**, never two loose groups of arrows. One fragment
  is the default; `alt` has two branches, no more.
- **The accent is the headline message** (the success that matters) plus
  perhaps its actor. Never accent both branches of an `alt`.
- Order actors left to right by when they first act, so most arrows run
  rightwards and the eye doesn't zigzag.

## Complexity budget

| Limit | Value |
| --- | --- |
| Actors | 6 |
| Messages | 14 |
| Fragments | 3 (nested one level at most) |
| Accent elements | 2 (focal actors, and each headline path: `accent` messages joined end to end count once) |

Over budget → split into the happy path and the failure (or refresh) path, two
diagrams.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| If/else as two loose clusters of arrows | Use an `alt` fragment; the frame is the branch |
| An `alt` inside an `alt` | Two levels of logic; split the diagram |
| Calls with no `return` when one comes back | The reader can't tell sync from fire-and-forget |
| A fragment over actors that don't take part | The frame claims messages it doesn't hold |
| Lanes with steps instead of messages | That's a `swimlane` |

## Reported

A message naming an unknown actor ("`x` no es ninguno de los actores"; left
out); a fragment out of range ("Un fragmento va de un mensaje a otro
posterior que exista…"), an `else` outside it ("else es un mensaje dentro del
fragmento, después del primero"), one overlapping another without nesting
("Se solapa con el fragmento de fragments.0…"), one nested deeper than one
level ("Los fragmentos se anidan un nivel como mucho"), each left out; the
budget and the accents.

## Text version

A numbered line per message, "1. Quien escribe → Servidor git: git push",
with "[alt: sin errores de contrato]" before a fragment's first message and
"[else]" before its other branch; actor names linked.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/sequence-sync.json`, in its `diagrams/time` page.
