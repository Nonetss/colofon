# Deployment (drawn)

**Best for:** where software actually **runs**: hosts, VMs, pods and managed
services inside environment or network zones, with replica counts, versions
and the ports between them. Architecture says what talks to what;
deployment says what is installed where, behind which boundary, how many
times.

**Not for:** the logical components with no placement decision
([architecture](drawn-architecture.md)); containment for its own sake
([nested](drawn-nested.md)); a physical floor or rack layout (an
[illustration](illustration.md)). If no zone, replica count or version
matters, it is an architecture diagram with hostnames bolted on.

## Composition

- **Zones are real boundaries**: an environment, a network, a region
  (`BORDE`, `PRODUCCIÓN · EU-WEST-1`, `DATOS`). A zone that is only visual
  grouping is wrong here. Three at most; nest them
  ([nested](drawn-nested.md)) when a network sits inside an environment.
- **Boxes are hosts or services as deployed**, with what they are in the
  `tag` (`Pod`, `VM`, `Gestionado`, `CDN`) and the **artifact and version in
  `sub`** (`api:2.4.1`, `primaria · 16.4`). A box without a version is a
  wasted box.
- **One box per service, its replicas as a badge**: an edge
  `{ "from": "api", "to": "api", "badge": "×3" }` puts the chip on the box
  (with `"badgeName": "Réplicas"` for the legend). The text version reads
  "API → API: ×3".
- **Arrows are network paths labelled with protocol and port**
  (`HTTPS:443`, `TLS:5432`). Replication and async paths are `dash`, or the
  accent when they are the point.
- **The accent is the single point of failure or the new piece**: the
  primary database `focal`, and the replication path to its standby as an
  `accent` arrow. Put the reason in `info`.
- Badge and tag share the box's top row: keep tags short so the chips fit
  (reported otherwise: `las insignias de "API" no caben junto a su
  etiqueta`).

## Skeleton

```json
{
  "title": "Dónde corre la API en producción",
  "desc": "La CDN entra por HTTPS a tres réplicas de la API en producción; la API y las tareas escriben en la base primaria, que se replica a una de espera",
  "width": 800,
  "height": 256,
  "zones": [
    { "id": "edge", "x": 16, "y": 16, "w": 192, "h": 224, "label": "BORDE" },
    { "id": "prod", "x": 232, "y": 16, "w": 336, "h": 224, "label": "PRODUCCIÓN · EU-WEST-1" },
    { "id": "data", "x": 592, "y": 16, "w": 192, "h": 224, "label": "DATOS" }
  ],
  "nodes": [
    { "id": "cdn", "name": "CDN", "tag": "Gestionado", "kind": "external", "x": 40, "y": 48, "w": 144, "h": 72, "zone": "edge" },
    { "id": "api", "name": "API", "tag": "Pod", "sub": "api:2.4.1", "x": 256, "y": 48, "w": 144, "h": 72, "zone": "prod" },
    { "id": "jobs", "name": "Tareas", "tag": "Pod", "sub": "worker:2.4.1", "x": 256, "y": 152, "w": 144, "h": 72, "zone": "prod" },
    { "id": "primary", "name": "PostgreSQL", "tag": "Gestionado", "sub": "primaria · 16.4", "kind": "focal", "shape": "cylinder",
      "x": 616, "y": 48, "w": 144, "h": 72, "zone": "data", "info": "El único punto sin redundancia activa" },
    { "id": "standby", "name": "Réplica", "sub": "en espera", "kind": "store", "shape": "cylinder",
      "x": 616, "y": 152, "w": 144, "h": 72, "zone": "data" }
  ],
  "edges": [
    { "from": "cdn", "to": "api", "points": [[184, 84], [256, 84]], "label": "HTTPS:443", "at": [220, 74] },
    { "from": "api", "to": "primary", "points": [[400, 84], [616, 84]], "label": "TLS:5432", "at": [508, 74] },
    { "from": "jobs", "to": "primary", "points": [[400, 188], [508, 188], [508, 104], [616, 104]] },
    { "from": "primary", "to": "standby", "kind": "accent",
      "points": [[688, 120], [688, 152]], "label": "RÉPLICA", "at": [700, 140], "anchor": "start" },
    { "from": "api", "to": "api", "badge": "×3" },
    { "from": "jobs", "to": "jobs", "badge": "×2" }
  ],
  "badgeName": "Réplicas"
}
```

Boxes are 72 tall so the tag row, name and version fit; the two paths into
the primary land 20 px apart on its left side.

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Zones | 3 |
| Hosts or services | 6 |
| Network paths | 8 |
| Badges per box | 2 |
| Accent elements | 2 |

Over budget → one deployment diagram per environment.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| The logical architecture with hostnames added | No placement decision shown; draw an [architecture](drawn-architecture.md) |
| One box per replica | Use one box and a `×N` badge |
| Boxes without versions | The version is why the diagram exists |
| Unlabelled network paths | Protocol and port are the content |
| Zones that are not boundaries | A zone here claims an environment or network |
| Staging and production side by side in one zone | Mixed environments mislead; one zone each, or one diagram each |
| Vendor names or icons instead of named hosts | Name the host or service; the reader's search starts there |

Planning, measurements and every key: [drawn.md](drawn.md).
