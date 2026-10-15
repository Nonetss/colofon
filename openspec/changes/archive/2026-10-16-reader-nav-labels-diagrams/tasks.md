## 1. Navigation: index-only folders

- [x] 1.1 In `packages/content/src/pages/nav.ts`, make `buildTree` (subfolders) and `entryNode` (folder entries) emit a `page` node when the folder holds no `.mdx` besides its `index.mdx`. Verify with new tests in `packages/content/tests` covering both cases: without a menu, and with a menu entry that sets `titulo`/`icono`.
- [x] 1.2 Check that `arrange` (`pages/site.ts`) still gives the folder's page its breadcrumbs, previous/next and no children. Verify with a site test on a repository holding `docs/diagrams/index.mdx` only.

## 2. Sidebar: current entry by prefix

- [x] 2.1 Add `currentHref(nodes, pathname)` to `apps/frontend/src/features/docs/shared/model/nav.ts`. It returns the deepest link whose href is `pathname` or a path-segment prefix of it, and ignores the home unless it is an exact match. Make `sectionsAbove` use it. Verify with unit tests in `apps/frontend/tests/unit`: exact page, entity under a type page inside a menu group, `/a/bc` not matching `/a/b`, no match.
- [x] 2.2 In `docs-nav-tree.tsx` and `docs-sidebar.tsx`, mark the active row with `currentHref` instead of `pathname`, and render no chevron for a `section` with no children. Verify with `check-types` and Biome.

## 3. Field labels (`etiqueta`)

- [x] 3.1 Add an optional non-empty `etiqueta` to the field declaration schema in `packages/content/src/meta-schema.ts`, so it applies to `campos`, nested fields and `cabecera`. Verify with tests: a valid label, and an empty label reported on `cabecera.files.etiqueta`.
- [x] 3.2 Add `fieldLabel(name, field)` in `pages/entities.ts` and use it for the `typeTable`/`<Entities>` column headers. `id`, `fuente` and `actualizado` keep their names. Verify with the "Labelled column" scenario as a test.
- [x] 3.3 In `pages/catalog-pages.ts`, name the `fieldsTable` rows with `fieldLabel`, drop the `fuente` row and add the "Fuente: …" note after the table. Verify with the "Labelled fields and source" scenario as a test.
- [x] 3.4 Set the property `title` from `etiqueta` in `editor-schemas.ts` (entity schemas), and make sure the type schema accepts `etiqueta`. Verify with the "Labelled field" scenario as a test.
- [x] 3.5 Add `label` to the header fields in `packages/api/src/v1/docs/output.ts` and fill it in `handler.ts` from `cabecera`. Verify with a handler test in `packages/api/tests/v1/docs/`: one field with a label, one without.
- [x] 3.6 Show `field.label` in `doc-hero.astro`. Verify with `check-types`.

## 4. Diagram layout

- [x] 4.1 Add `elkjs` and `lucide` to `packages/content`, with `lucide` pinned in the root catalog to the `lucide-react` version (ask the user before installing). Verify that `bun install` succeeds and both import from Bun.
- [x] 4.2 Write the text-size estimate (name, wrapped `sub` lines, edge labels) and `layoutDiagram(diagram)` in a new `pages/diagram-layout.ts`. It runs ELK `layered` with the direction, zones as compound nodes and `INCLUDE_CHILDREN`, and returns the node/zone boxes and the edge sections and label boxes. Verify with tests:
  - `derecha` grows along x and `abajo` along y;
  - every zone box encloses its nodes;
  - two runs give equal output;
  - a long name widens its box.
- [x] 4.3 Call `layoutDiagram` from `readDiagrams`, store `layout` on `Diagram`, and report a layout failure on the diagram's file with `layout: null`. Verify with a test where a diagram's layout fails (injected) and the text version still renders.

## 5. Diagram drawing

- [x] 5.1 Write `pages/diagram-svg.ts`, which turns a laid-out diagram into hast:
  - zones, nodes (icon from `lucide`, name, `sub`, `data-kind`), entity nodes wrapped in `<a>`;
  - edges with path arrowheads and labelled text;
  - `role="img"` and `aria-label`, with no ids or styles.
  Verify with tests: the "Drawn diagram" counts, the "Entity node in the drawing" link, and markup in a name coming out as text.
- [x] 5.2 Add a test that every name in `LUCIDE_ICON_NAMES` resolves to a `lucide` icon node. Verify that it passes.
- [x] 5.3 Extend `SANITIZE_SCHEMA` (`pages/to-hast.ts`) with the SVG allow-list from the design. Verify with a test: an `<svg>` tree survives sanitizing, while `style`, `id`, `on*` and a `javascript:` `href` are stripped.
- [x] 5.4 Rebuild `diagramFigure` as caption, then `.doc-diagram-canvas` holding the SVG (when `layout` is set), then `<details class="doc-diagram-text">` with the "Ver como texto" summary and the existing lists. Update the existing diagram figure tests and the "Text version" scenario.
- [x] 5.5 Make `apps/frontend/src/features/docs/page/model/markdown.ts` drop `.doc-diagram-canvas` and unwrap `details` without its `summary`. Verify with a test that the Markdown matches the previous text output ("Markdown without the drawing").
- [x] 5.6 Restyle `figure.doc-diagram` in `apps/frontend/src/styles/global.css`:
  - zone, node, kind, edge and label classes on theme tokens;
  - horizontal scroll on the canvas;
  - the `details` toggle.
  Verify with `bun run tailwind:check` and Biome.
- [x] 5.7 Make `doc-lightbox.tsx` accept `.doc figure.doc-diagram svg` and show a clone of the SVG in its stage. Verify with `check-types`. A visual check is left to the user.

## 6. Docs and validation

- [x] 6.1 Update the `stack` skill reference that describes content diagrams and catalog labels, if one states the old behaviour (search `.agents/skills/stack/references` for `diagram` and `etiqueta`). Verify that every path it cites exists.
- [x] 6.2 Run `bun run check-types`, Biome and `bun run test`. Verify that all pass. Then ask the user for screenshots of "Diagramas", an entity page and a page with header fields.
