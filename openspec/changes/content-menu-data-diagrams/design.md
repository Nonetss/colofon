## Context

See proposal.md for the motivation. How the content is read today:

- `loadContent` (`packages/content/src/load.ts`) reads the **declarations**: `doc.config.yaml` and every `_tipo.yaml`. The backend keeps the last valid declarations per repository (`content-source`).
- `readCatalog` validates every entity. `readSite` (`pages/site.ts`) reads every page in two passes (headers, then bodies), builds the folder tree (`NavNode`: `page` | `section`), the reading order and the breadcrumbs. `transformPage` resolves links, `<Callout>` and `<Entities>` into a sanitized hast tree (`SANITIZE_SCHEMA`).
- `packages/api` caches one `Site` per clone (`v1/content/reader.ts`) and serves it through `v1.docs.nav`, `v1.docs.page` and `v1.docs.file`. `apps/frontend` renders `/[repo]/[...path]` on the server. Tables in a page body are already sortable and searchable in the browser (`interactive-tables.ts`), key/value tables get their own style (`dataTableKv`), and "Copiar en Markdown" and `llm.txt` turn the hast tree back into Markdown (`markdown.ts`).
- Icons are only checked against a kebab-case pattern (`ICON_PATTERN` in `pages/header.ts`, `z.string()` in `meta-schema.ts`). The frontend draws them with `lucide-react/dynamic`, and `bun run icons:catalog` already generates the Lucide catalog from the installed `lucide-react` for the entity icon picker.

## Goals / Non-Goals

**Goals:**
- Resolve the menu, the titles and icons (YAML before MDX), the catalog pages and the diagrams **once**, in `packages/content`, so the sidebar, the page header, the search, the home and `llms.txt` all show the same thing without each one re-applying the rules.
- Reuse the page pipeline (procedures, route, layout, interactive tables, Markdown) for the catalog pages instead of building a second reader.

**Non-Goals:**
- Drawing diagrams (layout, SVG, interactivity). The text rendering in `content-diagrams` is the fallback that a later drawn version will keep as its text alternative.
- Special views per type (a glossary by letter, coverage charts). The catalog pages are generic.
- Listing entity pages in the navigation or in `llms.txt`.
- Any database change.

## Decisions

### 1. `menu.yaml` is a declaration; the paths it names are checked with the pages

`loadContent` reads `menu.yaml` with its own meta-schema (shape, keys, icon names) and adds it to `ContentDeclarations` as `menu: Menu | null`. A structural error makes the declarations invalid, so the last valid ones are kept, as for a `_tipo.yaml`. Whether a path exists is checked in `readSite`, where the pages are known. A missing or overlapping entry becomes a problem on `menu.yaml` and is skipped, so a page renamed in one commit does not throw away the whole menu.

*Alternative:* read `menu.yaml` in `readSite` and fall back to the folder tree when it is broken. Rejected: a typo would swap the curated menu for the folder tree until it is fixed, which goes against "invalid content never replaces valid content".

### 2. One navigation model with a `group` node

`NavNode` gains `{ kind: "group"; title; description; icon; children }`, with no path. Groups appear only at the top level, and only when there is a menu. A menu entry becomes the node the folder tree would give for that path (a `section` with its subtree, or a `page`), with the entry's `titulo`/`icono` already applied. `catalogo` is a `section` whose children are the type pages. The "Otros" group runs the folder-tree builder over the pages no entry covers. Without a menu, the top level is the folder tree followed by the `catalogo` section.

Breadcrumbs become `{ path: string | null; title }`, where `null` marks a group: text without a link. `v1.docs` reflects this in `docsOutput` (a `group` variant of the nav node, and a nullable `path`/`href` in a breadcrumb).

*Alternative:* model groups as sections with a synthetic path. Rejected: a group has no route, and inventing one would make `/<slug>/<group>` look like it should exist.

### 3. YAML precedence is applied when the site is built

`readSite` reads every header first (it already does), then builds an `effective` title and icon per path: the menu entry's value when set, otherwise the header's. That map feeds the nav nodes, the `SitePage` header returned by `page`, the breadcrumbs, the section listings and `titleOf` (used by `<Entities>` `ficha` cells). Consumers never see the header's value where the menu overrides it. When both are set and differ, a problem is added to the page.

### 4. Catalog pages are generated `SitePage`s

After reading the catalog and the diagrams, `readSite` adds a `SitePage` for `catalogo`, for each `catalogo/<type>` and for each valid `catalogo/<type>/<id>`. Each has a synthetic header and a hast body built with the same helpers as `<Entities>` (`pages/entities.ts`):

- **Catalog:** a table of types.
- **Type:** the `<Entities type>` table, with the type's invalid entities as its problems.
- **Entity:** a key/value table that the frontend already styles; a link to the entity's `ficha` page; "Páginas que la citan"; one "Referencias" table per referencing type; "Diagramas".

`source` gains `"generated"`. These pages have no previous or next page, and the API serves them through `page` unchanged. Any `docs/catalogo/**` page is dropped with a problem before the tree is built.

The link helper used by `<Entities>`, `catalogo:` links and diagram nodes falls back to `catalogo/<type>/<id>` when an entity has no `ficha` page. It lives in one place in `entities.ts`.

