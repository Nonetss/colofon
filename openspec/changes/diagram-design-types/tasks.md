## 1. Foundation: registry, scene and reports

- [ ] 1.1 Load the `stack` skill and read `references/writing-unit-tests.md` and `references/code-style.md`; read diagram-design's `style-guide.md`, `primitives-core.md` and `layout-budget.md` for the shared grammar
- [ ] 1.2 Add `pages/diagram-types/index.ts`: the type registry (`keys`, `schemas(references)`, `budget`, `read`, `textVersion`) and the `Scene` type (boxes, edges, zones, notes, marks, guides, legend) in `pages/diagram-types/scene.ts`
- [ ] 1.3 Route `readDiagram` in `pages/diagrams.ts` by `type`: no `type` keeps today's drawn/chain path unchanged; an unknown `type` is reported listing the registered types; a typed form's extra keys and unknown `variant` are reported
- [ ] 1.4 Add the typed item reader (`pages/diagram-types/items.ts`): `name`/`sub`/`info`/`hue`/`focal`/`entity`/`page`, id uniqueness and reference checks, reusing `entityOf`/`linkOf` from `diagrams.ts` (export them, don't copy); make `diagramsByEntity` count typed items
- [ ] 1.5 Add `pages/diagram-types/values.ts`: number and date parsing, Spanish number formatting with `unit`/`decimals`, and Spanish short month names
- [ ] 1.6 Add `checkBudget` and the accent count over the laid-out scene for every form, including drawn diagrams and chains (`pages/diagram-types/budget.ts`)
- [ ] 1.7 Extend `diagram-svg.ts` to draw `marks` and `guides` and a per-type legend, and to emit `data-series`, `data-value` and `data-kind`; keep the drawn and chain output byte-identical (existing `diagram-svg.test.ts` must pass untouched)
- [ ] 1.8 Widen `SANITIZE_SCHEMA` in `pages/to-hast.ts` as design §6 states (elements, geometry attributes with value patterns, the new `data-*`), with no `style`, `id`, `href`, `use`, `defs` or events
- [ ] 1.9 Let a typed diagram supply its text version (hast) to the figure and to `llm.txt`
- [ ] 1.10 Tests: `packages/content/tests/pages/diagram-types/registry.test.ts` (no `type` unchanged, unknown type, foreign key, unknown variant), `items.test.ts` (entity naming and linking, missing reference left out), `values.test.ts` (formatting "1.234,5 €", bad date reported), `budget.test.ts` (over budget reported and still rendered, three accents reported), and a `to-hast` sanitizer test showing the new elements pass and `style`/`onclick`/`use` are stripped

## 2. Drawn-form growth

- [ ] 2.1 Add the shapes `diamond`, `circle` and `rounded` to `diagram-schema.ts` and draw them in `diagram-svg.ts` (texts centred, tag centred on non-rectangles)
- [ ] 2.2 Add `route` (`orthogonal` | `curve`): skip the diagonal check for curves and draw them as cubic Béziers through the points; add self-loops (from = to, no `points`), with the label beside them and no `at` needed
- [ ] 2.3 Add `head` (`arrow`, `triangle`, `diamond`, `open-diamond`), drawn as their own paths
- [ ] 2.4 Add `ops` to table boxes (a hairline, then rows; height includes them; `ops` without `rows` reported) and measure them
- [ ] 2.5 CSS in `apps/frontend/src/styles/global.css` for the new shapes and heads, in light and dark
- [ ] 2.6 Tests in `diagrams.test.ts`, `diagram-svg.test.ts` and `diagram-measure.test.ts`: diamond geometry, curved edge accepted, self-loop drawn and labelled, triangle head, `ops` height, `ops` without `rows` reported

## 3. Layout helpers

- [ ] 3.1 `layout/ranks.ts`: longest-path ranks, barycentre ordering and cycle detection
- [ ] 3.2 `layout/grid-route.ts`: orthogonal routing between grid cells through the gutters, back-links around the side and lanes per gutter
- [ ] 3.3 `layout/tidy-tree.ts`: Reingold–Tilford, down and right
- [ ] 3.4 `layout/scale.ts`: linear and time scales with nice ticks (week or month ticks for time)
- [ ] 3.5 `layout/squarify.ts` and `layout/labels.ts` (greedy placement that reports what it cannot place)
- [ ] 3.6 Tests per helper in `packages/content/tests/pages/diagram-types/layout/`: ranks of a diamond graph and a detected cycle, no route crossing a cell, parents centred over children, ticks for 870 → 0..1000 by 200, monthly ticks for Jan–Jun, squarify areas proportional, labels never overlapping

## 4. Graph family

- [ ] 4.1 `flowchart` (step kinds incl. `io` parallelogram, automatic or given row/col, routed links, decision exits ≤ 3)
- [ ] 4.2 `state` (rounded states, initial dot, final ringed dot, self-loops)
- [ ] 4.3 `tree` and `org-chart` (single root check, `direction`, `role` tag, `dotted` lines)
- [ ] 4.4 `dependency` (ranks, accent cycle, "depende de" text version)
- [ ] 4.5 Register each with its budget, schemas and text version; CSS for their parts
- [ ] 4.6 Tests per type in `packages/content/tests/pages/diagram-types/`: each spec scenario (automatic rows, retry loop, two roots, shared dependency), the budget and the text version

## 5. Time and flow family

- [ ] 5.1 `sequence` (lifelines, message kinds, self-calls, fragments with one nesting level, overlap reported)
- [ ] 5.2 `timeline` (time or even scale, alternating labels, spans)
- [ ] 5.3 `gantt` (phases, tasks, milestones, `today`, start after end reported)
- [ ] 5.4 `swimlane` and its `process` variant (lanes, columns, chips)
- [ ] 5.5 `kanban`, `story-map` (release cut) and `journey` (sentiment curve, pain markers)
- [ ] 5.6 Register them, with CSS
- [ ] 5.7 Tests per type: the spec scenarios (return message, proportional spacing, monthly ticks, handoff, over limit, release cut, sentiment curve), budgets and text versions

## 6. Concept family

- [ ] 6.1 `quadrant` and `wardley` (0–100 coordinates, out of range reported, moves)
- [ ] 6.2 `venn` (2–3 sets, region labels in their intersection)
- [ ] 6.3 `pyramid` with the `funnel` variant (value widths, drop-offs) and `layers`
- [ ] 6.4 `loop` (ring, closing arrow, hub and write-backs) and `fishbone` (alternating bones, root bone in the accent)
- [ ] 6.5 `matrix` (levels, shading, row length and unknown level reported, Markdown table)
- [ ] 6.6 Register them, with CSS
- [ ] 6.7 Tests per type: the spec scenarios, budgets and text versions

## 7. Chart family

- [ ] 7.1 `bar` (vertical/horizontal, 1–2 series, focal, `dumbbell`) and `waterfall` (running total, end total)
- [ ] 7.2 `line` with `slope`, `ridgeline`, `stream` and `bump`
- [ ] 7.3 `scatter` with `bubble` (area ∝ size) and `beeswarm` (non-overlapping rows)
- [ ] 7.4 `heatmap` (single-hue ramp via `fill-opacity`, never invisible, focal cell)
- [ ] 7.5 `treemap` with `marimekko`
- [ ] 7.6 `radar` and `polar` with `lollipop`
- [ ] 7.7 `sankey` (one scale, horizontal ribbon ends, conservation check, column order)
- [ ] 7.8 Register them, with CSS for marks, guides and series hues
- [ ] 7.9 Tests per type: the spec scenarios (round axis, slope with three points, bubble area, ramp, areas, value above scale, leaking node), value-count mismatches, budgets and Markdown-table text versions

## 8. Architecture delta

- [ ] 8.1 Read `before` and `after` with the drawn-form readers, compare by box id and connection, and build the ledger (added, removed, changed, moved, rewired, unchanged)
- [ ] 8.2 Draw "Antes", "Cambios" and "Después" side by side, with the marks; check that `changes` ids exist
- [ ] 8.3 Tests: the extracted-service scenario, each change class, an unknown `changes` id, and the ledger text version

## 9. Illustrations

- [ ] 9.1 Add `hast-util-from-html` to `packages/content` (`bun add` in that workspace)
- [ ] 9.2 `pages/diagram-illustration.ts`: list `.svg` files in `readDiagrams`, report an id repeated by a `.json`, parse, walk the whitelist, count and report removals per kind, map the role classes to `doc-diagram-ill-*`, and require `viewBox`, `<title>` and `<desc>`
- [ ] 9.3 `<Diagram>` falls back to the illustration when there is no JSON file; the text version is empty; no interaction attributes
- [ ] 9.4 CSS for the `doc-diagram-ill-*` roles and the hue classes, light and dark
- [ ] 9.5 Tests in `packages/content/tests/pages/diagram-illustration.test.ts`: valid illustration, 14 hex fills reported once, script and `onclick` stripped (also asserted after `SANITIZE_SCHEMA`), missing `<desc>`, unparsable file, same id as a JSON

## 10. Reader interaction

- [ ] 10.1 `diagram-graph.ts`: read marks and series, add `markHighlight` (mark plus its series, card with label, series, value and info) and the legend-entry series highlight
- [ ] 10.2 `diagram-highlights.ts`: target marks and legend entries; never attach to illustrations
- [ ] 10.3 Tests in `apps/frontend/tests/unit/features/docs/diagrams/diagram-graph.test.ts` and `diagram-highlights.test.ts`: hovering a bar lights its series with the "1.200 usuarios" card, a legend entry lights its series, and an illustration gets no listeners

## 11. Editor schema

- [ ] 11.1 Build the diagram schema in `editor-schemas.ts` as the union of drawn, chain (with `type` forbidden) and every registered typed form with its `type` literal and `variant` values
- [ ] 11.2 Tests in `packages/content/tests/editor.test.ts`: a Gantt file gets `phases`/`today` and refuses `nodes`, and a typed item's `entity` lists the catalog's keys

## 12. Documentation

- [ ] 12.1 `docs/human/contenido.md` "Diagramas": `type` and the list of types with a short example each, the drawn-form recipes for the architecture-like types, budgets and the accent rule, illustrations and their whitelist, and the credit to diagram-design (MIT)
- [ ] 12.2 Add a content fixture per type to the local `doc-test/` repository only if the user wants it (ask; it is untracked)

## 13. Validation

- [ ] 13.1 Run `bun run check-types`, Biome (`bun run check`), `bun run tailwind:check` and `bun run test` from the repo root, and fix what they report
