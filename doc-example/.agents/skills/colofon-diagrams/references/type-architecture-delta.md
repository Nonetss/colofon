# Architecture delta (`"type": "architecture-delta"`)

**Best for:** how a system changes between two states: a migration, a piece
extracted from another, an integration replaced, a new file that takes over a
job. Two drawn snapshots side by side, and the platform writes the list of
what was added, removed, changed, moved or rewired. The reader asks "what is
different, exactly?".

**Not for:** one snapshot (draw it by hand, `drawn-architecture.md`),
attribute changes with no change of shape (a table), more than two states or
the order of the migration steps (use `timeline` or `gantt`), or requests
over time (use `sequence`). A delta doesn't say how to migrate: downtime,
order and rollback need their own explanation.

## The file

```json
{
  "type": "architecture-delta",
  "title": "De la barra por carpetas a menu.yaml",
  "desc": "Qué cambia en un sitio cuando añade menu.yaml",
  "before": {
    "width": 392,
    "height": 312,
    "nodes": [
      { "id": "pages", "entity": "files/page", "x": 24, "y": 40, "w": 136, "h": 56 },
      { "id": "folders", "name": "Carpetas", "sub": "una sección cada una",
        "x": 24, "y": 140, "w": 136, "h": 56 },
      { "id": "sidebar", "name": "Barra lateral", "kind": "focal",
        "x": 232, "y": 140, "w": 136, "h": 56 }
    ],
    "edges": [
      { "from": "folders", "to": "sidebar", "kind": "accent",
        "points": [[160, 168], [232, 168]], "label": "SECCIONES", "at": [196, 158] }
    ]
  },
  "after": {
    "width": 392,
    "height": 312,
    "nodes": [
      { "id": "folders", "name": "Carpetas", "sub": "guardan las páginas",
        "x": 24, "y": 140, "w": 136, "h": 56 },
      { "id": "menu", "entity": "files/menu", "x": 232, "y": 40, "w": 136, "h": 56 }
    ]
  },
  "changes": [
    { "id": "menu", "note": "Agrupa carpetas y páginas de cualquier sitio, en el orden que diga" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `before` | Required. The system before: a whole drawn diagram's drawing (`width`, `height`, `nodes` and, when needed, `edges`, `zones`, `notes`), written as in `references/drawn.md`. |
| `after` | Required. The system after, **with the same id for every piece that stays**. |
| `changes` | Optional. `{ "id", "note" }`: why a piece changes, in one sentence; it goes in the list after that piece's entry. |

The pieces are a drawn diagram's boxes, not typed items: `items.md` doesn't
apply here; `references/drawn.md` does.

## What the platform does

- Each snapshot is read by the drawn form itself, then the two are laid out
  in three panels, «ANTES», «CAMBIOS», «DESPUÉS», with the change list in the
  middle.
- It compares **by box id and by connection** (an edge's `from` → `to`):

| Change | When | How it looks |
| --- | --- | --- |
| AÑADIDO | A box or connection only in `after` | A `+` chip on the box |
| QUITADO | A box or connection only in `before` | Box and arrow dashed in «Antes», `−` chip |
| CAMBIADO | A kept box whose name, `sub` lines, `kind`, `tag`, shape or `hue` differ | A `Δ` chip; the list says before → after |
| MOVIDO | A kept box that changes zone | A `↦` chip; the list names both zones |
| RECONECTADO | A connection between kept boxes that keeps one end and moves the other | Both arrows dashed; the list gives the old ends |

- A connection to a new box or from a removed one is not a rewire: it counts
  as removed plus added. Moving a box **within** the same zone is not a
  change.
- Unchanged pieces stay out of the list; with no change at all the middle
  says «Sin cambios». Hovering a piece lights it in both panels.

## What you decide

- **Copy `before`'s coordinates into `after`** and move only what the story
  needs: same size, same places, and the eye finds the change by itself.
- **Keep ids for pieces that survive**, even renamed (that's a CAMBIADO). A
  replacement is a new id: removed plus added.
- **Write a `changes` note for the pieces that need a why**, not for all.
- Each snapshot has its own two accents (it is a drawn diagram); use them on
  the piece the change is about, in both panels.
- Several subsystems changing → one delta per subsystem.

## Complexity budget

| Limit | Value |
| --- | --- |
| Distinct pieces (a kept id counts once) | 8 |
| Distinct connections | 10 |
| Changes in the list | 8 (a box changed and moved counts two) |
| Accent elements | 2 per snapshot |

Over budget → split by subsystem or by phase; never drop connections to fit.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Two snapshots laid out independently | Kept boxes drift and the reader sees moves that didn't happen |
| A new id for a piece that only changed | It reads as removed and added; the continuity is lost |
| A delta where only attributes change | A table says it in less space |
| Notes on every piece | The list drowns; note only the why that isn't obvious |
| Using it as a migration plan | It shows two states, not the steps or their order |

## Reported

Each snapshot's problems as in any drawn diagram, under its path
(`before.nodes.0.entity: …`); without either snapshot nothing is drawn
("before: Falta: es obligatorio"). A snapshot key that isn't a drawn
diagram's, a `changes` id that is no box ("`x` no es ninguna caja de before
ni de after"), the budget ("Un diagrama de antes y después lleva como mucho 8
piezas…") and, per snapshot, more than two accents.

## Text version

One line per change, "AÑADIDO: menu.yaml. Agrupa carpetas y páginas…",
"CAMBIADO: Carpetas (líneas: una sección cada una → guardan las páginas)",
"RECONECTADO: A → B (antes A → C)", ending with "SIN CAMBIOS: …" listing the
pieces that stay the same.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/architecture-delta-menu.json`, in its `diagrams/comparison` page.
