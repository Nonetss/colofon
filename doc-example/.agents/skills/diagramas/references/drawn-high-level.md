# High-level (drawn)

**Best for:** an end-to-end platform overview by **phases**: sources →
ingestion → storage → query → visualisation, with the cross-cutting
services (identity, orchestration, observability) that span every phase.
The reader sees which tool covers which phase and where the data hub is.

**Not for:** the integration surfaces and protocols of a data platform
([dp-integration](drawn-dp-integration.md)); the storage tiers of the same
data ([medallion](drawn-medallion.md)); who does each step
([data flow](drawn-data-flow.md)); a single system's components
([architecture](drawn-architecture.md)); stacked abstraction levels with no
flow (`layers`).

## Composition

- **One zone per phase, as equal columns**, left → right, labelled with the
  phase (`ORÍGENES`, `INGESTA`, `ALMACÉN`, `CONSULTA`). The zone titles are
  the banner that maps columns to phases: every box sits in its phase's
  column, centred in it.
- **Sources go first, as `input` boxes**; mark third-party ones `external`.
- **Cross-cutting services are a full-width box in their own zone** under
  the phases (`TRANSVERSAL`), one row each. Putting the bar in a zone keeps
  it in the text version ("TRANSVERSAL: Identidad"). Don't wire it to every
  box: if one piece really depends on it, use `needs` or a badge.
- An orchestrator that triggers several pieces is a full-width box *above*
  the phase boxes, with `dash` arrows down to what it triggers.
- **The accent:** the storage hub is `focal` (a cylinder), and the main
  path through it (ingestion → hub → query) is one `accent` run. Read-backs
  and triggers are `dash`.
- Two to three boxes per phase at most, stacked with 32 px between them.

## Skeleton

```json
{
  "title": "La plataforma de datos, de punta a punta",
  "desc": "Los orígenes entran por NiFi, quedan en MinIO y se consultan con Trino desde Superset; la identidad cubre todas las fases",
  "width": 880,
  "height": 320,
  "zones": [
    { "id": "sources", "x": 16, "y": 16, "w": 200, "h": 192, "label": "ORÍGENES" },
    { "id": "ingest", "x": 232, "y": 16, "w": 200, "h": 192, "label": "INGESTA" },
    { "id": "storage", "x": 448, "y": 16, "w": 200, "h": 192, "label": "ALMACÉN" },
    { "id": "query", "x": 664, "y": 16, "w": 200, "h": 192, "label": "CONSULTA" },
    { "id": "cross", "x": 16, "y": 224, "w": 848, "h": 80, "label": "TRANSVERSAL" }
  ],
  "nodes": [
    { "id": "postgres", "name": "PostgreSQL", "kind": "input", "x": 40, "y": 48, "w": 152, "h": 56, "zone": "sources" },
    { "id": "sftp", "name": "SFTP", "kind": "input", "x": 40, "y": 136, "w": 152, "h": 56, "zone": "sources" },
    { "id": "nifi", "name": "NiFi", "sub": "recoge", "x": 256, "y": 92, "w": 152, "h": 56, "zone": "ingest" },
    { "id": "minio", "name": "MinIO", "sub": "objetos", "kind": "focal", "shape": "cylinder",
      "x": 472, "y": 92, "w": 152, "h": 56, "zone": "storage" },
    { "id": "trino", "name": "Trino", "sub": "SQL federado", "x": 688, "y": 48, "w": 152, "h": 56, "zone": "query" },
    { "id": "superset", "name": "Superset", "sub": "cuadros", "x": 688, "y": 136, "w": 152, "h": 56, "zone": "query" },
    { "id": "identity", "name": "Identidad", "sub": "Keycloak · OIDC", "kind": "external",
      "x": 40, "y": 256, "w": 800, "h": 40, "zone": "cross" }
  ],
  "edges": [
    { "from": "postgres", "to": "nifi", "points": [[192, 76], [224, 76], [224, 108], [256, 108]] },
    { "from": "sftp", "to": "nifi", "points": [[192, 164], [224, 164], [224, 132], [256, 132]] },
    { "from": "nifi", "to": "minio", "kind": "accent",
      "points": [[408, 120], [472, 120]], "label": "PARQUET", "at": [440, 110] },
    { "from": "minio", "to": "trino", "kind": "accent",
      "points": [[624, 120], [656, 120], [656, 76], [688, 76]] },
    { "from": "trino", "to": "superset", "points": [[764, 104], [764, 136]],
      "label": "SQL", "at": [776, 124], "anchor": "start" }
  ]
}
```

Phase zones 200 wide every 216 px; boxes 152 wide at zone x + 24, so they
sit centred in their phase. Two sources fan into NiFi 24 px apart on its
left edge; a single box in a phase sits at the column's vertical middle.

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Phases (zones) | 5 |
| Boxes per phase | 3 |
| Sources | 4 (more: one box with `sub: "4 × MariaDB"`) |
| Cross-cutting rows | 3 |
| Arrows leaving one box | 3 |
| Accent elements | 2 (the hub, and the main path as one run) |

Over budget → one overview with a box per phase, and one diagram per phase.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Phases without zones | The columns lose their names; the reader can't map tools to phases |
| A box outside its phase's column | Breaks the banner-as-legend reading |
| Identity drawn inside one phase, or wired to one tool | It spans every phase; a full-width row says that |
| A cross-cutting box outside any zone and without arrows | It drops out of the text version |
| Orchestration triggers drawn solid | Triggers are `dash`; solid arrows are data |
| More than one `focal` hub | The hub is the point of the picture |
| A source fanning out to four pieces | There is a hub you haven't drawn; draw it |

Planning, measurements and every key: [drawn.md](drawn.md).
