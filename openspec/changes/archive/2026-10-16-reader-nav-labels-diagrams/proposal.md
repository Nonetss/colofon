## Why

Reading the guide repository (`documentacion`) in the reader shows four defects:

- **Empty sections.** A folder holding only `index.mdx` (`docs/diagrams/`) shows as a section with a chevron and nothing to unfold.
- **Entity pages are orphaned.** An entity page (`catalogo/field-kinds/booleano`) is not in the navigation, so the sidebar neither opens nor marks the type it belongs to.
- **Raw field names.** Entity pages, type tables and page headers label fields with their raw key (`FAMILY`, `FILES`), and the entity table adds `fuente` as if it were a field.
- **Diagrams as bullet lists.** A diagram still renders as a captioned list of bullets.

The reference site (`doc-sjd`) solved the first two and labelled its fields in Spanish. This change brings the reader up to that level and finally draws the declared diagrams.

## What Changes

- **Folders with only an index.** A folder whose only page is its `index.mdx` is a page in the navigation (no chevron, no children). This applies both with and without `menu.yaml`.
- **Sidebar for pages outside the navigation.** For a page the navigation does not list (an entity page), the sidebar treats the closest listed page above it as current. It marks that entry and opens the sections that hold it, the way it does for listed pages. The search keeps leaving entity pages out.
- **Field labels.** A field declaration (in `_tipo.yaml` `campos`, nested `objeto` fields and `doc.config.yaml` `cabecera`) may set `etiqueta`, the text shown for that field. The reader uses it on entity pages, type and `<Entities>` tables and the page header's field list, and falls back to the field name when it is not set. This is an additive, optional key, so contract version `"1"` stays. The editor JSON schemas accept it.
- **`fuente` on entity pages.** `fuente` is no longer a row of the entity's field table. It is shown as a note under it ("Fuente: manual").
- **Drawn diagrams.** `<Diagram>` and the entity page's "Diagramas" section render an SVG laid out by the platform:
  - nodes, with their name, `sub`, icon and kind;
  - connections, with their labels;
  - zones, as boxes around their nodes;
  - entity nodes linking to their pages.
  It follows `direccion`, is theme-aware and zoomable. The text version stays inside the figure as its accessible alternative and stays the diagram's Markdown in `llm.txt`. **BREAKING** (visual only): the figure's markup changes for anyone styling `.doc-diagram`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `content-pages`:
  - "Navigation tree": a folder with no page besides its `index.mdx` is a page, not a section.
  - "Entities component": column headers use the field's label.
- `content-menu`: "Navigation from the menu". A folder entry with no page besides its index is a page.
- `content-contract`: "Field kinds" adds the optional `etiqueta` to every field declaration.
- `content-catalog-pages`: "Entity page" shows field labels and moves `fuente` out of the table. The type page inherits the labelled columns from `<Entities>`.
- `content-diagrams`: "How a diagram renders" is replaced by a drawn SVG, with the text version kept as its alternative and as its Markdown.
- `documentation-reader`:
  - "Sidebar navigation": the closest listed page above the current one is marked and its sections are opened.
  - "Page view": header fields are shown by their label.
- `content-editor-schemas`: the generated schemas accept `etiqueta` on field declarations.

## Impact

- **`packages/content`:**
  - `pages/nav.ts`: index-only folders become pages.
  - `meta-schema.ts`, `editor-schemas.ts`: `etiqueta`.
  - `pages/entities.ts`, `pages/catalog-pages.ts`: labels and `fuente`.
  - `pages/diagrams.ts` plus a new layout and SVG module.
  - `pages/to-hast.ts`: the sanitize schema allows the SVG subset.
- **New dependency:** `elkjs` in `packages/content`, the layered layout engine, run on the server while diagrams are read. A source of Lucide icon nodes is needed to draw node icons; see the design.
- **`packages/api`:** `v1/docs` output gains `label` on header fields. The handler fills it.
- **`apps/frontend`:**
  - `features/docs/shared/model/nav.ts` (`sectionsAbove`, a new "current entry" helper) and `sidebar/components/docs-nav-tree.tsx`.
  - `doc-hero.astro` (field labels).
  - `global.css` (diagram styles).
  - `page/model/markdown.ts` (the diagram's Markdown ignores the SVG).
  - Tests for each.
- **Content repositories:** none break. `documentacion` can add `etiqueta` to its fields afterwards, in its own repository.
- **No database or migration changes.**
