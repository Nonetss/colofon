---
name: diagrams
description: The diagrams/ folder of this content repository, one diagram per file shown with <Diagram>. Covers when a diagram earns its place, choosing the form (drawn by hand, one of the 30 typed forms the platform lays out from data, or a hand-drawn SVG illustration), a reference per type with its keys, layout, budget and anti-patterns, recipes for architecture, deployment and data models drawn by hand, the platform's look, linking pieces to the catalog, and checking a diagram. Use before drawing, changing or reusing any diagram.
---

# Diagrams (`diagrams/`)

One diagram per file in `diagrams/`, the file name as its id, shown in any
page with `<Diagram id="…" />` in a block of its own. The platform reads it,
checks it, lays it out when it has a `type`, and draws it with its own look in
light or dark. The guide explains the contract for writers in its
`diagrams` section; this skill is how **you** pick and write a diagram well.
The repository as a whole is in the `documentation` skill.

The typed forms are ported from
[diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT, Cathryn
Lavery): their layout grammars, budgets and anti-patterns, onto the platform's
look. The references below keep that spirit for our JSON.

## 1. Philosophy

**The highest-quality move is usually deletion.**

- Every piece is a distinct idea. Two pieces that always travel together are
  one piece.
- Every connection carries information. If the layout already says it, drop
  the line.
- The accent is **editorial, not a flag**: one or two things the reader should
  see first. The platform warns past two.
- A diagram isn't done when everything is in. It's done when nothing can be
  taken out.

**Target density: 4/10.** Complete enough to be right, light enough to read
without the page around it. Past a dozen pieces it is probably two diagrams.

## 2. When to draw

Draw when the reader learns more from the picture than from a paragraph, a
list or a table. Before drawing, ask: *would a well-written paragraph do?*

**Don't draw:**

- A list of things → a list, or an `<Entities>` table if it is catalog data.
- Attributes side by side → a table.
- One box and one arrow → a sentence.
- Something the catalog already holds as data → link the entities from the
  pieces instead of retyping them.

## 3. Choosing the form

1. **Do the pieces follow a rule** (a flow of decisions, a tree, events in
   time, values)? Use its **type**: the platform places everything, checks the
   budget, and the reader and agents get a real text version. Pick it in the
   table below.
2. **Does where each piece sits carry the meaning** (an architecture, a
   deployment, a data model)? **Draw it by hand**: no `type`, every box and
   arrow placed (`references/drawn.md`), following the recipe for its kind.
3. **Is it a figure no data describes** (an exploded view, a floor plan)? An
   **`.svg` illustration** (`references/illustration.md`): it has no text
   version, so its `<desc>` must say everything.

**Always read the reference of the form you chose before writing**, plus
`references/items.md` for a typed form and `references/style.md` for the look.

### Typed forms (30)

| If you're showing… | Use `type` | Reference |
| --- | --- | --- |
| Decision logic with branches | `flowchart` | [type-flowchart.md](references/type-flowchart.md) |
| States and what moves a thing between them | `state` | [type-state.md](references/type-state.md) |
| Parent → children | `tree` | [type-tree.md](references/type-tree.md) |
| Who owns what, reports to whom | `org-chart` | [type-org-chart.md](references/type-org-chart.md) |
| What depends on what, with shared dependencies and cycles | `dependency` | [type-dependency.md](references/type-dependency.md) |
| Time-ordered messages between actors | `sequence` | [type-sequence.md](references/type-sequence.md) |
| Events on a time axis | `timeline` | [type-timeline.md](references/type-timeline.md) |
| Tasks and phases with dates | `gantt` | [type-gantt.md](references/type-gantt.md) |
| A process across people or teams, with handoffs (and its inputs, outputs and tools: `process`) | `swimlane` | [type-swimlane.md](references/type-swimlane.md) |
| Work in progress by state | `kanban` | [type-kanban.md](references/type-kanban.md) |
| A narrative backbone sliced into releases | `story-map` | [type-story-map.md](references/type-story-map.md) |
| What a person does across stages, and how it feels | `journey` | [type-journey.md](references/type-journey.md) |
| Two-axis positioning or prioritisation | `quadrant` | [type-quadrant.md](references/type-quadrant.md) |
| A value chain against how evolved each part is | `wardley` | [type-wardley.md](references/type-wardley.md) |
| Overlap between two or three sets | `venn` | [type-venn.md](references/type-venn.md) |
| A ranked hierarchy (or drop-off: `funnel`) | `pyramid` | [type-pyramid.md](references/type-pyramid.md) |
| Stacked levels of abstraction | `layers` | [type-layers.md](references/type-layers.md) |
| A reinforcing cycle with a shared hub | `loop` | [type-loop.md](references/type-loop.md) |
| Causes of one effect, grouped | `fishbone` | [type-fishbone.md](references/type-fishbone.md) |
| Levels per row × column (permissions, coverage) | `matrix` | [type-matrix.md](references/type-matrix.md) |
| Quantities across categories (or two values each: `dumbbell`) | `bar` | [type-bar.md](references/type-bar.md) |
| A start total bridged to an end total by signed steps | `waterfall` | [type-waterfall.md](references/type-waterfall.md) |
| Trends over time (`slope`, `ridgeline`, `stream`, `bump`) | `line` | [type-line.md](references/type-line.md) |
| Correlation or distribution (`bubble`, `beeswarm`) | `scatter` | [type-scatter.md](references/type-scatter.md) |
| A grid where one cell or cluster stands out | `heatmap` | [type-heatmap.md](references/type-heatmap.md) |
| Part of a whole by area (`marimekko`) | `treemap` | [type-treemap.md](references/type-treemap.md) |
| Entities scored on 3 to 6 criteria | `radar` | [type-radar.md](references/type-radar.md) |
| One series over cyclic categories (`lollipop`) | `polar` | [type-polar.md](references/type-polar.md) |
| A quantity splitting and merging across stages | `sankey` | [type-sankey.md](references/type-sankey.md) |
| How an architecture changes, before and after | `architecture-delta` | [type-architecture-delta.md](references/type-architecture-delta.md) |

