## 1. Contract names in packages/content

- [x] 1.1 Rename the constants in `src/contract/load.ts`: `CATALOG_DIR = "catalog"`, `TYPE_FILE = "_type.yaml"`, `DIAGRAMS_DIR = "diagrams"`, `CATALOG_PATH = "catalog"`
- [x] 1.2 Rename `STYLES_DIR` to `"styles"` and the `STYLE_MODULES` names (`theme`, `page`, `controls`, `code`, `tables`, `diagrams`, `images`, `callouts`, `sections`) in `src/styles/modules.ts`, keeping the order
- [x] 1.3 Change `CATALOG_SCHEME` to `"catalog:"` in `src/pages/transform.ts`
- [x] 1.4 Replace the remaining literal Spanish names (comments, problem messages, editor schema descriptions and `fileMatch` patterns in `src/editor/schemas.ts`, `meta-schema.ts`, `entity-schema.ts`, `diagrams/schema.ts`, `pages/*.ts`, `git/source.ts`) with the English ones, using the constants where a path is built; leave Spanish prose ("dos diagramas", "los estilos") and YAML keys untouched

## 2. Former names reported

- [x] 2.1 Add the list of former names (`catalogo/` → `catalog/`, `diagramas/` → `diagrams/`, `estilos/` → `styles/`, `_tipo.yaml` → `_type.yaml`) in `packages/content`
- [x] 2.2 Report them as site problems in `src/pages/site.ts`, next to the reserved-path problems: the root folders, and a `_tipo.yaml` inside each `catalog/<type>/`, each message naming the English replacement
- [x] 2.3 Unit tests for the reports (`tests/pages/site.test.ts`): each old folder, a `_tipo.yaml` next to a missing `_type.yaml`, and that nothing under an old folder is read

## 3. Tests and fixtures

- [x] 3.1 Move `packages/content` fixtures (`tests/fixtures/content-dir.ts`, `site.ts`) and every test under `tests/` to the new folder, file, module and page path names; the style "not a module" test uses an old Spanish module name
- [x] 3.2 Update `packages/api`: OpenAPI descriptions in `src/v1/content/{input,router}.ts` and `src/v1/docs/{output,router,handler}.ts`, the content fixture and the `content` and `docs` tests
- [x] 3.3 Update the catalog URLs in `apps/frontend/tests/unit/features/docs/shared/nav.test.ts` and `tables/table-url.test.ts`, and confirm `apps/frontend/src` holds no Spanish contract name

## 4. doc-example content

- [x] 4.1 `git mv` `catalogo/` → `catalog/`, every `_tipo.yaml` → `_type.yaml`, `diagramas/` → `diagrams/`, `estilos/` → `styles/` and `tema.css` → `theme.css`
- [x] 4.2 Move the guide section `docs/catalog/` → `docs/data/`, and point the links, the menu entry and the diagrams' `page` values that meant it at `data/…`
- [x] 4.3 Rename the generated-catalog references: `menu.yaml` entries `catalogo` → `catalog`, `catalogo:` links → `catalog:`, and the menu comment
- [x] 4.4 Update the guide pages, the catalog entities that describe the contract (`catalog/files/`, `catalog/header-fields/`…) and `.vscode/settings.json` (`/diagrams/*.json`) to the new names
- [x] 4.5 Rename the agent skills `.agents/skills/{catalogo,diagramas,estilos}` → `catalog`, `diagrams`, `styles` with their `.claude/skills` symlinks, and update their contents, `AGENTS.md`, the `documentation` skill, the `/doc:*` commands and the served skill `skills/doc-writing`

## 5. Platform docs for agents and specs

- [x] 5.1 Update `AGENTS.md`, `README.md` and the `stack` references (`references/workspaces.md`, `references/frontend/navigation-and-layouts.md`) that name the content folders
- [ ] 5.2 After syncing the delta specs, update the Purpose paragraphs of `content-diagrams` and `content-styles`, which still name `diagramas/` and `estilos/`

## 6. Validation

- [x] 6.1 `grep` the repository (outside `openspec/changes/archive/` and `docs/`) for `catalogo`, `_tipo`, `diagramas/`, `estilos` and the old module files, and justify every hit left
- [x] 6.2 `bun run check-types`, Biome and `bun run test` pass
