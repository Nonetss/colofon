## Why

A diagram file can only take two forms today: a drawn diagram, where the content places every box, arrow and zone, and a chain of boxes in one row. That is enough for architecture schemes. It is not enough for the rest of what documentation draws: sequences, state machines, timelines, Gantt charts, trees, quadrants, funnels, Sankeys or plain data charts. A writer either fakes them with absolute boxes or leaves them out. [diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT) specifies about 45 editorial diagram types, each with a precise layout grammar and complexity budget. It is an authoring skill for an LLM, not a renderer, so the platform cannot embed it. It can port its grammars as typed diagram forms that the platform lays out, validates and draws.

## What Changes

- A diagram file MAY declare `type`. Without it, the file is read exactly as today (drawn diagram or chain), so every existing diagram keeps rendering unchanged.
- Each `type` value is a typed form with its own keys. The content gives the data: actors and messages, tasks and dates, values and series. The platform computes the layout, checks it against the type's complexity budget and draws it with the same sanitized SVG, theme tokens, legend, caption, text version and `llm.txt` output as today's diagrams. A type MAY offer variants (`line` → slope, ridgeline, stream, bump).
- Types ported from diagram-design, grouped by layout family:
  - **graph**: flowchart, state machine, tree, org chart and dependency graph;
  - **time and flow**: sequence, timeline, Gantt, swimlane/process, kanban, story map and user journey;
  - **concept**: quadrant, Wardley map, Venn, pyramid/funnel, layer stack, loop/flywheel, fishbone and matrix (security matrix);
  - **chart**: bar/dumbbell, waterfall, line (slope, ridgeline, stream, bump), scatter (bubble, beeswarm), heatmap, treemap/marimekko, radar, polar and Sankey;
  - **comparison**: architecture delta, which takes a before and an after drawing and derives the ledger of added, removed, changed and rewired pieces.
- The drawn form grows what the architecture-like types need: the shapes `diamond`, `circle` and `rounded`, curved edges and self-loops (`route: "curve"`), and table boxes with a second section of rows, used for UML class operations. Architecture, high-level, IT current-state, data flow, DP integration, deployment, medallion, nested, ER and database schema stay drawn diagrams. They are documented as recipes, not new types.
- A diagram MAY instead be a hand-drawn `diagramas/<id>.svg`, meant for the illustrations that no data can lay out (exploded axonometric, axonometric plan). Its `<title>` and `<desc>` are required. It goes through a strict whitelist: shapes, text, groups and transforms, and colours only through the platform's role classes. Anything removed is reported. It gets no interaction.
- Typed diagrams are interactive like drawn ones. Graph and flow types reuse the box/arrow highlighting. Chart marks show a card with their label and value and light up their series.
- Exceeding a type's complexity budget (for example, more than 8 Sankey nodes) is reported as a problem on the file, like a name that does not fit, and the diagram still renders.
- The editor's diagram schema covers every typed form, discriminated by `type`.
- Not included: diagram-design's animated variants, its brand profiles and its draw.io, Mermaid and Excalidraw importers.

## Capabilities

### New Capabilities

- `content-diagram-types`: the typed diagram forms. For each type and variant: its keys, how the platform lays it out, its complexity budget, how it renders and what its text version says.

### Modified Capabilities

- `content-diagrams`: diagram files accept `type` and `.svg` files; the drawn form gains shapes, curved edges, self-loops and table sections; rendering, measured problems and interaction extend to typed diagrams and SVG illustrations.
- `content-editor-schemas`: the diagram schema covers every typed form and the new drawn-form values.

## Impact

- `packages/content/src/pages/`:
  - `diagram-schema.ts`, `diagrams.ts`, `diagram-svg.ts`, `diagram-measure.ts` and `to-hast.ts`, whose sanitizer schema gains `circle`, `ellipse`, `line`, `polyline`, `polygon` and `tspan` and the new classes and `data-*` attributes;
  - a new `diagram-types/` folder with one module per type family;
  - an SVG illustration reader.
- `packages/content/src/editor-schemas.ts`: the diagram schema union.
- `apps/frontend`: `features/docs/diagrams/model/diagram-graph.ts` and `diagram-highlights.ts` for chart marks and series; `styles/global.css` for the classes of the new types, in light and dark.
- Tests in `packages/content/tests/pages/` and `apps/frontend/tests/unit/features/docs/diagrams/`, with fixtures for each type.
- `doc-example` (the content repository with the "Escribir documentación" guide): a `docs/diagrams/` section with a page per family, a working example of every type, and a `diagram-types` catalog type.
- One new dependency in `packages/content`: `hast-util-from-html`, from the unified family already in use, to parse illustrations. There is no layout library, no database change and no API shape change beyond the editor schema's content.
