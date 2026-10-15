## Context

- `packages/content` reads a repository in two places. `loadContent` (`load.ts`) reads `doc.config.yaml` and each `_tipo.yaml` into `ContentDeclarations` (`config`, `types`, and a `CatalogIndex` of entity ids and page paths); entity files are listed, never read. `readSite` (`pages/site.ts`) reads every `.mdx`, parses it (`parsePage`), reads its header, runs `transformPage` (problems, heading ids, alerts, `<Callout>`, link and image rewriting) and turns it into a sanitized hast tree (`pageToHast`).
- `packages/api` builds the `Site` once per clone folder and keeps it until the next successful sync (`v1/content/reader.ts`), so whatever `readSite` computes is paid once per sync, not per request.
- `entitySchema(type, index)` (`entity-schema.ts`) already validates one entity file against its type, with `ref` and `ficha` values checked against the index; the editor uses it through the JSON schemas.
- The reader renders the hast tree as given (`features/docs/page/model/render.ts`), wraps every `table` in a scrolling frame, and "Copiar en Markdown" converts the same tree with `hast-util-to-mdast`.
- `catalogo:` URLs match the transform's scheme test, are kept, and the sanitizer then drops the `href`: the text renders as a dead link today, without a problem.

## Goals / Non-Goals

**Goals:**

- `<Entities>` rendered on the server inside the page tree, so it is in the HTML and in "Copiar en Markdown" without any client code.
- One reading of the catalog per site build, shared by every page.
- Entity links and `catalogo:` links resolved with the same rule.

**Non-Goals:**

- Entity pages, type pages, or "pages that cite this entity".
- Sorting or filtering in the browser (a React island), pagination, or a `limit`/`filter` attribute.
- Column display names: the contract has no field labels, so headers are field names.
- The `diagram` code block used by the example home page.

## Decisions

### Read the catalog once, in `packages/content`

A new `readCatalog(root, declarations)` (`catalog.ts` at the package root, next to `load.ts`: it is not page-specific) reads every `catalogo/<type>/<id>.yaml`, validates it with `entitySchema`, and returns `Catalog = { types, entities: Map<typeId, Map<id, Entity>>, problems: Map<typeId, ContentProblem[]> }`, where `Entity = { id, label, page: string | null, values }`. The label and the page are computed here: the `etiqueta` value or the id; the value of the first `ficha` field in `campos` order. Invalid files are kept as per-type problems, not as entities.

`readSite` takes the catalog as a new argument (after `index`) and passes it into the transform context. `reader.ts` calls `readCatalog` inside `buildSite`, so the catalog is cached with the site and rebuilt on every sync like the pages.

Alternative: read entities lazily per `<Entities>`. Rejected: a type shown on two pages would be read and validated twice, and `catalogo:` links need the whole catalog anyway.

### Two passes over the pages for `ficha` titles

A `ficha` cell shows the target page's title, which is only known once that page's header is read. `readSite` is split into a first pass that parses every file and reads its header (`parsePage` + `readHeader`), and a second pass that transforms and converts each parsed tree with a `titleOf(pagePath)` lookup in the context. Sections without `index.mdx` fall back to the folder title the navigation already uses. No file is read twice.

### `<Entities>` becomes hast in the transform, not in `to-hast`

Like `<Callout>`, the transform replaces the `mdxJsxFlowElement` (and the paragraph holding a lone one-line element) in the mdast tree, here with an mdast node whose `data.hName`/`hChildren` carry the finished hast (`div.doc-entities` holding, per group, `p.doc-entities-group` and a `table`). Building hast directly avoids encoding a table cell's links and joined lists as mdast. The node is visited with `[SKIP, index]` so the old element's children are not visited.

The table is built by a pure function `entitiesTable(catalog, attributes, routes, titleOf)` in `pages/entities.ts`, returning `{ node, problems }`, so it is tested without a page. Rows are sorted with `localeCompare(…, "es")` on the label. Groups follow `valores` for `enum`, shown-value order otherwise, with the "left out" block last labelled "Sin <field>".

The sanitizer allow-list gains `div.doc-entities`, `p.doc-entities-group` and `p.doc-entities-empty`; tables and links are already allowed.

### `catalogo:` links in `resolveTarget`

`resolveTarget` checks a `catalogo:` prefix before the generic scheme test: `catalogo:<type>/<id>` with the type and entity present and a page → `{ kind: "url", url: routeOf(page) }`; present without a page → a new `{ kind: "text" }` target, rendered as a `span` with no class and no problem; missing → `{ kind: "broken" }` naming the link. Images keep refusing `catalogo:`.

### Reader styles and Markdown

`.doc :where(.doc-entities)` styles in `global.css`: group labels as micro-caps above each table (the `label` role values), the table frame already given by `render.ts`. The Markdown converter needs nothing: tables become GFM tables, group labels paragraphs.

## Risks / Trade-offs

- [A large catalog makes the first page read after a sync slower] → it is read once per sync and cached with the site; a few hundred YAML files parse in milliseconds.
- [Entity problems repeat on every page that shows the type] → they are only shown to admins and point at the file; one problem per file per page.
- [Headers are field names, so a Spanish-language repository with English field names shows English headers] → accepted until the contract gains field labels; columns can already be chosen per table.
- [`readSite`'s signature changes] → its only caller is `reader.ts`, plus the package's test fixtures (`tests/fixtures/site.ts`), updated in the same change.
