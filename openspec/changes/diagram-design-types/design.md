## Context

`packages/content` reads each `diagramas/<id>.json` (`pages/diagrams.ts`) against the zod pieces in `pages/diagram-schema.ts`. It reports every problem with its field path and salvages what is valid. It measures text with average glyph widths (`pages/diagram-measure.ts`) and draws the result as hast SVG (`pages/diagram-svg.ts`). That hast goes through the page sanitizer (`pages/to-hast.ts`, `SANITIZE_SCHEMA`), which allows only `svg`, `g`, `rect`, `path`, `text` and `title`, `doc-diagram-*` classes and a fixed set of `data-*` attributes, with no styles, ids, markers or `use`. Colours and fonts come from `apps/frontend/src/styles/global.css` on those classes, so drawings follow the theme. The reader's interaction (`features/docs/diagrams/model/diagram-graph.ts` and `diagram-highlights.ts`) reads the graph back from the `data-*` attributes alone. The editor schema (`editor-schemas.ts`) is generated from the same zod pieces.

The diagram is modelled as positioned boxes, orthogonal edges, zones and notes, and the content supplies every coordinate. diagram-design (MIT, `cathrynlavery/diagram-design`) is not code we can call: it is a set of per-type references (layout conventions, budgets, anti-patterns) and hand-written example SVGs for an LLM to imitate. What we take from it is the grammars.

## Goals / Non-Goals

**Goals:**

- Every diagram-design type that data can describe becomes a typed form that the platform lays out, so a writer gives data, not coordinates.
- One drawing pipeline: typed forms produce the same scene the drawn form does, go through the same sanitizer, theme, legend, caption, text version, `llm.txt` and lightbox, and reuse the interaction.
- Existing diagrams keep rendering byte-for-byte the same: no `type` means today's behaviour.
- Illustrations that no data can describe (exploded and axonometric drawings) can still be shown, safely.
- Each type family can be implemented and shipped on its own.

**Non-Goals:**

- diagram-design's animated variants, brand profiles and onboarding, and its draw.io, Mermaid and Excalidraw importers.
- Its typography (Instrument Serif, Geist) and orange accent: everything maps to the platform's tokens and faces.
- A general-purpose graph layout engine: layouts only need to be good within each type's budget.
- Client-side rendering: diagrams stay server-rendered hast, with TanStack Charts kept for the admin's live data.

## Decisions

### 1. `type` discriminates; absence keeps the current forms

`readDiagram` keeps its current path when `type` is absent: `items` selects a chain and anything else a drawn diagram. With `type`, it looks the type up in a registry, `pages/diagram-types/index.ts`, which maps each type name to a module exposing:

- `keys`, its accepted keys;
- `schemas(references)`, zod pieces built with the same `References` as `diagramSchemas`, so the editor gets entity and page suggestions;
- `budget`, a table of limits;
- `read(data, context, report)`, which returns a `Scene`;
- `textVersion(scene)`, which returns hast.

*Alternative:* a separate folder or extension per type (`diagramas/x.gantt.json`). Rejected because `type` keeps one file pattern for the editor schema catalog and one id namespace.

### 2. A shared `Scene` between layout and drawing

Every form lays out into one `Scene`:

- the existing `DiagramBox`, `DiagramEdge`, `DiagramZone` and `DiagramNote`;
- **marks**, data shapes (`rect`, `circle`, `path` and `polygon` primitives with a role class, an optional hue, an optional `series` and a datum `{ label, value, info }`);
- **guides**, axes, ticks, grid lines, rings, bands and their texts;
- a legend spec.

`diagram-svg.ts` draws boxes and edges as today and gains `marks` and `guides`. Types that are graphs at heart (flowchart, state, tree, org chart, dependency, swimlane, sequence actors and messages, Wardley components, loop steps) emit boxes and edges, so box and arrow highlighting, `needs`, `trace`, entity links and the "→ name" text version come for free. Chart types emit marks.

*Alternative:* one SVG writer per type. Rejected because it would duplicate the paper, legend, theme classes, link wrapping, sanitizer constraints and interaction attributes about thirty times.

### 3. Own small layout algorithms, no layout dependency

All layouts live under `pages/diagram-types/layout/`, are pure and are unit-tested on coordinates:

- **ranks**: longest path from the sources, with a barycentre pass to reduce crossings (flowchart, state, swimlane, dependency) and cycle detection;
- **grid routing**: orthogonal links from the side facing the target, through the row and column gutters, with back-links around the grid's side and lanes per gutter so parallel links do not overlap;
- **tidy tree** (Reingold–Tilford): tree and org chart;
- **scales**: linear and time scales with "nice" round ticks (1, 2, 5 × 10ⁿ), Spanish number and date formatting;
- **squarify**: treemap;
- **label placement**: a greedy pass that tries the preferred side, then the alternatives, reporting what cannot be placed (timeline, quadrant, scatter);
- **ribbons**: Sankey cubic paths with both control points at the column midpoint, as diagram-design specifies.

The budgets keep inputs tiny (at most 16–60 elements), so simple deterministic algorithms are enough. Determinism matters because the same content must render the same HTML for caching and tests.

*Alternatives:* `elkjs` gives better general routing but is about 1.5 MB, asynchronous and overkill within these budgets. `d3-hierarchy` and `d3-scale` are small and good, but scale ticks, squarify and tidy tree are about 200 lines in total, and owning them keeps layout free of dependencies and its output stable. This can be revisited for one algorithm if its quality falls short.

### 4. Drawn-form growth for architecture-like types

Architecture, high-level, IT current-state, data flow, DP integration, deployment, medallion, nested, ER, database schema and UML class are positioned compositions that the drawn form already expresses. They need:

- the shapes `diamond`, `circle` and `rounded`;
- `route: "curve"` (Catmull-Rom to cubic Bézier through the points) and self-loops;
- `head` (`triangle` and the two diamonds, for UML), drawn as their own paths like today's arrowheads;
- `ops` on table boxes.

They are documented as recipes in `docs/human/contenido.md`, with one example each. They are not new types, to keep the type count down, which is diagram-design's own advice (semantic patterns over new types).

### 5. Illustrations: own parser, whitelist and report, then the page sanitizer

`diagramas/<id>.svg` is parsed with `hast-util-from-html` in SVG space. It is a new direct dependency of `packages/content`, from the unified family the package already uses (`hast-util-sanitize`, `hast-util-to-html`). A walker applies the whitelist from the spec, counts what it removes per kind (element, attribute, class or value) and reports each kind once. It rewrites the role classes `ink`, `accent` and the others into `doc-diagram-ill-<role>` classes, which `global.css` maps to theme tokens. The result is then wrapped as a figure and still goes through `SANITIZE_SCHEMA`, which gains the extra elements and geometry attributes. That makes two layers: the walker gives readable reports, and the sanitizer remains the security boundary.

*Alternative:* serve the SVG as an `<img>`. Rejected because an `<img>` cannot follow the theme's tokens, and SVG text inside it is not accessible to the page.

### 6. Sanitizer widening, still with no styles

`SANITIZE_SCHEMA` gains:

- the elements `circle`, `ellipse`, `line`, `polyline`, `polygon` and `tspan`;
- the attributes `cx`, `cy`, `r`, `rx`, `ry`, `x1`, `y1`, `x2`, `y2`, `points`, `dx`, `dy` and `transform`, the last one only matching a `translate|rotate|scale|matrix(...)` pattern;
- `opacity`, `fill-opacity`, `stroke-width` and `stroke-dasharray` as numbers or number lists, `fill`/`stroke` = `none`, and `font-size`/`font-weight` as numbers;
- the new `data-*` attributes `dataSeries`, `dataValue` and `dataKind`.

`style`, `id`, `href` on SVG elements, `use`, `foreignObject`, `marker`, `defs`, `pattern` and event attributes stay out. The heatmap ramp and translucent fills use `fill-opacity`, not styles.

### 7. Interaction for marks and series

A mark is written as `data-node="m<i>"` with `data-series`, `data-label`, `data-value` (already formatted) and `data-info`. `diagram-graph.ts` gains a `series` map and a `markHighlight`, which lights the mark plus every node of its series and builds the card from `{label, series, value, info}`. Legend entries carry `data-series` and light the series. Items that are boxes (steps, states, actors' heads, cards) keep using `boxHighlight`. The code stays DOM-free in `diagram-graph.ts`, as today, and keeps its unit tests there.

### 8. Budgets, accents and measurement as reports

Each type module declares its budget as data, for example `{ nodes: 8, flows: 12, columns: 3 }`. A shared `checkBudget(counts, budget, typeLabel, report)` writes the Spanish messages. The two-accent rule counts focal boxes, accent edges and focal items or marks after layout, for every form, including today's drawn diagrams. That makes it a new warning on existing content, never a render change. Item texts are measured with `diagram-measure.ts` against the width the layout gives them.

### 9. Editor schema

`diagramSchemas(references).file` becomes `z.union([drawn, chain, ...typed])`, where each typed form is a `z.strictObject` with `type: z.literal(name)`. The JSON Schema generator turns it into `anyOf`. Editors resolve the branch from the `type` literal (VS Code's JSON service handles this well), and `drawn`/`chain` get `type: z.never().optional()`, so a file with `type` never falls into them.

### 10. Delivery order

The foundation comes first: registry, `Scene`, sanitizer, drawn-form growth, budgets, the interaction for marks and illustrations. Then one family per task group (graph, time and flow, concept, charts, delta), each with its fixtures, unit tests, CSS and author docs, so `/opsx:apply` can stop after any group with a shippable state. Unimplemented types are not in the registry yet, so they are reported as unknown rather than half-drawn.

## Risks / Trade-offs

- [Scope: about 30 types is a large change] → Families are independent task groups. Each family ships whole or not at all, and the spec is satisfied incrementally.
- [Orthogonal routing quality on dense flowcharts] → Budgets cap density (12 steps, 16 links). `row` and `col` let the writer fix a bad automatic placement. Layouts are unit-tested on coordinates and screenshotted by the user at review.
- [Label collisions in timelines, quadrants and scatters] → The greedy placement reports labels it cannot place instead of overlapping them silently, and the budgets cap the label counts.
- [Widening the sanitizer] → Only geometry attributes are added, with value patterns. No styles, references or scripts are allowed. Tests cover a hostile SVG fixture, through both the walker and `SANITIZE_SCHEMA`.
- [Editor `anyOf` errors become noisy when a file matches no branch] → The `type` literal narrows the branch. Unknown `type` is also reported by the platform with the list of types.
- [Diverging from diagram-design over time] → We port a snapshot. The ported reference version is recorded in a comment per module, and the platform does not track upstream automatically.
- [New accent warning on existing diagrams] → Report only, no render change. It is called out in the commit and in `contenido.md`.

## Migration Plan

No data migration. Existing `diagramas/*.json` files have no `type` and render unchanged. Rollback is a code revert: content using `type` would then be reported as an unknown key and show a notice, with no crash.

## Open Questions

- Are the Spanish sentiment slugs (`muy-mal` … `muy-bien`) and the Wardley stage names (Génesis, A medida, Producto, Commodity) the wording you want?
- Should illustrations also allow `<defs>`/`<linearGradient>` (some axonometric examples use gradients for depth), at the cost of allowing `id` and `url(#…)` references inside a scoped namespace?
