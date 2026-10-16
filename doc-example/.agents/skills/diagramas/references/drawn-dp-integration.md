# Data platform integration (drawn)

**Best for:** the integration surfaces of a data platform: which source
systems plug in, which consumers plug out, and **which protocol each wire
speaks** (`JDBC`, `SFTP`, `S3`, `SQL`). Hub and spoke around an explicit
platform boundary, with no time or phase axis. The question it answers is
"what does this platform expose, and over what?".

**Not for:** how data moves through phases ([high-level](drawn-high-level.md));
today's landscape and its problems ([IT current state](drawn-it-state.md));
the storage tiers ([medallion](drawn-medallion.md)); one system's components
([architecture](drawn-architecture.md)).

## Composition

- **Three zones in three columns:** sources at the left (`FUENTES`), the
  platform in the middle (`PLATAFORMA DE DATOS`, the widest), consumers at
  the right (`CONSUMO`).
- **Sources are `input` boxes, one per distinct system**; collapse only
  identical ones (`"sub": "4 × MariaDB"`). Collapsing distinct sources into
  "Fuentes" defeats the diagram.
- **Every wire is labelled with its protocol.** That label is the content;
  give each arrow its own gutter stretch to carry it.
- **The ingestion tool can be one tall box** that every source enters
  straight on its left side (the skeleton's NiFi), which keeps all source
  arrows horizontal.
- **The accent marks what makes it a platform**, not a pile of tools: the
  storage hub and the query engine as two `focal` boxes (and then no accent
  arrows), or the hub `focal` plus the serving path as one `accent` run.
- **Identity and observability gate the whole platform from outside:** a
  box below or beside the platform zone with one arrow to the zone
  (`"toZone": "platform"`), or a badge (`SSO`) on the boxes it really
  protects. Never inside the platform zone, never wired to one tool unless
  it only protects that tool.

## Skeleton

```json
{
  "title": "Por dónde entra y sale la plataforma de datos",
  "desc": "Tres fuentes entran por NiFi, que guarda en MinIO; Trino lee MinIO y sirve a los cuadros y a los cuadernos, cada conexión con su protocolo",
  "width": 800,
  "height": 248,
  "zones": [
    { "id": "sources", "x": 16, "y": 16, "w": 176, "h": 216, "label": "FUENTES" },
    { "id": "platform", "x": 224, "y": 16, "w": 352, "h": 216, "label": "PLATAFORMA DE DATOS" },
    { "id": "consumers", "x": 608, "y": 16, "w": 176, "h": 216, "label": "CONSUMO" }
  ],
  "nodes": [
    { "id": "databases", "name": "Bases de datos", "sub": "4 × MariaDB", "kind": "input", "x": 40, "y": 48, "w": 128, "h": 48, "zone": "sources" },
    { "id": "files", "name": "Ficheros", "sub": "proveedores", "kind": "input", "x": 40, "y": 112, "w": 128, "h": 48, "zone": "sources" },
    { "id": "apis", "name": "API externas", "sub": "REST", "kind": "input", "x": 40, "y": 176, "w": 128, "h": 48, "zone": "sources" },
    { "id": "nifi", "name": "NiFi", "sub": "ingesta", "x": 248, "y": 48, "w": 128, "h": 176, "zone": "platform" },
    { "id": "minio", "name": "MinIO", "sub": "objetos", "kind": "focal", "shape": "cylinder",
      "x": 424, "y": 48, "w": 128, "h": 64, "zone": "platform" },
    { "id": "trino", "name": "Trino", "sub": "SQL federado", "kind": "focal",
      "x": 424, "y": 152, "w": 128, "h": 64, "zone": "platform" },
    { "id": "boards", "name": "Cuadros", "sub": "Superset", "x": 632, "y": 104, "w": 128, "h": 48, "zone": "consumers" },
    { "id": "notebooks", "name": "Cuadernos", "sub": "Jupyter", "x": 632, "y": 168, "w": 128, "h": 48, "zone": "consumers" }
  ],
  "edges": [
    { "from": "databases", "to": "nifi", "points": [[168, 72], [248, 72]], "label": "JDBC", "at": [208, 62] },
    { "from": "files", "to": "nifi", "points": [[168, 136], [248, 136]], "label": "SFTP", "at": [208, 126] },
    { "from": "apis", "to": "nifi", "points": [[168, 200], [248, 200]], "label": "HTTPS", "at": [208, 190] },
    { "from": "nifi", "to": "minio", "points": [[376, 80], [424, 80]], "label": "S3", "at": [400, 70] },
    { "from": "minio", "to": "trino", "points": [[488, 112], [488, 152]], "label": "ICEBERG", "at": [500, 136], "anchor": "start" },
    { "from": "trino", "to": "boards", "points": [[552, 168], [592, 168], [592, 128], [632, 128]], "label": "SQL", "at": [612, 118] },
    { "from": "trino", "to": "notebooks", "points": [[552, 192], [632, 192]], "label": "JDBC", "at": [592, 182] }
  ]
}
```

Sources 64 px apart line up with three points on NiFi's left edge, so their
arrows are straight. The two focal boxes spend both accents, so every arrow
is default and the protocols carry the reading.

## Budget

Advice; the platform checks only the accents. This kind is denser than the
others on purpose: the number of surfaces is the claim.

| Limit | Value |
| --- | --- |
| Sources | 6 |
| Platform boxes | 5 |
| Consumers | 6 |
| Boxes in all | 20 |
| Unlabelled arrows | 0 |
| Accent elements | 2 |

Too dense → split by plane (data, identity, observability), one diagram
each.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| One "Fuentes" box with one arrow into the platform | The distinct surfaces are the point; draw each |
| An arrow without its protocol | Integration teams read the wires; an unlabelled one says nothing |
| A different hue per tool inside the platform | Collapses the hierarchy; only the accents stand out |
| Three or more focal boxes | Reported; "platform vs. pile of tools" needs two at most |
| Identity inside the platform zone | It gates the platform from outside; draw it outside, to the zone |
| Phase names across the top | That is the [high-level](drawn-high-level.md) diagram |
| Arrows crossing the platform to reach a consumer | Route consumers from the serving box only; reorder rows instead |

Planning, measurements and every key: [drawn.md](drawn.md).
