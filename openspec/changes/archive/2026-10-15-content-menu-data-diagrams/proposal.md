## Why

A content repository's sidebar is today whatever its `docs/` folders happen to be: grouping pages differently means moving files and changing URLs, and the icons are free strings in page headers that validate even when misspelt and then draw nothing. The catalog (`catalogo/`) only exists underneath (`<Entities>` tables, `catalogo:` links, validation): unlike the `datos/` of the earlier documentation site it cannot be browsed, and an entity without a page is plain text. Diagrams are YAML blocks written inside a page, cannot be reused, and nothing validates them.

## What Changes

- **`menu.yaml`**, an optional file at the root of a content repository, declares the sidebar: groups with a title, an icon and a description, each listing page paths, section folders and catalog paths in order. Folders store pages; the menu decides where they show. Pages the menu leaves out go to a last "Otros" group with a problem on each. Without `menu.yaml` the navigation is built from the folders as today.
- **YAML wins over MDX.** Where `menu.yaml` gives an entry a title or an icon, that is the page's title and icon everywhere it is shown, whatever its header says; a header that disagrees is reported. The header is only the fallback for what the YAML leaves out.
- **Typed icons.** Every `icono` (in `menu.yaml`, `_tipo.yaml`, page headers and diagram nodes) SHALL be the name of a Lucide icon of the version the web draws. The editor schemas list the names, so the editor completes them and marks a wrong one.
- **Browsable catalog.** The platform generates reader pages for the catalog, with no MDX behind them: `/<slug>/catalogo` (every type with its count), `/<slug>/catalogo/<type>` (the type's table) and `/<slug>/catalogo/<type>/<id>` (the entity's fields, the pages that cite it, the entities that point at it and the diagrams it appears in). They are served by the same reader procedures and routes as pages, so they get the layout, the search, `llm.txt` and the sortable tables for free. **BREAKING** (content): `docs/catalogo/` becomes reserved; pages under it are reported and not served.
- `catalogo:` links and `<Entities>` labels of an entity without a page now link to its generated catalog page instead of rendering as plain text.
- **`diagramas/`**: each diagram is a file `diagramas/<id>.yaml` (Spanish contract keys: `titulo`, `descripcion`, `direccion`, `nodos`, `conexiones`, `zonas`), validated against the catalog, and shown in any page with `<Diagram id="…" />`. **BREAKING** (content): a ` ```diagram ` fenced block in a page is reported and shown as a notice pointing at `diagramas/`. Until a later change draws them, a diagram renders as a figure with its title, description and its connections as text.
- The editor schema catalog adds `menu.yaml` and `diagramas/*.yaml`, completing page paths, catalog paths, entity references and icon names.
- `menu.yaml` is a declaration like `doc.config.yaml`: a broken one keeps the last valid declarations in use.

## Capabilities

### New Capabilities

- `content-menu`: the `menu.yaml` file, its groups and entries, how they form the navigation, the "Otros" group and the precedence of `menu.yaml` over page headers.
- `content-catalog-pages`: the reader pages the platform generates for the catalog (hub, type, entity) and what each shows.
- `content-diagrams`: diagram files under `diagramas/`, their format and validation, the `<Diagram>` component and how a diagram renders until it is drawn.

### Modified Capabilities

- `content-contract`: the layout gains the optional `menu.yaml` and `diagramas/` and reserves `docs/catalogo/`; `icono` in `_tipo.yaml` is a Lucide icon name.
- `content-pages`: the header's `icono` is a Lucide icon name; the accepted MDX gains `<Diagram>` and refuses ` ```diagram ` blocks; `catalogo:` links and `<Entities>` labels link to the entity's catalog page when it has no page; the navigation tree follows `menu.yaml` when there is one.
- `content-editor-schemas`: the catalog and schemas cover `menu.yaml` and `diagramas/*.yaml`, and icon fields list the Lucide names.
- `content-source`: `menu.yaml` is one of the declarations whose last valid version is kept.
- `documentation-reader`: the sidebar, the "Todos" home and the search show the menu's groups.
- `documentation-llm-text`: the indexes label pages with their group.

## Impact

- `packages/content`: new readers for `menu.yaml` (in `loadContent`) and `diagramas/`; navigation built from the menu in `pages/site.ts`; generated catalog pages; `<Diagram>` in the page transform; icon names list generated from Lucide; new editor schemas.
- `packages/api`: `v1.docs` outputs gain the group node of the navigation and serve the generated catalog pages through `page`; the editor schema routes add `menu` and `diagram`.
- `apps/frontend`: the sidebar, the "Todos" home, the search and the `llms.txt` builders show groups; `bun run icons:catalog` also writes the Lucide names for `packages/content`.
- No database change, no new dependency.
- The example content repository (`documentacion`, a separate repository) gains `menu.yaml`, moves its diagrams to `diagramas/` and updates its agent skill.
