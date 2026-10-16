# Wardley map (`"type": "wardley"`)

**Best for:** the components of a value chain placed by how visible they are
to the user and how evolved (commoditised) each one is, so the reader sees
what to build, what to buy, and what is about to move. A strategy picture.

**Not for:** how components talk at runtime (draw an architecture by hand,
`drawn-architecture.md`), what depends on what with no notion of maturity (use
`dependency`), or a two-criteria ranking of unrelated things (use `quadrant`).

## The file

```json
{
  "type": "wardley",
  "title": "La cadena de publicar documentación",
  "desc": "Lo que hay entre una página escrita y quien la lee",
  "components": [
    { "id": "lector", "name": "Lector", "visibility": 96, "evolution": 62 },
    { "id": "paginas", "name": "Páginas", "entity": "files/page", "visibility": 78, "evolution": 42 },
    { "id": "diagramas", "name": "Diagramas tipados", "page": "diagrams", "visibility": 60, "evolution": 18 },
    { "id": "plataforma", "name": "Plataforma doc", "visibility": 36, "evolution": 58 },
    { "id": "git", "name": "Git", "visibility": 16, "evolution": 88 }
  ],
  "links": [
    { "from": "lector", "to": "paginas" },
    { "from": "paginas", "to": "diagramas" },
    { "from": "diagramas", "to": "plataforma" },
    { "from": "plataforma", "to": "git" }
  ],
  "moves": [{ "id": "diagramas", "to": 56 }]
}
```

| Key | What it is |
| --- | --- |
| `components` | Required. Each an item (see [items.md](items.md)) with a required `id`, plus `visibility` (0 invisible to the user, 100 what the user sees) and `evolution` (0 to 100, a quarter per stage: Génesis 0–24, A medida 25–49, Producto 50–74, Commodity 75–100). |
| `links` | Optional. Dependencies `{ "from", "to" }`: `from` depends on `to`. |
| `moves` | Optional. `{ "id", "to" }`: the evolution a component is heading to. |

## What the platform does

- Draws the frame with `VISIBLE` at the top of the left edge and `INVISIBLE`
  at the bottom, the x axis split by dashed rules into the four stages, named
  in capitals underneath. The y axis has no numbers.
- Places each component as a ringed dot, its name above (or below, right,
  left: the first spot that overlaps nothing).
- Draws each link as a straight muted line between the dots.
- Draws each move as a horizontal dashed accent arrow from the dot to its
  `to`; the moving component's dot and name go in the accent too.
- The legend shows "Componente", plus "Depende de" and "Evoluciona" when the
  map has links or moves. The hover card gives the stage and `info`; `sub` is
  not drawn.

## What you decide

- **Anchor the chain on the user**: the top component is who the chain
  serves, everything else is something it needs, further down.
- **Place by stage, not by score.** Decide which of the four stages a
  component is in, then put it inside that quarter; the exact number within
  it only spreads the dots.
- **Every component is in the chain**: it depends on something or something
  depends on it. A loose dot is not part of the map.
- **Moves are the point of the map.** One or two, for what is actually
  shifting, explained in `desc` or the component's `info`.

## Complexity budget

| Limit | Value |
| --- | --- |
| Components | 9 |
| Dependencies | 12 |
| Moves | 2 |
| Accent elements | 2 (each move, plus focal components not moving) |

Over budget → map one part of the chain (from the user down to one branch) and
leave the rest for a second map.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A move to the left | Evolution only goes towards commodity; the platform rejects it |
| A component with no link | It isn't part of the value chain; drop it or wire it in |
| Using it as an architecture | It says nothing about requests or protocols, only maturity |
| Evolution as a precise score ("62,5") | The stages are qualitative; place in a quarter |
| More than two moves | It stops making one point and becomes a forecast |
| A move and a `focal` on two other components | Three accents; the reader doesn't know where to look |

## Reported

A component without `id`, `visibility` or `evolution` (left out), a
coordinate out of range ("Va de 0 a 100"), a link or move naming no component
("`x` no es ninguno de los componentes"), a move backwards ("Un componente
solo evoluciona hacia commodity: to va a la derecha de su evolution"), a label
that can't be placed, the budget and the accents.

## Text version

One line per component with its stage and visibility in words ("Diagramas
tipados: Génesis, visibilidad media; evoluciona hacia Producto"; visibility is
alta from 67, media from 34, baja below), then one line per link ("Páginas
depende de Diagramas tipados").

## In this site

`diagramas/wardley-publishing.json`, shown in `docs/diagrams/concepts.mdx`.
