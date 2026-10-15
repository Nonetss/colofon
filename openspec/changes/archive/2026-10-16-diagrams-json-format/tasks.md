## 1. Reading diagram files (`packages/content`)

- [x] 1.1 Add `jsonc-parser` to `packages/content` (its only consumer, so pinned there rather than in the root catalog), remove `elkjs` and the now unused `lucide`; `bun install` succeeds and `check-types` passes for `@nonete/content`
- [x] 1.2 Add a strict JSON parse helper next to `parseYaml` in `load.ts` (no comments, no trailing commas, syntax errors with line and column, empty file reported); tests in `tests/load.test.ts` cover a valid object, a syntax error's line/column and a trailing comma
- [x] 1.3 Add `src/pages/diagram-measure.ts` porting `textWidth`, `fit` and `tableHeight` from `lib.mjs`; unit tests pin the widths of a few known strings and a table height
- [x] 1.4 Rewrite the diagram types and zod schemas in `diagrams.ts` for both forms (drawn and `chain`), with `lib.mjs`'s keys, `entity`/`page`, `$schema`, and `diagramSchemas(entityKeys, pagePaths)`; tests: a valid drawn diagram, a valid chain, unknown key, missing `desc`
- [x] 1.5 Implement the cross-reference checks (unique ids, `from`/`to`/`toZone`/`zone`/`needs` existence, a box in one zone, `entity` in the catalog, `page` among the pages, right-angle segments, `label` ⇒ `at`, badge ⇒ no `points` + both ends) with the downgrade each spec scenario states; one test per `content-diagrams` scenario under "Nodes, connections and zones"
- [x] 1.6 Implement the measured problems (name, `sub`, table column, tag + name, badges) and `chain` placement; tests for "Name too wide" and the chain's positions and size
- [x] 1.7 Update `readDiagrams`: list `*.json`, report `.yaml`/`.yml` files as now being `.json`, pass page paths in, drop the layout step; tests for "Old YAML diagram" and "One broken diagram"
- [x] 1.8 Delete `diagram-layout.ts` and `tests/pages/diagram-layout.test.ts`; `grep -r diagram-layout packages` finds nothing

## 2. Drawing (`packages/content`)

- [x] 2.1 Rewrite `diagram-svg.ts` as a hast port of `lib.mjs`'s `diagram()`: paper, plain/pill/cylinder boxes with framed tags, table boxes, hues, rounded right-angle edges with own-path arrowheads, masked labels, badges, zones with titles over the arrows, notes, and the LEYENDA strip with `kindNames`/`edgeNames`/`badgeName` and wrapping; classes `doc-diagram-*`, `data-*` for the interaction, `data-info` instead of `<title>`; rewrite `tests/pages/diagram-svg.test.ts` for the "Drawn diagram", "Hue from the zone", "Badge" and "Entity node in the drawing" scenarios
- [x] 2.2 Widen `DIAGRAM_SVG_ATTRIBUTES` in `to-hast.ts` to exactly the attributes the drawing emits; a test sanitizes a full drawing and finds every `data-*` attribute kept and no `id`/`style`/event attribute
- [x] 2.3 Rebuild `diagramFigure`'s caption and text version from boxes' `zone` and edges/badges with ends, and `diagramsByEntity` from boxes' `entity`; tests for "Text version" and "Markdown without the drawing", and the catalog page's "Diagramas" section in `tests/pages/catalog-pages.test.ts`
- [x] 2.4 Update `transform.ts` messages and the inline ```diagram notice to name `diagramas/<id>.json`; `tests/pages/mdx.test.ts` and `tests/pages/site.test.ts` pass with JSON fixtures

## 3. Editor schemas and API

- [x] 3.1 Point `editor-schemas.ts`'s diagram entry at `diagramas/*.json` and feed it page paths; `tests/editor.test.ts` covers the "Diagram entry" and "Diagram suggestions" scenarios
- [x] 3.2 Move `packages/api/tests/v1/content/*` diagram fixtures to JSON and update expectations; `bun run test` passes in `packages/api`

## 4. Reader (`apps/frontend`)

- [x] 4.1 Port `lib.mjs`'s `STYLE`, `HUE_STYLE`, `BADGE_STYLE` and doc-sjd's `--d-*` light/dark tokens, focus/fade/down rules and the card styles into `global.css` under `doc-diagram-*`, replacing the old diagram rules and covering `.doc-lightbox-drawing`; `bun run tailwind:check` and Biome pass
- [x] 4.2 Add `features/docs/page/model/diagram-graph.ts` (edges model, `touches`, `farEnds`, `fallsWith`, trace, card lists) with unit tests in `apps/frontend/tests/unit/features/docs/page/` for the "Hovering a box" and "What falls with a box" scenarios and a trace
- [x] 4.3 Add `features/docs/page/model/diagram-highlights.ts` (DOM reading, lit/faded classes, the card, pointer/focus/touch/Escape, lightbox `dialog` host) without casts, set up once from `page-scripts.ts`; a DOM unit test checks a hover lights the right elements and a first touch tap prevents the link
- [x] 4.4 Check `doc-lightbox.tsx` still opens a drawing off its links and does not open on the touch tap the highlight consumes; adjust and cover in its existing tests if needed

## 5. Docs and validation

- [x] 5.1 Rewrite the diagrams section of `docs/human/contenido.md` (and its file table row) for `diagramas/<id>.json`, with a short drawn example and a chain example
- [x] 5.2 Update the `stack` skill reference that mentions the diagram drawing (`references/frontend/navigation-and-layouts.md`) for the interaction module
- [x] 5.3 Run `bun run check-types`, Biome and `bun run test` from the root; all pass
- [x] 5.4 Hand off to the user: `documentacion`'s `diagramas/*.yaml`, `catalogo/files/diagram-file.yaml` and its diagram pages/skill references need the JSON format (outside this repo); list the exact files
