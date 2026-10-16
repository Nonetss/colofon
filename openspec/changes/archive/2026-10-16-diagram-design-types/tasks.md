## 1. Foundation: registry, scene and reports

- [x] 1.1 Load the `stack` skill and read `references/writing-unit-tests.md` and `references/code-style.md`; read diagram-design's `style-guide.md`, `primitives-core.md` and `layout-budget.md` for the shared grammar
- [x] 1.2 Add `pages/diagram-types/index.ts`: the type registry (`keys`, `schemas(references)`, `budget`, `read`, `textVersion`) and the `Scene` type (boxes, edges, zones, notes, marks, guides, legend) in `pages/diagram-types/scene.ts`
- [x] 1.3 Route `readDiagram` in `pages/diagrams.ts` by `type`: no `type` keeps today's drawn/chain path unchanged; an unknown `type` is reported listing the registered types; a typed form's extra keys and unknown `variant` are reported
- [x] 1.4 Add the typed item reader (`pages/diagram-types/items.ts`): `name`/`sub`/`info`/`hue`/`focal`/`entity`/`page`, id uniqueness and reference checks, reusing `entityOf`/`linkOf` from `diagrams.ts` (export them, don't copy); make `diagramsByEntity` count typed items
- [x] 1.5 Add `pages/diagram-types/values.ts`: number and date parsing, Spanish number formatting with `unit`/`decimals`, and Spanish short month names
- [x] 1.6 Add `checkBudget` and the accent count over the laid-out scene for every form, including drawn diagrams and chains (`pages/diagram-types/budget.ts`)
- [x] 1.7 Extend `diagram-svg.ts` to draw `marks` and `guides` and a per-type legend, and to emit `data-series`, `data-value` and `data-kind`; keep the drawn and chain output byte-identical (existing `diagram-svg.test.ts` must pass untouched)
- [x] 1.8 Widen `SANITIZE_SCHEMA` in `pages/to-hast.ts` as design §6 states (elements, geometry attributes with value patterns, the new `data-*`), with no `style`, `id`, `href`, `use`, `defs` or events
- [x] 1.9 Let a typed diagram supply its text version (hast) to the figure and to `llm.txt`
- [x] 1.10 Tests: `packages/content/tests/pages/diagram-types/registry.test.ts` (no `type` unchanged, unknown type, foreign key, unknown variant), `items.test.ts` (entity naming and linking, missing reference left out), `values.test.ts` (formatting "1.234,5 €", bad date reported), `budget.test.ts` (over budget reported and still rendered, three accents reported), and a `to-hast` sanitizer test showing the new elements pass and `style`/`onclick`/`use` are stripped

## 2. Drawn-form growth

- [x] 2.1 Add the shapes `diamond`, `circle` and `rounded` to `diagram-schema.ts` and draw them in `diagram-svg.ts` (texts centred, tag centred on non-rectangles)
- [x] 2.2 Add `route` (`orthogonal` | `curve`): skip the diagonal check for curves and draw them as cubic Béziers through the points; add self-loops (from = to, no `points`), with the label beside them and no `at` needed
- [x] 2.3 Add `head` (`arrow`, `triangle`, `diamond`, `open-diamond`), drawn as their own paths
- [x] 2.4 Add `ops` to table boxes (a hairline, then rows; height includes them; `ops` without `rows` reported) and measure them
- [x] 2.5 CSS in `apps/frontend/src/styles/global.css` for the new shapes and heads, in light and dark
- [x] 2.6 Tests in `diagrams.test.ts`, `diagram-svg.test.ts` and `diagram-measure.test.ts`: diamond geometry, curved edge accepted, self-loop drawn and labelled, triangle head, `ops` height, `ops` without `rows` reported

## 3. Layout helpers

- [x] 3.1 `layout/ranks.ts`: longest-path ranks, barycentre ordering and cycle detection
- [x] 3.2 `layout/grid-route.ts`: orthogonal routing between grid cells through the gutters, back-links around the side and lanes per gutter
- [x] 3.3 `layout/tidy-tree.ts`: Reingold–Tilford, down and right
- [x] 3.4 `layout/scale.ts`: linear and time scales with nice ticks (week or month ticks for time)
- [x] 3.5 `layout/squarify.ts` and `layout/labels.ts` (greedy placement that reports what it cannot place)
- [x] 3.6 Tests per helper in `packages/content/tests/pages/diagram-types/layout/`: ranks of a diamond graph and a detected cycle, no route crossing a cell, parents centred over children, ticks for 870 → 0..1000 by 200, monthly ticks for Jan–Jun, squarify areas proportional, labels never overlapping

## 4. Graph family

- [x] 4.1 `flowchart` (step kinds incl. `io` parallelogram, automatic or given row/col, routed links, decision exits ≤ 3)
- [x] 4.2 `state` (rounded states, initial dot, final ringed dot, self-loops)
- [x] 4.3 `tree` and `org-chart` (single root check, `direction`, `role` tag, `dotted` lines)
- [x] 4.4 `dependency` (ranks, accent cycle, "depende de" text version)
- [x] 4.5 Register each with its budget, schemas and text version; CSS for their parts
- [x] 4.6 Tests per type in `packages/content/tests/pages/diagram-types/`: each spec scenario (automatic rows, retry loop, two roots, shared dependency), the budget and the text version

## 5. Time and flow family

- [x] 5.1 `sequence` (lifelines, message kinds, self-calls, fragments with one nesting level, overlap reported)
- [x] 5.2 `timeline` (time or even scale, alternating labels, spans)
- [x] 5.3 `gantt` (phases, tasks, milestones, `today`, start after end reported)
- [x] 5.4 `swimlane` and its `process` variant (lanes, columns, chips)
- [x] 5.5 `kanban`, `story-map` (release cut) and `journey` (sentiment curve, pain markers)
- [x] 5.6 Register them, with CSS
- [x] 5.7 Tests per type: the spec scenarios (return message, proportional spacing, monthly ticks, handoff, over limit, release cut, sentiment curve), budgets and text versions

## 6. Concept family

- [x] 6.1 `quadrant` and `wardley` (0–100 coordinates, out of range reported, moves)
- [x] 6.2 `venn` (2–3 sets, region labels in their intersection)
- [x] 6.3 `pyramid` with the `funnel` variant (value widths, drop-offs) and `layers`
- [x] 6.4 `loop` (ring, closing arrow, hub and write-backs) and `fishbone` (alternating bones, root bone in the accent)
- [x] 6.5 `matrix` (levels, shading, row length and unknown level reported, Markdown table)
- [x] 6.6 Register them, with CSS
- [x] 6.7 Tests per type: the spec scenarios, budgets and text versions

## 7. Chart family

- [x] 7.1 `bar` (vertical/horizontal, 1–2 series, focal, `dumbbell`) and `waterfall` (running total, end total)
- [x] 7.2 `line` with `slope`, `ridgeline`, `stream` and `bump`
- [x] 7.3 `scatter` with `bubble` (area ∝ size) and `beeswarm` (non-overlapping rows)
- [x] 7.4 `heatmap` (single-hue ramp via `fill-opacity`, never invisible, focal cell)
- [x] 7.5 `treemap` with `marimekko`
- [x] 7.6 `radar` and `polar` with `lollipop`
- [x] 7.7 `sankey` (one scale, horizontal ribbon ends, conservation check, column order)
- [x] 7.8 Register them, with CSS for marks, guides and series hues
- [x] 7.9 Tests per type: the spec scenarios (round axis, slope with three points, bubble area, ramp, areas, value above scale, leaking node), value-count mismatches, budgets and Markdown-table text versions

## 8. Architecture delta

- [x] 8.1 Read `before` and `after` with the drawn-form readers, compare by box id and connection, and build the ledger (added, removed, changed, moved, rewired, unchanged)
- [x] 8.2 Draw "Antes", "Cambios" and "Después" side by side, with the marks; check that `changes` ids exist
- [x] 8.3 Tests: the extracted-service scenario, each change class, an unknown `changes` id, and the ledger text version

## 9. Illustrations

- [x] 9.1 Add `hast-util-from-html` to `packages/content` (`bun add` in that workspace)
- [x] 9.2 `pages/diagram-illustration.ts`: list `.svg` files in `readDiagrams`, report an id repeated by a `.json`, parse, walk the whitelist, count and report removals per kind, map the role classes to `doc-diagram-ill-*`, and require `viewBox`, `<title>` and `<desc>`
- [x] 9.3 `<Diagram>` falls back to the illustration when there is no JSON file; the text version is empty; no interaction attributes
- [x] 9.4 CSS for the `doc-diagram-ill-*` roles and the hue classes, light and dark
- [x] 9.5 Tests in `packages/content/tests/pages/diagram-illustration.test.ts`: valid illustration, 14 hex fills reported once, script and `onclick` stripped (also asserted after `SANITIZE_SCHEMA`), missing `<desc>`, unparsable file, same id as a JSON

## 10. Reader interaction

- [x] 10.1 `diagram-graph.ts`: read marks and series, add `markHighlight` (mark plus its series, card with label, series, value and info) and the legend-entry series highlight
- [x] 10.2 `diagram-highlights.ts`: target marks and legend entries; never attach to illustrations
- [x] 10.3 Tests in `apps/frontend/tests/unit/features/docs/diagrams/diagram-graph.test.ts` and `diagram-highlights.test.ts`: hovering a bar lights its series with the "1.200 usuarios" card, a legend entry lights its series, and an illustration gets no listeners

## 11. Editor schema

- [x] 11.1 Build the diagram schema in `editor-schemas.ts` as the union of drawn, chain (with `type` forbidden) and every registered typed form with its `type` literal and `variant` values
- [x] 11.2 Tests in `packages/content/tests/editor.test.ts`: a Gantt file gets `phases`/`today` and refuses `nodes`, and a typed item's `entity` lists the catalog's keys

## 12. Documentation

- [x] 12.1 `doc-example` (the "Escribir documentación" content repository): the `diagram-types` catalog type and one entity per type, the `diagram_types` header field, and `docs/diagrams/` as a section — the overview, the drawn form (with the new shapes, curves, heads and `ops`), one page per family with a working example diagram of every type and variant in `diagramas/`, before-and-after, and illustrations — crediting diagram-design (MIT)
- [x] 12.2 Keep `doc-example`'s agent instructions in step: `AGENTS.md`'s map, the `documentation` skill's `references/diagrams.md` and `references/catalog.md`, the `files` entities and the served `skills/doc-writing/SKILL.md`; the whole repository reads with no problem on the platform

## 13. Validation

- [x] 13.1 Run `bun run check-types`, Biome (`bun run check`), `bun run tailwind:check` and `bun run test` from the repo root, and fix what they report
