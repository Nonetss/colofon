# IT current state (drawn)

**Best for:** the *before* picture of a change: today's landscape grouped by
department or phase (recogida → proceso → difusión), with the hand-offs
labelled by what moves (`CSV`, `EXCEL`, `EMAIL`, `COPIA`) and the pain
points flagged. It shows the friction a proposal is going to remove.

**Not for:** the target platform (draw it as
[dp-integration](drawn-dp-integration.md) or
[high-level](drawn-high-level.md)); the before and after in one picture
(`architecture-delta`); who does each step of a process (`swimlane`); a
list of problems (a list, or a `fishbone` if they share one effect).

## Composition

- **Zones are departments or phases**, two to four, in one orientation
  (columns left → right, or rows top → down) for every zone.
- **Boxes are today's tools and stores**, with what they really are in
  `sub` (`CAPI · PostgreSQL`, `SPSS · Excel`). Systems owned by someone else
  are `external`.
- **The pain points are the accent:** the one or two headline problems are
  `focal`. With two focal boxes the accent is spent, so **no `accent`
  arrows**. A lesser problem gets a `hue` (`rose`) and a `tag` that names it
  (`Manual`, `Sin copia`): a hue tints the tag, which is what makes it show.
- **Arrows are hand-offs**, each labelled with the file or channel that
  moves; `dash` for informal or occasional ones (a loose Excel, a copy).
  Backward arrows only to or from an `external` box, and dashed.
- **Rename the legend** for the story: `"kindNames": { "focal": "Punto
  débil" }`, `"edgeNames": { "default": "Fichero" }`.
- Put the *why it hurts* in `info` on the focal boxes; the label stays a
  word.

## Skeleton

```json
{
  "title": "Cómo se publican hoy las estadísticas",
  "desc": "Los datos pasan de mano en mano en ficheros hasta un portal que se actualiza a mano: la carpeta compartida y el portal son los dos puntos débiles",
  "width": 784,
  "height": 224,
  "zones": [
    { "id": "collect", "x": 16, "y": 16, "w": 224, "h": 192, "label": "RECOGIDA" },
    { "id": "process", "x": 280, "y": 16, "w": 224, "h": 192, "label": "PROCESO" },
    { "id": "publish", "x": 544, "y": 16, "w": 224, "h": 192, "label": "DIFUSIÓN" }
  ],
  "nodes": [
    { "id": "survey", "name": "Encuestas", "sub": "CAPI · PostgreSQL", "x": 40, "y": 48, "w": 176, "h": 56, "zone": "collect" },
    { "id": "registry", "name": "Registro civil", "sub": "de otro organismo", "kind": "external",
      "x": 40, "y": 136, "w": 176, "h": 56, "zone": "collect" },
    { "id": "drive", "name": "Carpeta compartida", "sub": "sin control de versiones", "kind": "focal",
      "x": 304, "y": 48, "w": 176, "h": 56, "zone": "process",
      "info": "Nadie sabe cuál es la última versión de cada fichero" },
    { "id": "analysts", "name": "Equipos de análisis", "sub": "SPSS · Excel", "tag": "Manual", "hue": "rose",
      "x": 304, "y": 128, "w": 176, "h": 72, "zone": "process" },
    { "id": "portal", "name": "Portal antiguo", "sub": "se actualiza a mano", "kind": "focal",
      "x": 568, "y": 48, "w": 176, "h": 56, "zone": "publish" },
    { "id": "web", "name": "Web pública", "sub": "páginas estáticas", "x": 568, "y": 136, "w": 176, "h": 56, "zone": "publish" }
  ],
  "edges": [
    { "from": "survey", "to": "drive", "points": [[216, 76], [304, 76]], "label": "CSV", "at": [260, 66] },
    { "from": "registry", "to": "analysts", "kind": "dash",
      "points": [[216, 164], [304, 164]], "label": "EXCEL", "at": [260, 154] },
    { "from": "drive", "to": "analysts", "kind": "dash",
      "points": [[392, 104], [392, 128]], "label": "COPIA", "at": [404, 120], "anchor": "start" },
    { "from": "analysts", "to": "portal",
      "points": [[480, 164], [524, 164], [524, 76], [568, 76]], "label": "EMAIL", "at": [530, 124], "anchor": "start" },
    { "from": "portal", "to": "web", "points": [[656, 104], [656, 136]], "label": "A MANO", "at": [668, 124], "anchor": "start" }
  ],
  "kindNames": { "focal": "Punto débil", "external": "Fuera de la casa" },
  "edgeNames": { "default": "Fichero", "dash": "Fichero suelto" }
}
```

Three 224 px zones 40 apart leave an 88 px gutter for the hand-off labels.
The arrow that crosses to the next phase climbs in the gutter, and its
label sits on that vertical stretch.

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Zones | 4 |
| Boxes per zone | 5 |
| Boxes in all | 16 |
| Focal pain points | 2 (and then no accent arrows) |
| Hued lesser problems | 3 |

More than two headline pain points → two diagrams, one per part of the
landscape ("recogida", "difusión").

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Every annoying thing `focal` | Reported past two; use a hue and a tag for "bad, not headline-bad" |
| Two focal boxes and an accent path | Three accents: reported, and the pain points stop standing out |
| Unlabelled hand-offs | The file or channel *is* the friction; say `EXCEL`, `EMAIL` |
| Sentences as labels ("se manda por correo cada lunes") | One word; the rest in `info` |
| Drawing the future platform in the same picture | That is `architecture-delta`, or a second diagram |
| Zones in mixed orientation | Pick columns or rows for all of them |
| Backward arrows between your own systems | Only to or from an `external` box, dashed |

Planning, measurements and every key: [drawn.md](drawn.md).
