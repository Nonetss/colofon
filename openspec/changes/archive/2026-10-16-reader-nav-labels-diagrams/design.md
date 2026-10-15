## Context

The reader builds everything on the server from a clone:

- **`packages/content`** reads `docs/`, `catalogo/`, `menu.yaml` and `diagramas/`. It builds the navigation (`pages/nav.ts`) and the generated catalog pages (`pages/catalog-pages.ts`, `pages/entities.ts`). It turns diagrams into a figure (`pages/diagrams.ts` → `diagramFigure`). Every body is a hast tree sanitized with `SANITIZE_SCHEMA` (`pages/to-hast.ts`).
- **`packages/api`** (`v1/docs`) serves the navigation, the pages and the header fields.
- **`apps/frontend`** renders the trees to HTML (`page/model/render.ts`). The sidebar is a React island over `v1.docs.nav` (`sidebar/components/docs-nav-tree.tsx`, `shared/model/nav.ts`). The `llm.txt` Markdown comes from the same tree (`page/model/markdown.ts`), and images open in `doc-lightbox.tsx`.

For motivation, see `proposal.md`. For the behaviour, see the delta specs.

## Goals / Non-Goals

**Goals:**

- Fix the navigation shape (index-only folders) at the source, so the sidebar, cards, breadcrumbs and search all agree.
- Make the sidebar find its place for any page under a listed one, without listing entity pages.
- One field-label rule (`etiqueta`, falling back to the name), used by every place that shows a field name.
- Draw diagrams on the server, deterministically, without client JavaScript for the drawing itself.

**Non-Goals:**

