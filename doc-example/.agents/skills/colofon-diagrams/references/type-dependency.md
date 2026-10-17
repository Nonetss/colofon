# Dependency graph (`"type": "dependency"`)

**Best for:** what depends on what across packages, modules, services or
files, when the data has one of the two things a tree can't hold: a piece
**several others depend on**, or a **cycle**. The reader asks "what breaks if
this changes?" and "where do dependencies concentrate?".

**Not for:** data where every piece has one parent and nothing loops (say so,
and use `tree`), how pieces talk at runtime (draw it by hand,
`drawn-architecture.md`), the order things happen in (use `flowchart` or
`sequence`), or one box per file of a big codebase (that's a hairball).

## The file

```json
{
  "type": "dependency",
  "title": "Qué fichero depende de cuál",
  "desc": "Páginas, diagramas, entidades y tipos, y el ciclo entre páginas y diagramas",
  "nodes": [
    { "id": "page", "entity": "files/page" },
    { "id": "config", "entity": "files/doc-config" },
    { "id": "diagram", "entity": "files/diagram-file" },
    { "id": "entity", "entity": "files/entity" },
    { "id": "type", "entity": "files/type-declaration" }
  ],
  "deps": [
    { "from": "page", "to": "config", "label": "CAMPOS" },
    { "from": "page", "to": "diagram", "label": "MUESTRA" },
    { "from": "page", "to": "entity", "label": "ENLAZA" },
    { "from": "diagram", "to": "entity", "label": "ENTITY" },
    { "from": "diagram", "to": "page", "label": "PAGE" },
    { "from": "entity", "to": "type", "label": "SU TIPO" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `nodes` | Required. The packages, modules, services or files, each an item with an `id` (see [items.md](items.md)). No `row`/`col`: the ranks place them. |
| `deps` | Optional. `{ from, to, label?, kind?, info? }`: `from` depends on `to`. |

## What the platform does

- **Ranked layers**: the nodes nothing depends on at the top, each dependency
  pointing down to the next rank, the ones that depend on nothing at the
  bottom.
- Each node depended on carries a **fan-in tag**: «1 depende», «3 dependen».
  A node that depends on nothing is drawn as a **store** (grey), the legend's
  «No depende de nada».
- A **cycle** is found for you: its arrows go in the accent and the one that
  closes it, **dashed, round the side**. The whole cycle counts as one accent.
  Without a cycle, a `dash` link reads «Opcional».
- The legend shows «Depende de», «No depende de nada» and, with a cycle,
  «Ciclo» and «Cierra el ciclo».

## What you decide

- **One node per package, module or service**, not per file, unless files are
  the subject (as in the example above).
- **Labels say what the dependency is for** (`CAMPOS`, `SU TIPO`), short and in
  capitals; drop them when every arrow means the same.
- **Let the cycle be the accent.** With a cycle there is room for one focal
  node at most; usually the shared dependency (highest fan-in) is that node,
  or nothing is.
- External dependencies say so in `sub` (`v3 · npm`), not in the name.
- Don't set `kind: "accent"` on the cycle's arrows: the platform does it.

## Complexity budget

| Limit | Value |
| --- | --- |
| Nodes | 9 |
| Dependencies | 14 |
| Ranks | 4 |
| Cycles | 1 |
| Accent elements | 2 (focal nodes, and each run of joined accent links; the cycle is one such run) |

Over budget → collapse a cluster of leaves into one node named with its count
(«6 utilidades») and say so in `info`; don't silently drop nodes.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A dependency graph of tree-shaped data | No shared node, no cycle: a `tree` says it better |
| Two cycles in one graph | They compete; the platform reports it. Show the one that matters |
| One node per file in a large codebase | Density 9/10; dependency structure gets lost |
| Arrows drawn the "uses" way in some places and "is used by" in others | `from` always depends on `to` |
| Every arrow labelled with the same word | Noise; leave them unlabelled |

## Reported

A node without `id`, a dependency to an unknown id ("`x` no es ninguna de las
partes del diagrama"; left out), the budget, including more than one cycle
("Un grafo de dependencias lleva como mucho 1 ciclo marcado y este tiene 2…"),
and the accents.

## Text version

One line per node, "Página depende de doc.config.yaml, Diagrama, Entidad" or
"Tipo no depende de nada", then one line per cycle, "Ciclo: Página → Diagrama
→ Página", with names linked.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/dependency-content-files.json`, in its `diagrams/graphs` page.