*Alternative:* new `v1.docs.catalog*` procedures plus React pages using `DataTableView`. Rejected: that duplicates the route, the layout, the header, `llm.txt` and the Markdown for pages that read like any other page. The page tables are already interactive.

### 5. Backlinks and reverse references are collected while building

- **Citations:** while transforming each page, `transformPage` records the `<type>/<id>` of every `catalogo:` link it resolves. `readSite` adds the ids that the header's `ref` fields name, walking the `cabecera` field definitions.
- **Reverse references:** one pass over the valid entities walks each value by its type's field definitions (`ref` at any depth, inside `lista` and `objeto`) and builds `Map<"<type>/<id>", Map<referencingType, Entity[]>>`.
- **Diagram membership:** comes from the diagrams' `entidad` nodes.

All three are computed per site build and cached with it.

### 6. Diagrams are read with the pages, parsed into a normalized form

A new `pages/diagrams.ts` lists `diagramas/*.yaml` and validates each file with a schema built against the catalog index (entity refs as `<type>/<id>`). It parses `conexiones` items into `{ from, to, label }`; an item may be `a -> b` as text, or a one-key map `{ "a -> b": label }`, since YAML reads `- a -> b: label` as a map. The result is `Map<id, { diagram, problems }>`, where `diagram` keeps whatever parts are valid.

`<Diagram id>` is handled in `transformPage` next to `<Entities>`. It renders a `figure` with:

- a `figcaption` holding the title and the description;
- one list per zone;
- a list of connections, where entity nodes are linked with the shared link helper.

The diagram's file problems are added to the page, as invalid entities are for `<Entities>`. `figure` and `figcaption` are added to `SANITIZE_SCHEMA`, and `markdown.ts` writes the figure as its caption followed by its lists. A ` ```diagram ` fence is turned into a notice with a problem in the same transform.

The contract keys are Spanish (`titulo`, `descripcion`, `direccion`, `nodos`, `entidad`, `nombre`, `sub`, `icono`, `tipo`, `conexiones`, `zonas`), like the rest of the contract. The English draft that `documentacion` wrote in its skill is translated when it is migrated.

### 7. Lucide names come from the installed `lucide-react`

`apps/frontend/scripts/generate-icon-catalog.ts` (`bun run icons:catalog`) also writes `packages/content/src/lucide-icons.generated.ts`: the sorted `iconNames` of `lucide-react/dynamic`, the same set `DynamicIcon` can draw. `packages/content` exports a `LUCIDE_ICON_NAMES` tuple and one `iconName` Zod schema, an enum with a Spanish error. That schema is used by the header, `_tipo.yaml`, `menu.yaml` and diagram nodes, so the JSON Schemas list the names. A frontend unit test checks that the generated list matches the installed `iconNames`, so upgrading `lucide-react` without regenerating fails the tests.

*Alternative:* add `lucide-react` or `lucide-static` as a dependency of `packages/content`. Rejected: it pulls React into a server package and could drift from the version the web draws.

### 8. Editor schemas

`editor-schemas.ts` adds a `menu` schema and a `diagram` schema, both built from the repository's declarations and index. The menu's path enum is the page paths, the folders, `catalogo` and `catalogo/<type>`. The diagram's `entidad` enum is every `<type>/<id>`. Both get routes next to `config` and `type` in the content router, and catalog entries matching `menu.yaml` and `diagramas/*.yaml`. The index gains the folder paths, which it does not hold today.

## Risks / Trade-offs

- **Stricter icons can invalidate declarations.** A `_tipo.yaml` or `menu.yaml` icon that Lucide lacks now makes the declarations invalid, so the last valid ones are kept. Mitigation: the editor marks wrong icons before the push, and the `documentacion` icons are checked as part of the migration. Page headers only get a page problem.
- **Breaking content rules.** `docs/catalogo/` and ` ```diagram ` blocks now produce problems. Mitigation: the only content repository is `documentacion`, migrated in this change. Both are reported, not fatal.
- **Cost of the site build.** The build grows with one generated page per entity plus the reverse-reference pass. Mitigation: it is linear in the catalog size and cached per checkout like the rest of the `Site`.
- **Diagrams render as text only.** Until a later change draws them, they show as text, which is less useful than a picture. Mitigation: the format is validated and stable now, so drawing them later changes no content.
- **Large icon enums in JSON Schemas** (about 1,700 names in several schemas). This is acceptable for an editor schema, which is fetched once and cached by the extension.

## Migration Plan

1. Ship the platform change. Repositories without `menu.yaml` or `diagramas/` keep working; their only new problems are icons Lucide lacks, ` ```diagram ` blocks and `docs/catalogo/`.
2. In `documentacion` (a separate repository):
   - add `menu.yaml`;
   - move the inline diagrams to `diagramas/` with Spanish keys and cite them with `<Diagram>`;
   - move section icons to the menu;
   - update `.agents/skills/doc/` (`layout.md`, `pages.md`, `diagrams.md`, `catalog.md`) and the README.
3. Rollback: revert the platform commit. The content's new files are then simply ignored, except for `<Diagram>`, which falls back to the "unknown component" notice.
