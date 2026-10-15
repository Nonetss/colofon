## 1. Typed Lucide icons

- [x] 1.1 Extend `apps/frontend/scripts/generate-icon-catalog.ts` to also write `packages/content/src/lucide-icons.generated.ts` (the sorted `iconNames` of `lucide-react/dynamic`), run `bun run icons:catalog`, and verify the file lists `server`, `map-pin` and `network`
- [x] 1.2 Add a frontend unit test that compares the generated list with the installed `iconNames`; verify it fails after removing one name from the generated file and passes once regenerated
- [x] 1.3 Export `LUCIDE_ICON_NAMES` and a shared `iconName` Zod schema (Spanish error "no es un nombre de icono de Lucide") from `packages/content`; use it for `icono` in `meta-schema.ts` (`_tipo.yaml`) and `pages/header.ts`, replacing `ICON_PATTERN`; verify with tests that `map-pin` passes and `cohete`/`netwrok` are reported on `icono`

## 2. `menu.yaml` declaration

- [x] 2.1 Add the `menu.yaml` meta-schema (`secciones` → `titulo`, `icono`, `descripcion`, `paginas` of text or `{ ruta, titulo, icono }`, strict keys) and read it in `loadContent` as optional `menu` in `ContentDeclarations`; verify with tests: valid menu, missing file (no problem), unknown key `orden` and a bad icon reported with field paths, declarations invalid on a structural error
- [x] 2.2 Add section folder paths to `CatalogIndex` (alongside `pagePaths`) for the menu checks and editor schema; verify with a loader test listing `network` and `containers/komodo` for the example layout

## 3. Navigation from the menu

- [x] 3.1 Add the `group` variant to `NavNode` and nullable `path` to breadcrumbs in `pages/site.ts`; build the top level from `menu.yaml` (pages, folders with their subtree, `catalogo`, `catalogo/<type>`), report missing, home and overlapping entries on `menu.yaml` and skip them; verify with `packages/content` tests for each scenario in `specs/content-menu` ("A folder shown in another group", "Missing page", "Overlapping entries")
- [x] 3.2 Build the "Otros" group from uncovered pages and type pages with a problem on each, and append the `catalogo` section when there is no menu; verify with tests for "A new page not yet in the menu" and "Old repository"
- [x] 3.3 Make reading order and breadcrumbs follow the menu (groups as text, catalog pages skipped); verify with tests for "Breadcrumbs follow the menu" and "Previous and next across groups"
- [x] 3.4 Resolve the effective title and icon per path (menu first, header second) and use it for nav nodes, page headers, breadcrumbs, children listings and `titleOf`; report a header `titulo`/`icono` that differs from its entry; verify with tests for "Icon set in both places" and "Only the header says it"

## 4. Generated catalog pages

- [x] 4.1 Move the entity link rule into one helper in `pages/entities.ts` (the `ficha` page, else `catalogo/<type>/<id>`) and use it for `<Entities>` labels, `ref` cells and `catalogo:` links; accept `catalogo:<type>` links to the type page; update the existing tests to the new scenarios in `specs/content-pages` ("Entity linked to its page", "Link to an entity", "Link to a type")
- [x] 4.2 Record the `catalogo:` targets each page links to during `transformPage`, add the ids named by header `ref` fields, and build the reverse-reference map over the valid entities (`ref` at any depth); verify with unit tests on the example catalog (`docker-01` cited by `network/dns`, referenced by `docker-01-adguard`, `pve-01` referenced by `docker-01`)
- [x] 4.3 Generate the `catalogo`, `catalogo/<type>` and `catalogo/<type>/<id>` `SitePage`s (source `generated`, no previous or next page) with the bodies `specs/content-catalog-pages` describes, and drop `docs/catalogo/**` pages with a reserved-path problem; verify with tests for every scenario of that spec
- [x] 4.4 Verify `v1.docs.page` serves the generated paths and answers `NOT_FOUND` for an unknown or invalid entity, with handler tests in `packages/api/tests/v1/docs/`

## 5. Diagrams

- [x] 5.1 Add `pages/diagrams.ts`: list `diagramas/*.yaml` (report `.yml` and bad ids), validate against a schema built from the catalog index (Spanish keys, `entidad` as `<type>/<id>`, `iconName`), parse `conexiones` from text or one-key maps, check node ids in connections and zones and single-zone membership, keep the valid parts; verify with tests for every scenario of "Diagram files" and "Nodes, connections and zones"
- [x] 5.2 Handle `<Diagram id>` in `transformPage` (attributes, block-only, unknown id notice, the diagram's file problems added to the page) and render the figure (caption, zones, connections with entity links); add `figure`/`figcaption` to `SANITIZE_SCHEMA`; verify with tests for "Shown in two pages", "Unknown diagram" and "Text version"
- [x] 5.3 Report a ` ```diagram ` fence and render a notice in its place; verify with the "Inline diagram block" test
- [x] 5.4 Render the "Diagramas" section of entity pages from diagram membership; verify with a generated-page test where `machines/nas` lists the diagram it appears in

## 6. API

- [x] 6.1 Update `packages/api/src/v1/docs/output.ts` (nav `group` node, nullable breadcrumb `path`/`href`) and the handler's mapping; verify with the docs handler tests and `bun run check-types`
- [x] 6.2 Add the `menu` and `diagram` editor schemas in `packages/content/src/editor-schemas.ts`, their routes in the content router, and the catalog entries for `menu.yaml` and `diagramas/*.yaml`; verify with tests for "Catalog of a site with two types" (six entries), "Menu suggestions" and "Icon suggestions"
- [x] 6.3 Log diagram problems with the page problems in `v1/content/reader.ts`; verify with a reader test that a broken diagram is logged once per build

## 7. Frontend

- [x] 7.1 Render `group` nodes in `docs-nav-tree.tsx` as headings with icon and title, and page icons when present; adapt `shared/model/nav.ts` helpers (current-section lookup, search records with group trail); verify with frontend unit tests for the nav helpers and `bun run check-types`
- [x] 7.2 Render breadcrumbs with a `null` path as text in `doc-hero.astro`, and list groups on the "Todos" home (`docs-home.astro`); verify with `check-types` and a manual review the user runs
- [x] 7.3 Label `llms.txt` lines with their group in `llm-text/model/llms.ts` and include catalog type pages; write diagram figures as Markdown in `page/model/markdown.ts`; verify with unit tests for "Page inside a group" and a figure written as caption plus lists

## 8. Docs and validation

- [x] 8.1 Update the `stack` skill references that describe the content contract and the reader (navigation, catalog pages, diagrams, icons) and `AGENTS.md`'s project map line for `packages/content` if it changes; verify every cited path exists
- [x] 8.2 Run `bun run check-types`, `bunx biome check`, `bun run tailwind:check` and `bun run test`, and verify all pass
- [ ] 8.3 In the separate `documentacion` repository: add `menu.yaml`, move the inline diagrams to `diagramas/` with Spanish keys and `<Diagram>`, move section icons to the menu, and update `.agents/skills/doc/references/` and the README; verify against the editor schemas once the platform syncs it (only with the user's go-ahead to edit that repository)