- Listing entity pages in the sidebar or in the search. The spec keeps them out.
- Labels inside `objeto` values rendered as `name: value` in table cells. They keep the field name for now.
- Interactive diagrams (hover highlighting of a node's connections, filtering) and hand-placed positions.
- Changing the contract version: `etiqueta` is optional and additive.
- Touching the content repository `documentacion`. Adding labels there is a follow-up in that repository.

## Decisions

### 1. Index-only folders become pages in `nav.ts`

In `buildTree` and `entryNode`, a folder whose subtree has no `.mdx` besides its own `index.mdx` produces `{ kind: "page" }` with the folder's path. The folder's `index.mdx` is already read at that path, so title, icon, order and route stay the same. Doing it at the source fixes the sidebar, the section cards (`pagesMeta`), the section page's child list and `arrange`'s breadcrumbs in one place.

- **Alternative:** hide the chevron when `children` is empty, in the frontend only. Rejected: the node would still be a "section" everywhere else, and the cards would say "1 ficha".
- The frontend still guards against an empty `section` (no chevron), as defense for repositories read before the change.

### 2. The sidebar's "current entry" is the deepest listed prefix

A new helper in `features/docs/shared/model/nav.ts`, `currentHref(nodes, pathname)`, returns the href of the deepest navigation link whose href equals `pathname` or is a path prefix of it (`/a/b` is a prefix of `/a/b/c`, not of `/a/bc`). Two things use it:

- `sectionsAbove` opens the sections that hold that href, instead of the exact pathname.
- `DocsNavTree`/`SubTree` compare each node with it, instead of with `pathname`.

For `/prueba/catalogo/field-kinds/booleano`, the result is the type page `…/catalogo/field-kinds`, under the section "Referencia". The home link (`/prueba`) is a prefix of everything, so it is ignored unless it is the exact match. That mirrors `doc-sjd`'s prefix match without putting entities in the nav payload.

- **Alternative:** list entity pages in the navigation as hidden children. Rejected: it inflates `v1.docs.nav` with every entity of every repository, and the spec keeps them out of the nav and the search.

### 3. `etiqueta` on field declarations, resolved once

- **Contract:** `meta-schema.ts` adds an optional non-empty `etiqueta` to the field declaration schema. That schema is shared by `campos`, nested fields and `cabecera`, so all three get it.
- **One helper:** `fieldLabel(name, field)` (in `pages/entities.ts`, beside `shownValue`) returns `field.etiqueta`, or `name` when it is not set.
- **Users:**
  - `fieldsTable` on the entity page.
  - The table headers of `typeTable`/`<Entities>`. The `id`, `fuente` and `actualizado` columns keep their names.
  - The API's header fields: `output.ts` adds `label: string` beside `name`, `handler.ts` fills it from `cabecera`, and `doc-hero.astro` shows `label`.
  - The editor schemas set a property's `title` to its `etiqueta`.
- **Same key name as the type's `etiqueta`:** a type already has an `etiqueta`, meaning "the field used as the entity's name". The new key lives one level deeper, inside a field, so the two never collide in YAML, and the user chose this name. The contract spec states that they are unrelated. `documentacion`'s guide must explain both when it adopts the new key.
- **Alternative:** `titulo` per field. It would avoid the double meaning, but the user picked `etiqueta`.

### 4. `fuente` becomes a note

`fieldsTable` stops appending `fuente`. `entityBody` adds `<p class="doc-entity-source">Fuente: …</p>` after the table when `fuente` is a string. If the entity sets nothing else, the `id` fallback row stays.

### 5. Diagram layout with ELK on the server, while diagrams are read

- **Engine:** `elkjs` (the bundled build, no worker) in `packages/content`, using the `layered` algorithm:
  - `elk.direction`: `RIGHT` for `derecha`, `DOWN` for `abajo`.
  - Zones are compound nodes, with `hierarchyHandling: INCLUDE_CHILDREN` so connections can cross zone borders.
  - Edge labels are placed by ELK (`edgeLabels.placement: CENTER`).
- **When it runs:** `elk.layout` is asynchronous, so it runs inside `readDiagrams` (already async). The resulting geometry is stored on the `Diagram` (`layout: DiagramLayout | null`). Rendering (`diagramFigure`, the entity page's "Diagramas") stays synchronous and just draws stored geometry.
- **Determinism:** nodes, edges and zones are passed to ELK in declaration order with fixed options, so the same diagram is laid out the same way every time it is read.
- **Box sizes:** there is no DOM to measure text on the server, so sizes are estimated as `characters × average glyph width` for the reader's font at the diagram's font sizes, plus padding, the icon and the `sub` line. Edge label sizes are estimated the same way. The CSS fixes those font sizes, so the estimate matches what is drawn.
- **Alternatives:**
  - **dagre:** has no compound-node edge routing across clusters, and its edge labels are weaker.
  - **Mermaid:** it draws in the browser, needs the DOM, and brings its own styling and syntax.
  - **Layout in a client island:** it would need client JS and a hydration flash, and `llm.txt`/SSR would get no drawing.

### 6. SVG as hast, through the same sanitizer

A new module `pages/diagram-svg.ts` turns the layout into hast:

- `<svg viewBox role="img" aria-label="<titulo>. <descripcion>">` with a `<title>`.
- Zones are `<g class="doc-diagram-zone">` (a rect and a title `<text>`).
- Nodes are `<g class="doc-diagram-node" data-kind>` (a rect, an icon `<g>`, name and `sub` `<text>`). An entity node is wrapped in `<a href>`.
- Edges are `<path class="doc-diagram-edge">`, with the arrowhead drawn as its own small `<path>` and labels as `<text>` on a backing `<rect>`.

`SANITIZE_SCHEMA` gains an explicit SVG allow-list: `svg, g, rect, path, text, tspan, title, a, circle, line, polyline, polygon`, with only geometry attributes, `class`, `role`, `aria-label`, `data-kind` and `href` (same protocols as `<a>`). It has no `style`, no `id` and no `on*`. No ids means no `<marker>`/`url(#…)`, which the sanitizer's id clobbering would break anyway. Content text (names, labels) only ever lands in text nodes, so it is escaped.

### 7. Icons from `lucide`, pinned with `lucide-react`

- **Source:** node icons are drawn from the `lucide` package's icon nodes (`[tag, attrs][]`). `lucide` is pinned to the same version as `lucide-react` in the root catalog, so the names accepted by `icon-name.ts` (`LUCIDE_ICON_NAMES`) are the names that can be drawn.
- **Guard:** a test asserts that every accepted name resolves to an icon node.
- **Fallback:** an unknown icon draws nothing (the name was already reported as a problem when read).
- **Alternative:** emit a placeholder and hydrate icons on the client. Rejected for the same reason as decision 5: the drawing must be complete without JS.

### 8. Look, theme and figure markup

- **Look:** the drawing copies the reference site's diagrams (`doc-sjd`, `site/esquemas/lib.mjs`):
  - outlined boxes with the name centred in sans 600 over a monospace `sub`;
  - `almacen` drawn as a cylinder and `entrada` with a soft fill;
  - thin arrows with rounded corners;
  - monospace labels on a mask, wrapped on several lines;
  - dashed zones titled in small capitals;
  - a legend when more than one kind of node is used.
- **Theme:** colours are `--d-*` variables on the figure (paper, ink, muted, soft, rule, accent, surface, input, store), mixed from the theme tokens in `global.css`. Because the SVG is inline, light and dark themes apply. The lightbox's copy gets the same variables.
- **Size:** as in the reference site, the SVG has no width of its own and fills the column; below 640px it keeps 640px and scrolls sideways. Boxes share one height. Left to right, each column has the width its widest name needs: a first layout finds the columns, and a second one uses their widths. That keeps drawings near the reference's ~1000px. The lightbox shows a copy at screen size.
- **Figure markup:** `figcaption`, then `<div class="doc-diagram-canvas">`, then `<div class="doc-diagram-text">` (zones and connections). With a drawing (`data-drawn`), the caption and the text are kept off screen, visually hidden, for screen readers and the Markdown. The user asked for no visible caption and no "Ver como texto" toggle. Without a drawing, they show.
- **Markdown:** `markdown.ts` drops the canvas and unwraps the text block. The Markdown therefore stays caption, zones and connections, as before.
- **Lightbox:** `doc-lightbox.tsx` also opens a click on `.doc .doc-diagram-canvas` (outside node links), and clones the SVG into its stage inside a `.doc` wrapper, so the clone keeps the theme. `zoom.ts` is unchanged.
- **Flow order:** `cycleBreaking: MODEL_ORDER` makes the written order the flow. A zone is placed where its first node is declared.

## Risks / Trade-offs

- **Text-width estimate is off for wide glyphs or long words, so text overflows its box.** → Use a conservative average width, add padding, and wrap `sub` at a fixed width into `tspan` lines before sizing. A unit test covers that a long name widens its box.
- **`elkjs` adds about 1.5 MB to the backend bundle and some CPU per sync.** → Diagrams are few and laid out once per read, not per request. A diagram whose layout throws is reported on its file, and the drawing is left out, so only the text version shows.
- **Asynchronous layout ties diagram reading to `readDiagrams`.** → Callers already await it. Tests that build diagrams synchronously use `readDiagram` (sync, no layout) plus an explicit `layoutDiagram`.
- **The SVG allow-list widens the sanitizer's surface.** → The list is limited to geometry attributes, with no `style`, `id` or `xlink:href`, and URLs use the existing protocol check. A test feeds a diagram whose names and labels contain markup and checks that they come out as text.
- **`lucide` and `lucide-react` could drift apart.** → The two versions are pinned together in the catalog, and the test from decision 7 fails on drift.
- **Visual breaking change for `.doc-diagram`.** → Only this repository styles it, and it is updated in the same change.

## Migration Plan

There are no data or migration steps. The new dependencies are `elkjs` and `lucide`, both in `packages/content`. Once the backend is deployed, the next read of each repository draws its diagrams. Rolling back means reverting the change. `etiqueta`, if already written in a repository, would then be refused as an unknown key, so add labels to `documentacion` only after this ships.
