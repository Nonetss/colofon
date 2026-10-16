# Org chart (`"type": "org-chart"`)

**Best for:** who answers for what: people, teams, roles or agents, the front
door that receives ambiguous work, escalation and approval paths, and the
gaps nobody owns. The reader asks "who do I go to for this?".

**Not for:** a generic hierarchy of things (use `tree`), a process where
people hand work to each other (use `swimlane`: it explains process, an org
chart explains ownership), or permissions per role (use `matrix`).

## The file

```json
{
  "type": "org-chart",
  "title": "Quién cuida la guía",
  "desc": "Quién responde del sitio, quién escribe, quién revisa y quién lee",
  "nodes": [
    { "id": "owner", "name": "Responsable del sitio", "role": "Persona", "focal": true },
    { "id": "writer", "name": "Agente que escribe", "role": "Agente", "parent": "owner" },
    { "id": "reviewer", "name": "Quien revisa", "role": "Persona", "parent": "owner" },
    { "id": "questions", "name": "Rondas de preguntas", "role": "Comando",
      "parent": "writer", "dotted": ["reviewer"] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `nodes` | Required. The nodes, each an item with an `id` (see [items.md](items.md)) and, except the root, `parent`; plus `role`, its role, shown as the tag above the name, and `dotted`, the ids of whom else it reports to. |
| `direction` | Optional. `down` (default): the root on top; `right`: the root on the left. |

## What the platform does

- Exactly a `tree`'s layout (see [type-tree.md](type-tree.md)): a tidy tree,
  parents centred over their children, elbow connectors, every box the same
  size.
- `role` is the box's **tag**, above the name; when any node has one, every
  box gets room for it.
- Each `dotted` id is a **dashed curve** from the node's top into the side of
  the box it also reports to (or over the top of one on its own level). It
  never counts as an accent.
- When there are dotted lines, the legend shows «Reporta a» and «También
  reporta a».

## What you decide

- **Each node answers three questions** when space allows: who (`name`), what
  kind (`role`: «Persona», «Agente», «Equipo», «Comando»), and how to reach it
  or what it covers (`sub`, two to four words). The paragraph goes in `info`.
- **Focal is the front door**: the one node that receives work nobody else
  claims. One, not more.
- **Group before you widen**: more than five or six direct reports means a
  missing team or pod node.
- Escalation and approval rules are not nodes; say them in `info` or in the
  page around the diagram.
- A role nobody fills yet stays in the chart (with `sub: "sin asignar"`);
  hiding gaps hides the operational risk.
- Use `dotted` sparingly: one or two second reporting lines. If most nodes
  have one, the hierarchy is wrong.

## Complexity budget

| Limit | Value |
| --- | --- |
| Levels | 4 |
| Nodes | 16 (aim for 12) |
| Children under one node | 6 |
| Accent elements | 2 (focal nodes) |

Over budget → an overview chart down to the teams, and one chart per team.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A swimlane where the question is "who does what?" | Lanes explain a process, not ownership |
| Every node an identical box with no role | Hides the front door, the specialists and the gaps |
| Job descriptions in names | Names are measured; scope goes in `sub`, detail in `info` |
| `dotted` everywhere | A matrix organisation is a `matrix`, not a tree |
| `role` used for a person's name | The tag is the kind; the name is `name` |

## Reported

Everything a tree reports (no root, several roots or a cycle: nothing is
drawn; an unknown `parent`: that node is left out; the budget, «Un
organigrama lleva como mucho…»), plus a `dotted` id that is no node ("`x` no
es ninguno de los nodos"; that line is left out).

## Text version

The tree as a nested list, each line "Name (role)", and "· también reporta a
X" after a node with `dotted`, with names linked.

## In this site

`diagramas/org-chart-guide-roles.json`, shown in `docs/diagrams/graphs.mdx`.
