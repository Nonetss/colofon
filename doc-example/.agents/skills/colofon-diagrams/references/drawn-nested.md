# Nested containment (drawn)

**Best for:** hierarchy through containment: scopes, trust zones, networks
inside networks, blast radius, what can see what. Outer is broader, inner is
more specific, and where a piece sits says how exposed it is.

**Not for:** a hierarchy with many children per level (`tree`, or
`org-chart` for people); stacked levels of abstraction (`layers`); where
software runs with versions and replicas ([deployment](drawn-deployment.md),
which reuses this nesting); overlapping sets (`venn`).

## Composition

- **Zones inside zones, three to five levels**, each inset by the same
  amount: **24 px at the sides and 32 px at the top** (the title needs it),
  16 at the bottom. Irregular insets look accidental.
- **Hues step through the levels**: a quiet one outside (`slate`), others
  inward (`teal`, `violet`). Hues group; they are not the accent.
- **Every level holds at least one box**: the text version lists each zone
  with the boxes *directly* in it ("RED DE CASA: Router"), so a level with
  no box of its own disappears from it. Set each box's `zone` to its
  innermost zone.
- To leave room for a level's own boxes, push the inner zone to one side
  (the skeleton puts the inner levels at the left and each level's box in
  the strip to their right) instead of centring everything.
- **The accent is the innermost focal piece**, one box. The arrows, if
  any, show the way in from outside, crossing one boundary each.
- The sentence of what each level means goes in `info` on its boxes or in
  `desc`, not in notes.

## Skeleton

```json
{
  "title": "Qué ve cada red",
  "desc": "Internet solo llega al router de casa; dentro de la red de casa, la VLAN de servicios guarda el NAS y Komodo",
  "width": 640,
  "height": 304,
  "zones": [
    { "id": "internet", "x": 16, "y": 16, "w": 608, "h": 272, "label": "INTERNET", "hue": "slate" },
    { "id": "home", "x": 40, "y": 48, "w": 416, "h": 224, "label": "RED DE CASA", "hue": "teal" },
    { "id": "services", "x": 64, "y": 80, "w": 224, "h": 176, "label": "VLAN DE SERVICIOS", "hue": "violet" }
  ],
  "nodes": [
    { "id": "provider", "name": "Proveedor", "kind": "external", "x": 480, "y": 112, "w": 120, "h": 56, "zone": "internet" },
    { "id": "router", "name": "Router", "sub": "cortafuegos", "x": 312, "y": 112, "w": 120, "h": 56, "zone": "home" },
    { "id": "nas", "name": "NAS", "sub": "copias y ficheros", "kind": "focal", "x": 88, "y": 112, "w": 176, "h": 56, "zone": "services" },
    { "id": "komodo", "name": "Komodo", "sub": "despliegues", "x": 88, "y": 184, "w": 176, "h": 56, "zone": "services", "needs": ["nas"] }
  ],
  "edges": [
    { "from": "provider", "to": "router", "points": [[480, 140], [432, 140]], "label": "FIBRA", "at": [456, 130] },
    { "from": "router", "to": "nas", "points": [[312, 140], [264, 140]] }
  ]
}
```

Each zone starts 24 px right of and 32 px below its parent's corner; the
boxes of one level share a row (y 112) so the way in is one straight line
crossing one frame at a time.

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Levels (nested zones) | 5 (6 is the hard ceiling: inner levels vanish) |
| Boxes per level | 3 |
| Arrows | 4 |
| Accent elements | 1 (the innermost piece) or 2 with the way in as an accent run |

Too many levels → split at the middle: an outer diagram whose innermost box
links (`page`) to the inner one.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Uneven insets between levels | Looks accidental; the nesting stops reading as a hierarchy |
| A level with no box of its own | It vanishes from the text version |
| Boxes that are not part of the hierarchy | Put them in a sibling diagram |
| The accent on several levels | Hierarchy collapses; one innermost piece |
| Zone titles that are sentences | A zone title is a scope's name, in capitals |
| Arrows between every pair of levels | Containment already says who sees whom; draw only the way in |
| Overlapping zones | That is overlap, not containment: `venn` |

Planning, measurements and every key: [drawn.md](drawn.md).
