# Architecture (drawn)

**Best for:** the components of one system and how they talk: a service
overview, an integration map, the tiers of an app (client → services →
data), a trust boundary. The reader learns *what talks to what, over what*.

**Not for:** where each piece runs, on which host and how many copies
([deployment](drawn-deployment.md)); a data platform's phases end to end
([high-level](drawn-high-level.md)); how the architecture *changes*
(`architecture-delta`); a chain of steps with no branching (a chain, or a
`flowchart` if there are decisions); what depends on what, with many shared
dependencies (`dependency`).

## Composition

- **Zones are tiers or trust boundaries**, at most three (`CLIENTE`,
  `SERVICIOS`, `DATOS`; `PÚBLICO`, `PRIVADO`). More zones and it reads as a
  swimlane; use `swimlane` instead.
- **One flow direction**, left → right (tiers as columns) or top → down
  (tiers as rows), and hold it for every arrow.
- **Kinds by role:** `input` with `shape: "pill"` for people and callers,
  `service` for running pieces, `store` with `shape: "cylinder"` (or
  `"shapes": { "store": "cylinder" }`) for databases and buckets, `external`
  for third parties, `optional` for what is planned or unused.
- **The accent:** one `focal` box (the integration point, the core service)
  plus the main request path as `accent` arrows joined end to end. That is
  the two accents spent; everything else is default or `dash` (async,
  optional, background).
- **Labels say the protocol or what travels** (`HTTPS`, `SQL`, `EVENTOS`),
  not verbs. Ports and details go in `info`.
- Put `trace: true` on the origin so hovering it lights the main path, and
  `needs` on services that fall when a store falls.
- A connection to a piece far across the drawing (an identity provider
  every service uses) is a **badge** (`"badge": "SSO"`) on each box, not a
  line across everything.

## Skeleton

```json
{
  "title": "Cómo responde la API",
  "desc": "El navegador llama a la API, que lee y escribe en PostgreSQL; un proceso de tareas limpia los datos viejos",
  "width": 760,
  "height": 232,
  "zones": [
    { "id": "client", "x": 16, "y": 16, "w": 176, "h": 200, "label": "CLIENTE" },
    { "id": "services", "x": 232, "y": 16, "w": 296, "h": 200, "label": "SERVICIOS" },
    { "id": "data", "x": 568, "y": 16, "w": 176, "h": 200, "label": "DATOS" }
  ],
  "nodes": [
    { "id": "browser", "name": "Navegador", "kind": "input", "shape": "pill",
      "x": 40, "y": 48, "w": 128, "h": 72, "zone": "client", "trace": true },
    { "id": "api", "name": "API", "sub": "Hono + oRPC", "tag": "Núcleo", "kind": "focal",
      "x": 256, "y": 48, "w": 248, "h": 72, "zone": "services", "needs": ["db"] },
    { "id": "jobs", "name": "Tareas", "sub": "cron", "x": 256, "y": 144, "w": 248, "h": 56,
      "zone": "services", "needs": ["db"] },
    { "id": "db", "name": "PostgreSQL", "kind": "store", "shape": "cylinder",
      "x": 592, "y": 48, "w": 128, "h": 72, "zone": "data" }
  ],
  "edges": [
    { "from": "browser", "to": "api", "kind": "accent",
      "points": [[168, 84], [256, 84]], "label": "HTTPS", "at": [212, 74] },
    { "from": "api", "to": "db", "kind": "accent",
      "points": [[504, 84], [592, 84]], "label": "SQL", "at": [548, 74] },
    { "from": "jobs", "to": "db",
      "points": [[504, 172], [656, 172], [656, 120]], "label": "BORRA", "at": [580, 162] }
  ]
}
```

Columns at x 40 / 256 / 592 inside zones 40 px apart; the request path is
one straight row at y 84; the background job enters the store from below
because it arrives mostly vertically.

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Zones | 3 |
| Boxes | 9 |
| Arrows | 12 |
| Arrows leaving one box | 3 (more: it is a hub, make it the `focal` box) |
| Accent elements | 2 (the focal box, and the main path as one run) |

Over budget → an overview with one box per subsystem, and one diagram per
subsystem linked from its box (`page`).

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Every important box `focal` | Hierarchy collapses; the platform reports past two accents |
| Arrows both ways where one direction is obvious | Doubles the lines; say the direction that matters, the reply goes in `info` |
| A zone per box, or zones that mean nothing | A zone is a tier or a boundary; four or more is a swimlane |
| Diagonal shortcuts | Reported and dropped; route orthogonally through the gutters |
| An arrow side-entering a box below it | Reads as puncturing the box; enter from the top or bottom |
| Hostnames, replicas and versions on the boxes | That is a deployment diagram; keep this one logical |
| Labels like "llama a" or "usa" | Say what travels or the protocol |
| A legend drawn with notes | The platform draws it; rename entries with `kindNames`/`edgeNames` |

Planning, measurements and every key: [drawn.md](drawn.md).
