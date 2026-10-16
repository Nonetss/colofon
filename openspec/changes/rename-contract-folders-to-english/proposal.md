## Why

The content contract mixes languages: a repository's folders and files are named in Spanish (`catalogo/`, `_tipo.yaml`, `diagramas/`, `estilos/` and its modules `tema.css`, `pagina.css`…) while `docs/`, `skills/`, `menu.yaml`, `doc.config.yaml` and the code that reads them are in English. The user wants the folder and file names of a content repository in English. YAML keys, header fields and every other name the contract reads stay as they are.

## What Changes

- **BREAKING** The catalog folder is `catalog/` instead of `catalogo/`, and each type declares itself in `catalog/<type>/_type.yaml` instead of `_tipo.yaml`.
- **BREAKING** Everything else named after the catalog folder follows it: the generated catalog pages live at `catalog`, `catalog/<type>` and `catalog/<type>/<id>` (reader URLs `/<repo>/catalog/…`), `docs/catalog/` is the reserved folder, `menu.yaml` entries name `catalog` and `catalog/<type>`, and page links use the `catalog:<type>/<id>` scheme.
- **BREAKING** Diagrams live in `diagrams/<id>.json` and `diagrams/<id>.svg` instead of `diagramas/`.
- **BREAKING** Style modules live in `styles/` instead of `estilos/`, and are named `theme.css`, `page.css`, `controls.css`, `code.css`, `tables.css`, `diagrams.css`, `images.css`, `callouts.css`, `sections.css` (formerly `tema`, `pagina`, `controles`, `codigo`, `tablas`, `diagramas`, `imagenes`, `avisos`, `secciones`), joined in the same order.
- Only the English names are read. A repository still using the Spanish names publishes no catalog, diagrams or styles until it is renamed; there is no fallback, but each former name it still holds (`catalogo/`, `diagramas/`, `estilos/`, a `_tipo.yaml`) is reported naming its English replacement, so the problem is visible on the repository's home.
- The editor schema catalog matches the new paths (`catalog/<type>/_type.yaml`, `catalog/<type>/*.yaml`, `diagrams/*.json`), and the user-facing problem messages that name a folder or file name the new one.
- `doc-example/` moves to the new names: its folders, files, links, menu entries, guide pages, the catalog entities that describe the contract, its `.vscode/settings.json`, its agent skills (the per-folder skills `catalogo`, `diagramas`, `estilos` become `catalog`, `diagrams`, `styles`) and its served skill. Its own guide section `docs/catalog/` would collide with the reserved `docs/catalog/`, so it moves to `docs/data/`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-contract`: the repository layout, the type declaration file name and the problems that name them.
- `content-catalog-pages`: the generated pages' paths, the reserved `docs/catalog/` folder.
- `content-menu`: the `catalog` and `catalog/<type>` entries.
- `content-pages`: the `catalog:` link scheme and the folders named by `<Entities>` and `<Diagram>` problems.
- `content-diagrams`: the `diagrams/` folder for diagram files and SVG illustrations.
- `content-styles`: the `styles/` folder and the English module names.
- `content-editor-schemas`: the file patterns of the schema catalog.
- `content-git-browser`, `content-source`, `content-package-structure`: their mentions of the content folders.
- `documentation-reader`: catalog URLs in the sidebar and search, and the stylesheet read from `styles/`.

## Impact

- `packages/content`: the folder and file constants (`contract/load.ts`, `styles/modules.ts`), the catalog paths and link scheme, the editor schema patterns, comments and problem messages; its fixtures and tests.
- `packages/api`: OpenAPI descriptions naming the folders; the content fixture and tests.
- `apps/frontend`: unit tests that use catalog URLs (`nav.test.ts`, `table-url.test.ts`); no source change expected.
- `doc-example/` (a git subtree of its own repository): the full rename, to be pushed to its repository by the user.
- Every other content repository connected to a running platform must rename its folders and files, and its readers' bookmarked `/catalogo/…` URLs stop resolving.
- `AGENTS.md`, `README.md` and the `stack` skill references that name the content folders.
- No database schema or migration change: clones are read from disk.
