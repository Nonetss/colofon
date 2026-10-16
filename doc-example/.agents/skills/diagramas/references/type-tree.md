# Tree (`"type": "tree"`)

**Best for:** a hierarchy with one root where every piece has exactly one
parent: a taxonomy, a file tree, the parts of a decision, a site's sections.
The reader reads it top-down (or left-to-right) and asks "what is under
this?".

**Not for:** people, teams or agents and who answers for what (use
`org-chart`: same layout, with roles and second reporting lines), a piece
several others share or a cycle (use `dependency`), stacked levels of
abstraction (use `layers`), or containment where the boundary matters (draw
it by hand, `drawn-nested.md`).

## The file

```json
{
  "type": "tree",
  "title": "Los ficheros de un repositorio",
  "desc": "Qué hay en la raíz de un repositorio de contenido",
  "direction": "right",
  "nodes": [
    { "id": "root", "name": "Repositorio", "focal": true },
    { "id": "config", "entity": "files/doc-config", "parent": "root" },
    { "id": "docs", "name": "docs/", "parent": "root", "page": "pages" },
    { "id": "pages", "entity": "files/page", "parent": "docs" },
    { "id": "catalog", "name": "catalogo/", "parent": "root", "page": "catalog" },
    { "id": "entity", "entity": "files/entity", "parent": "catalog" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `nodes` | Required. The nodes, each an item with an `id` (see [items.md](items.md)), plus `parent`: its parent's id. The one node without `parent` is the root. |
| `direction` | Optional. `down` (default): the root on top; `right`: the root on the left. |

## What the platform does

- A **tidy tree**: each parent centred over (or beside) its children, siblings
  in the order they are written, levels 48 px apart going down and 64 px going
  right.
- Parent and children are joined by an **elbow**: a drop from the parent, a
  bar along the gap between levels, a drop into each child. No arrowheads, no
  diagonals, no labels on the connectors.
- **All boxes share one size**: the width of the longest name (at least
  120 px) and the height of the node with most `sub` lines.
- No legend; the text version is the tree as a nested list.

## What you decide

- **`direction: "right"`** when names are long or the tree is deep and narrow
  (a file tree); `down` when it is wide and shallow.
- **Keep names similar in length**: one long name widens every box. Move the
  detail to `sub` or `info`.
- **One focal node**: the root, or the leaf the page is about, not both.
- Don't skip levels: a grandchild hung straight from the root hides the level
  that explains it.
- Siblings go in the order the reader should meet them; the platform doesn't
  sort them.

## Complexity budget

| Limit | Value |
| --- | --- |
| Levels | 4 (root + 3) |
| Nodes | 16 |
| Children under one node | 6 |
| Accent elements | 2 (focal nodes) |

Over budget → an overview tree whose leaves are the roots of detail trees, or
a grouping node for a parent with too many children.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A five-level tree | Illegible at page width; split it |
| One node with ten children | A flat list wearing a tree; group them or write a list |
| Nodes that are people and roles | It is an `org-chart` |
| A node with two parents, forced into one | The shared dependency is the story; use `dependency` |
| Focal on root and on a leaf | Nothing stands out |

## Reported

No root ("Un árbol tiene una raíz: un nodo sin parent, y aquí no hay
ninguno"), more than one, or parents that form a cycle: **nothing is drawn**,
only the problem. A `parent` that is no node ("`x` no es ninguno de los
nodos"): that node is left out. Also a node without `id`, `role` or `dotted`
on a tree ("`role` es de un organigrama (type: org-chart), no de un árbol"),
`direction` other than `down` or `right`, the budget and the accents.

## Text version

The tree as a nested list, each node's name linked, children indented under
their parent.

## In this site

`diagramas/tree-repository-files.json`, shown in `docs/diagrams/graphs.mdx`.
