# Data flow between roles (drawn)

**Best for:** how data moves through a pipeline *across roles*: who
collects, who stores, who analyses, who consumes, and the one hand-off that
matters (raw data becoming anonymised data for the analysts). The subject
is the data and its payloads, the rows are the roles.

**Not for:** a business process across teams with no data payload, or with
its inputs and tools (`swimlane`, `process` variant); the technical
components with no roles ([architecture](drawn-architecture.md)); the
phases of a platform ([high-level](drawn-high-level.md)); messages in time
order (`sequence`).

## Composition

- **One zone per role, as full-width rows**, top → down
  (`INGENIERÍA`, `CIENCIA DE DATOS`, `CONSUMO`). Rows 96 px tall hold a
  48 px box with the 32 px title margin.
- **Steps are columns**, left → right, shared by every row: a box sits in
  its role's row and its step's column. A role that does nothing in a step
  has **no** box there; never a placeholder.
- **Box = what that role does in that step**, the tool in `sub`
  (`NiFi · SFTP`); data at rest is a `store`.
- **The accent is one cross-role hand-off:** the box that receives it is
  `focal`, and the arrow into it is `accent` with the **only label** in the
  diagram, naming the payload (`DATOS ANÓNIMOS`). That is both accents.
- Arrows inside a row are short and unlabelled; arrows between rows go
  down (or up) in the gutter and turn into the target's side.
- A governance or trigger arrow (an admin granting access) is `dash`.

## Skeleton

```json
{
  "title": "Quién toca los datos en cada paso",
  "desc": "Ingeniería recoge, guarda y limpia; ciencia de datos recibe los datos anónimos y modela; consumo lee los cuadros publicados",
  "width": 720,
  "height": 352,
  "zones": [
    { "id": "eng", "x": 16, "y": 16, "w": 688, "h": 96, "label": "INGENIERÍA" },
    { "id": "sci", "x": 16, "y": 128, "w": 688, "h": 96, "label": "CIENCIA DE DATOS" },
    { "id": "use", "x": 16, "y": 240, "w": 688, "h": 96, "label": "CONSUMO" }
  ],
  "nodes": [
    { "id": "ingest", "name": "Ingesta", "sub": "NiFi · SFTP", "x": 40, "y": 48, "w": 128, "h": 48, "zone": "eng" },
    { "id": "raw", "name": "Datos en bruto", "sub": "MinIO", "kind": "store", "x": 208, "y": 48, "w": 128, "h": 48, "zone": "eng" },
    { "id": "clean", "name": "Limpieza", "sub": "Trino", "x": 376, "y": 48, "w": 128, "h": 48, "zone": "eng" },
    { "id": "model", "name": "Modelos", "sub": "Jupyter", "kind": "focal", "x": 552, "y": 160, "w": 128, "h": 48, "zone": "sci" },
    { "id": "boards", "name": "Cuadros", "sub": "Superset", "x": 552, "y": 272, "w": 128, "h": 48, "zone": "use" }
  ],
  "edges": [
    { "from": "ingest", "to": "raw", "points": [[168, 72], [208, 72]] },
    { "from": "raw", "to": "clean", "points": [[336, 72], [376, 72]] },
    { "from": "clean", "to": "model", "kind": "accent",
      "points": [[440, 96], [440, 184], [552, 184]], "label": "DATOS ANÓNIMOS", "at": [496, 174] },
    { "from": "model", "to": "boards", "points": [[616, 208], [616, 272]] }
  ]
}
```

Step columns every 168 px (x 40 / 208 / 376 / 552), boxes 128 wide; rows
112 px apart. The hand-off drops from the bottom of `clean` and turns into
the side of `model`, with its label on the horizontal stretch.

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Roles (zones) | 4 |
| Steps (columns) | 6 |
| Labelled arrows | 1 (the focal hand-off) |
| Accent elements | 2 (the receiving box, and the hand-off) |
| Hued boxes | 3 |

Over four roles or six steps → split the pipeline (ingestion, analysis).

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Placeholder boxes in empty cells | The empty cell *is* the information: that role doesn't act there |
| A label on every arrow | Only the hand-off the diagram is about gets one |
| More than one focal box, or accent arrows elsewhere | The cross-role hand-off stops being the story |
| Role names as box names | Roles are the zone titles; boxes are what they do |
| Diagonal arrows between rows | Reported and dropped; go down the gutter, then across |
| A hue on every row | Reads as decoration; at most one row or a few boxes |
| A business approval flow drawn this way | No payload: that is a `swimlane` |

Planning, measurements and every key: [drawn.md](drawn.md).
