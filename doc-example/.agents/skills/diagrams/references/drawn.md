# Drawn by hand (no `type`)

**Best for:** pictures where *where each piece sits* carries the meaning: an
architecture, a deployment, a data platform, a data model, a UML class
diagram. You place every box, arrow and zone in pixels; the platform moves
nothing, it only checks and draws it with its look, in light or dark.

**Not for:** anything whose pieces follow a rule (decisions, a tree, events
in time, values): use its `type` and let the platform place them, check the
budget and write a real text version. A figure with no pieces and
connections (an exploded view, a floor plan) is an
[illustration](illustration.md).

Pick the recipe for what you are drawing before planning coordinates:
[architecture](drawn-architecture.md), [high-level](drawn-high-level.md),
[IT current state](drawn-it-state.md), [data flow](drawn-data-flow.md),
[data platform integration](drawn-dp-integration.md),
[deployment](drawn-deployment.md), [medallion](drawn-medallion.md),
[nested](drawn-nested.md), [ER](drawn-er.md),
[database schema](drawn-db-schema.md), [UML class](drawn-uml-class.md).

## The file

```json
{
  "title": "Cómo despliega Komodo",
  "desc": "Komodo le dice a Periphery, en cada servidor, que levante los stacks",
  "width": 640,
  "height": 152,
  "zones": [
    { "id": "home", "x": 16, "y": 16, "w": 424, "h": 120, "label": "CASA", "hue": "teal" }
  ],
  "nodes": [
    { "id": "komodo", "name": "Komodo", "kind": "focal", "tag": "Núcleo",
      "x": 40, "y": 48, "w": 160, "h": 72, "zone": "home" },
    { "id": "periphery", "name": "Periphery", "sub": "agente en cada servidor",
      "x": 256, "y": 48, "w": 160, "h": 72, "zone": "home", "needs": ["komodo"] },
    { "id": "stacks", "name": "Stacks", "kind": "store", "shape": "cylinder",
      "x": 480, "y": 48, "w": 140, "h": 72 }
  ],
  "edges": [
    { "from": "komodo", "to": "periphery", "kind": "accent",
      "points": [[200, 84], [256, 84]], "label": "DEPLOY", "at": [228, 74] },
    { "from": "periphery", "to": "stacks", "points": [[416, 84], [480, 84]] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `title`, `desc` | Required. The title, and one or two sentences of what it shows: the alt text and what agents read. |
| `width`, `height` | Required, > 0. The drawing; the legend goes **under** `height`, outside it. |
| `nodes` | Required, at least one. The boxes (below). |
| `edges` | Arrows, self-loops and badges (below). |
| `zones` | `{ id?, x, y, w, h, label, hue? }`: titled rectangles that group boxes. |
| `notes` | `{ x, y, text, anchor? }`: loose text, baseline at `y`, `anchor` `start` (default), `middle` or `end`. Drawn under the boxes and **not** in the text version. |
| `kindNames`, `edgeNames`, `badgeName` | What the legend calls each box kind, arrow kind and the badges in this diagram. |
| `shapes` | A shape for every box of a kind without its own: `{ "store": "cylinder" }`. The legend draws that kind in that shape. |
| `colorEdges` | `true`: each default arrow without its own `hue` takes the hue of its `from` box. |
| `$schema` | Allowed, for the editor. Any other key is reported. |

Keys are English; names, tags, labels, `info` and notes are Spanish.

## Boxes

Every box has `x`, `y`, `w` and `h` (top-left corner, pixels). Then:

| Key | What it is |
| --- | --- |
| `id` | What arrows (`from`, `to`), `needs` name. Lowercase, digits, single hyphens. |
| `kind` | `focal` (the central piece, accent), `service` (default), `store` (data or destination), `input` (user or origin), `external`, `optional` (unused or planned, dashed). |
| `tag` | A small framed label on top, shown in capitals (`Núcleo`, `Pod`, `Tabla`). |
| `name` | The name. With `entity` it defaults to the entity's name; without both, the `id`. |
| `sub` | One line, or a list of lines, under the name (mono, smaller). |
| `shape` | `pill` (where people come in), `cylinder` (where data ends up), `diamond` (a decision; the rhombus touching the middle of each side), `circle` (start, end or state; the circle that fits, so make `w` = `h`), `rounded` (a state, corners of `h/3`). Default: a rectangle. |
| `hue` | `rose`, `blue`, `cyan`, `violet`, `green`, `indigo`, `fuchsia`, `slate`, `teal`, `lime`. Without it, its zone's. A hue tints the tag, the badges pointing at the box and, with `colorEdges`, its arrows; it is grouping, not emphasis. |
| `zone` | The id of the zone it sits in. It does not move the box: place it inside yourself. |
| `info` | The card shown on hover. The long explanation goes here, not in `name`. |
| `trace` | `true` on an origin: hovering lights everything it reaches along `accent` arrows. |
| `needs` | Ids of the boxes it depends on; hovering a box lists everything that falls with it. |
| `entity` | `<type>/<id>` of a catalog entity: takes its name, links to its page, and that page lists the diagram. **Use it whenever the piece exists in the catalog.** |
| `page` | Otherwise, a page path of the site (`publishing`, `network/dns`) it links to. |

**Tables.** A box with `rows` is a table and takes **no `h`**: its height is
`36 + 14·rows (+14 with more) (+10 + 14·ops) + 6`. Each row is
`{ "key"?, "name", "type"? }`: the key (`PK`, `FK`, `UQ`, `+`, `-`) in a
narrow column at the left (`PK` highlighted), the name, the type right-aligned.
`more` adds a last line ("+ 8 columnas más"). `ops`, a second list of rows,
goes under a hairline: a UML class's operations; `ops` without `rows` is
reported. A table's tag sits at its top right. Row *i*'s baseline is
`y + 46 + 14·i`, so its middle is about **`y + 42 + 14·i`**: that is where an
arrow attaches to a column.

## Arrows

| Key | What it is |
| --- | --- |
| `points` | `[[x, y], …]`, at least two: where the line runs. It starts on the `from` box's edge and ends on the `to` box's edge (the head is drawn there, pointing along the last segment). |
| `from`, `to` | Box ids. Or `toZone`: a zone id, for an arrow into a whole zone (not with `to`). |
| `route` | `orthogonal` (default): only horizontal and vertical segments, corners rounded by 8 px. `curve`: a smooth curve through the points, diagonals allowed. |
| `kind` | `default`, `accent` (the main path) or `dash` (optional, async or a warning). |
| `label`, `at`, `anchor` | What **travels** along it, short, in capitals (`SQL`, `GIT PUSH`); `at` is the label's baseline point; `anchor` `middle` (default), `start` or `end`. A label without `at` is dropped and reported. |
| `head` | `arrow` (default), `triangle` (hollow: inheritance), `diamond` (filled: composition), `open-diamond` (hollow: aggregation). `noHead: true`: no head. |
| `hue`, `info` | A default arrow's own colour (accent and dash ignore it); the hover card. |

- **Self-loop:** `from` equal to `to` and no `points`. It leaves the top
  edge 24 px from the right corner, rises 20 px, runs 20 px past the right
  edge and comes back in near the top; its label goes at the right, no `at`
  needed. Leave about 28 px free above the box and the label's width to its
  right.
- **Badge:** an edge with `badge` and no `points` is no line: a small chip
  with that text at the top right of the `from` box, in the hue of the `to`
  box (chips stack leftwards, 3 px apart). Use it for a connection to a far
  piece (`SSO`, `BACKUP`) instead of an arrow across the whole drawing.
  `from` and `to` must both be boxes; `from` = `to` is allowed (a replica
  count `×3`). The legend gets one entry for all badges ("Conexión con una
  pieza lejana", or `badgeName`).
- **Heads at the right end:** the head is always at the last point. For
  UML, inheritance runs child → parent, composition and aggregation run
  part → owner (the diamond sits at the owner).

## Chains

A row of boxes joined left to right needs no coordinates:

```json
{
  "title": "Copias",
  "desc": "De la máquina al PBS y de ahí a la nube",
  "items": [
    { "id": "vm", "name": "VM" },
    { "id": "pbs", "name": "PBS", "kind": "store" },
    { "id": "cloud", "name": "Nube", "kind": "external" }
  ],
  "links": ["SNAPSHOT", null],
  "accent": [0]
}
```

`items` are boxes without `x`/`y` (every box key works, `w` optional);
`links` is the label of each arrow or `null`; `accent` and `dash` list which
arrows (0 is the first) take that kind; `y` and `h` are the row's top and
height (40 and 72). The first box starts at x 24; each is as wide as its
longest line plus 32 (at least 120, on the 4 px grid); each gap is 48 px, or
the label's width plus 32; the drawing is sized to fit. No zones, notes or
free edges: when you need them, write `nodes`.

## Planning coordinates

1. **Sketch the grid first.** Decide columns and rows, and the flow
   direction (left → right, or top → down) and hold it. Every coordinate a
   multiple of 4; equal boxes in a column share `x` and `w`.
2. **Size boxes from their text.** The platform measures with fixed
   advances:

   | Text | Width per character | Must fit in |
   | --- | --- | --- |
   | `name` (12 px sans) | 0.58 × 12 ≈ **7 px** | `w − 16` |
   | `sub` line (9 px mono) | 0.62 × 9 ≈ **5.6 px** | `w − 16` |
   | `tag` chip | ≈ 4.9 px + 12 | the top row, beside the badges |
   | badge chip | ≈ 4.9 px + 10 | from the right corner leftwards, clear of the tag |
   | arrow label (8 px mono, tracked) | ≈ 5.4 px + 8 of mask | its segment |
   | zone title (8 px mono, tracked) | ≈ 6.1 px + 8 of mask | the zone's top-left |
   | table name | 7 px (+ tag + 8) | `w − 24` |
   | table row | 40 + name × 5.6 + 8 + type × 5 | `w − 20` |

   So a 200 px box holds a 26-character name and 32-character sub lines; a
   160 px box, 20 and 25. A diamond, circle or pill is measured as its box,
   but its inside is narrower: keep a diamond's name to half its `w`.
3. **Heights.** The text block (name 12 px, then 15 px per sub line) is
   centred under the tag row (18 px) and, in a cylinder, its 8 px lid. Name
   only: `h` 40–48. Name + one sub: 48–56. Tag + name + sub: 72. Tag + name
   + three subs: 104.
4. **Gutters.** Between columns leave the widest label on that gap plus
   16 (48 px for an unlabelled arrow, 64–88 for a labelled one). An arrow
   head is 10–16 px long and a rounded corner takes 8 px from each segment:
   keep the last segment ≥ 24 px and others ≥ 16.
5. **Zones** wrap their boxes with 24 px at the sides, **32 px at the top**
   (the title sits at `x + 12`, baseline `y + 18`, on a mask) and 16 at the
   bottom. Leave 16–40 px between zones. Arrows may cross zone frames;
   titles are drawn over arrows.
6. **Arrows** leave and enter at side midpoints: right → left for
   horizontal flow, bottom → top for vertical. A mostly vertical connection
   uses the top or bottom edge, not a side. Fan several arrows on one edge
   at least 16 px apart. Forward goes orthogonal; **curves are for what goes
   back**.
7. **Labels** sit 10 px above a horizontal segment (`at` = `[middle, y −
   10]`) or 12 px right of a vertical one (`[x + 12, middle]`, `anchor:
   "start"`), on a stretch longer than the label. The mask covers 9 px above
   the baseline and 3 below.
8. **Size the drawing** to the farthest box or zone plus 16. The legend
   adds about 60 px under `height` (22 more per wrapped row).

Draw order, bottom to top: zones, arrows, zone titles, labels, notes, boxes,
badges, legend. A box hides any arrow under it: route around boxes.

## Accent

Each `focal` box counts once and each run of `accent` arrows joined end to
end counts once; **more than two** is reported ("Como mucho 2 elementos van
en el color de acento y este diagrama tiene 3: …"). This is the only budget
the platform checks on a drawn diagram; each recipe's budget is advice.

## Reported

On the file with its field path (`edges.3.points`) and on every page showing
it; everything valid is still drawn.

| Problem | Message (Spanish, as reported) | What is kept |
| --- | --- | --- |
| Unknown key | `` `colour` no es una clave de un diagrama (…) `` | The rest |
| Box without `h` and without `rows` | `nodes.1.h: Falta: una caja que no es una tabla lleva h` | Box dropped |
| Duplicate id | `` `api` ya es el id de otra caja `` (or `zona`) | Second loses its id |
| Unknown entity / page / zone / `needs` | `` `files/x` no es ninguna entidad del catálogo ``, `` `x` no es ninguna de las zonas ``… | Box, without it |
| `ops` without `rows` | `ops va bajo las filas de una tabla: lleva rows` | Box, without ops |
| Arrow to an unknown box | `` edges.1.to: `zz` no es ninguna de las cajas `` | Line, unlinked |
| Both `to` and `toZone` | ``Lleva `to` o `toZone`, no los dos`` | `to` |
| No `points` (not a loop or badge) | `Falta: una flecha lleva points, o badge` | Dropped |
| Diagonal without `route: "curve"` | `edges.0.points: tramo en diagonal 100,20 → 200,40` | Dropped |
| `label` without `at` | `Una etiqueta (label) necesita at: dónde va` | Line, no label |
| Badge with `points`, or without both ends | `Una insignia (badge) no lleva points…` / `…lleva from y to…` | Chip / dropped |
| Text that doesn't fit | `nodes.0: "Un nombre bastante largo" (167px) no cabe en 100px`, `la columna "x" no cabe en 160px` | Drawn overflowing |
| Badges over the tag | `las insignias de "API" no caben junto a su etiqueta` | Drawn overlapping |
| Accents | see above | Drawn |

## Text version

Under the drawing, for screen readers and `llm.txt`: one line per zone with
an `id` and boxes in it ("SERVICIOS: API, Tareas"), then one line per arrow
with both ends ("API → PostgreSQL: SQL"; a badge reads "API → API: ×3"; a
`toZone` arrow names the zone). Linked boxes are links. **Not in it:** tags,
sub lines, table rows, notes, `info`, and any box outside every zone with no
arrow. So give every box a zone or an arrow, and say in `desc` what only the
picture shows.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/pipeline.json` (zones, focal, an accent run, `trace`, `needs`),
`diagrams/repository.json` (entities as boxes, `kindNames`),
`diagrams/sync-shapes.json` (shapes, a self-loop, a curve back) and
`diagrams/diagram-forms.json` (tables with `ops`, `triangle` heads), in its
`diagrams/drawn` page.

The look of kinds and hues is in [style.md](style.md); checking a diagram, in
[checking.md](checking.md).