### Drawn by hand

| If you're showing… | Recipe |
| --- | --- |
| Components and connections of one system | [drawn-architecture.md](references/drawn-architecture.md) |
| An end-to-end platform by phases | [drawn-high-level.md](references/drawn-high-level.md) |
| Today's landscape and its pain points | [drawn-it-state.md](references/drawn-it-state.md) |
| Data moving between roles | [drawn-data-flow.md](references/drawn-data-flow.md) |
| Sources → platform → consumers | [drawn-dp-integration.md](references/drawn-dp-integration.md) |
| Where software runs | [drawn-deployment.md](references/drawn-deployment.md) |
| Quality tiers of the same data | [drawn-medallion.md](references/drawn-medallion.md) |
| Scope by containment | [drawn-nested.md](references/drawn-nested.md) |
| Entities and relationships | [drawn-er.md](references/drawn-er.md) |
| Real tables, types and foreign keys | [drawn-db-schema.md](references/drawn-db-schema.md) |
| Classes, operations and inheritance | [drawn-uml-class.md](references/drawn-uml-class.md) |

Rules of thumb:

- If a three-column table says the same, write the table.
- If two types fit, pick the dominant axis (time, hierarchy, quantity…).
- If you're past the budget, split into an overview and a detail.

### Say the plan first

Before writing a new diagram, state in one short message the form (type and
variant, or drawn and its recipe), the pieces it will hold and what the budget
forces out. Skip it only when the request already pins all three.

## 4. Universal anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Drawing by hand what a type lays out | Coordinates to maintain, no budget check, a poorer text version |
| The accent on every important piece | Nothing stands out; the platform warns past two |
| A box for every file, a line for every relation | Density 9/10; nobody reads it |
| Labels that are sentences | Labels say what travels or is chosen, in short capitals; the sentence goes in `info` |
| Retyping catalog data as boxes | Link the entity (`"entity": "<type>/<id>"`): it takes its name and its page lists the diagram |
| A legend written as notes | The platform draws the legend; rename its entries with `kindNames`/`edgeNames` in a drawn diagram |
| Colour for decoration | Hues group (a zone, a series); one accent focuses |
| Secrets in names, labels or `info` | Everything here is published and read by agents |
| An illustration for a structure | It has no text version: readers and agents lose it |

Type-specific anti-patterns live in each reference.

## 5. The look

The platform draws every diagram with its own theme: paper, hairlines, one
accent colour, ten hues and the reader's fonts; you never pick colours or
fonts. What you control (kinds, shapes, hues, focal pieces, accent paths) and
how the legend and text measurement work: `references/style.md`.

## 6. Writing and checking

- One file per diagram, `diagrams/<id>.json` or `.svg`; the id is lowercase
  with digits and hyphens and says what it shows. Follow the naming the
  site's existing diagrams use, and `AGENTS.md` «Este sitio» when it sets one.
- Keys are English; names, tags, labels and `info` are in the language of the
  site's prose.
- **A piece that exists in the catalog is an entity** (`"entity":
  "<type>/<id>"`); otherwise `"page"` links it to a page of the site.
- Check it before finishing: `references/checking.md` (the editor, the
  platform's report, what each problem means, a visual check).

## 7. The site's diagrams

- **Before drawing a new one, look in `diagrams/`** for one that already says
  it, and at the pages that show it (`grep -rn '<Diagram id="<id>"' docs`).
  `AGENTS.md` «Este sitio» lists the site's main diagrams and when each must
  change, when it has such a list.
- Before reusing a diagram in another page, check it still says what that
  page needs; otherwise write a new one.
- When what a diagram shows changes (a piece added, removed or moved), update
  the diagram in the same change as the page or entity that changed.
