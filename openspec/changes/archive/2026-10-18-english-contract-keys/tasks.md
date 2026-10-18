## 1. Version 2 schemas and English internal model (packages/content)

- [x] 1.1 Move `src/contract/meta-schema.ts` to the English names: `doc.config.yaml` (`name`, `description`, `contract: "2"`, `header`), `menu.yaml` (`sections`, `title`, `icon`, `description`, `pages`, `path`), `_type.yaml` (`name`, `plural`, `icon`, `description`, `title_field`, `fields`, `view.columns`), field declarations (`type`, `optional`, `description`, `label`, `values`, `to`, `of`, `fields`) and `SCALAR_FIELD_KINDS`/`PAGE_HEADER_FIELDS`/`ENTITY_RESERVED_FIELDS`/`CONTRACT_VERSIONS`; descriptions and messages stay in Spanish and name the English keys. Verify with `bun run check-types` in `packages/content` failing only at the readers updated in 1.2
- [x] 1.2 Update every reader to the English property names: `src/contract/{entity-schema,catalog,load}.ts`, `src/pages/{header,nav,site,catalog-pages,entities,references,transform,search,search-text,types}.ts` (`PageHeader` gets `title`, `description`, `icon`, `order`, `updated`, `fields`), `src/editor/schemas.ts`; verify `bun run check-types` passes in `packages/content`
- [x] 1.3 Move the `packages/content` fixtures (`tests/fixtures/content-dir.ts`, `tests/fixtures/site.ts`) and the existing tests under `tests/contract`, `tests/pages`, `tests/editor` and `tests/git` to contract 2 names (scenarios of the delta specs `content-contract`, `content-pages`, `content-menu`, `content-catalog-pages`, `content-editor-schemas`), and add the cases the split of `etiqueta` needs: a type's `title_field` refused when it is not a field, a field's `label` used as column header and entity row name; verify `bun test` passes in `packages/content`

## 2. Contract 1 reading (packages/content)

- [x] 2.1 Detect the version from the raw `doc.config.yaml` in `loadContent` (`contract` → 2, only `plataforma` → 1, neither → 2) and store it on `ContentDeclarations`; tests in `tests/contract/contract-1.test.ts` ("the contract version"): each case, both keys present (`plataforma` refused), unquoted `plataforma: 1` reported under `plataforma`
- [x] 2.2 Add the positional names table and the translator in `src/contract/` (design "The renames are positional"): config, menu, type, field declarations at any depth with kind values, page header, entity reserved fields; site-chosen names untouched; records the reverse mapping of each renamed key. Unit tests (`tests/contract/contract-1.test.ts`): each file kind translates to the expected English data, `etiqueta` → `title_field` at a type's root and `label` in a field, nested `lista`/`objeto`, an English key in a version 1 file left as is, site field names never renamed
- [x] 2.3 Wire the translator into `parseDeclaration`, the entity validation in `src/contract/catalog.ts` and `readHeader` in `src/pages/header.ts`, mapping issue paths back before writing problems and finding lines; messages that embed a contract key name take it from the repository's names (design "Messages that name a contract key"), including the menu overrides in `nav.ts`/`site.ts`. Tests: a full version 1 fixture repository reads to the same declarations, pages, navigation and catalog pages as its version 2 twin; version 1 problems name `etiqueta`, `campos.x.tipo`, `secciones.0.icono`, `titulo` with the right lines; a version 1 field named `source` is reported as reserved
- [x] 2.4 Report contract 1 as superseded: one site problem on `doc.config.yaml` next to `formerNameProblems` in `src/pages/site.ts`, not invalidating declarations, pointing to the guide's migration note. Tests in `tests/contract/contract-1.test.ts`, which reads a whole version 1 site and its version 2 twin (`tests/fixtures/contract-1.ts`): a clean version 1 repository has exactly that problem and publishes everything; a clean version 2 one has none
- [x] 2.5 Serve version 1 editor schemas: in `src/editor/schemas.ts` rename the version 2 JSON Schemas for a version 1 repository (property names in `properties`, `required`, kind `enum`/`const` values; only `source`/`updated` in entity schemas), leaving JSON Schema keywords and the diagram schema alone. Tests in `tests/editor/schemas.test.ts`: the version 1 type schema accepts `campos`, `etiqueta`, `vista.columnas` and lists the Spanish kinds and refuses `fields`; a version 1 entity schema has `fuente`/`actualizado`; version 2 schemas use the English names

## 3. API (packages/api)

- [x] 3.1 Update `src/v1/docs/handler.ts` and any other reader of the contract types to the English names, and the OpenAPI descriptions that name contract keys (`src/v1/docs/output.ts` `updated` description, `src/v1/content/*`); verify `bun run check-types` passes in `packages/api`
- [x] 3.2 Move `tests/fixtures/content.ts` and the `docs` and `content` tests to contract 2, and add one handler test reading a version 1 repository whose page header and header field come out with the same English output; verify `bun test` passes in `packages/api`

## 4. doc-example to contract 2 (separate commit from code)

- [x] 4.1 Migrate every YAML file and page front matter of `doc-example/` with a throwaway script in the session scratchpad applying the names table (YAML-aware, keeps comments and order), and set `contract: "2"`; verify `rg` finds no Spanish contract key in `doc-example/**/*.yaml` or in front matter
- [x] 4.2 Rewrite the parts that explain the contract in prose: the guide pages under `doc-example/docs/`, the catalog entities describing it (`catalog/field-kinds` with English ids, `catalog/header-fields`, `catalog/files`, `catalog/components`), the YAML comments in `doc.config.yaml` and `menu.yaml`, `AGENTS.md`, `README.md` and `skills/guide`; add a short note in the guide on moving a repository from contract 1 to 2 with the names table, which the superseded problem points to
- [x] 4.3 Update the writing skills in `doc-example/.agents/skills/colofon-*` (and their references) to the English names; verify `rg` over `doc-example/.agents` finds no Spanish contract key outside the migration note's table

## 5. docs/ to contract 2 (separate commit from code)

- [x] 5.1 Migrate `docs/` with the same script (`doc.config.yaml`, `menu.yaml`, `catalog/**`, every page front matter) and set `contract: "2"`; verify `rg` finds no Spanish contract key in its YAML or front matter
- [x] 5.2 Update the pages of `docs/contenido/` (and any other) that explain contract keys to the English names

## 6. Agent and project documentation

- [x] 6.1 Update `AGENTS.md` («Este sitio»: `{ path: catalog, title: Catálogo }`, `source`, `updated`, the `page` field), `README.md` (`contract: "2"`), `.agents/skills/stack/references/workspaces.md` and the `apps/site` docs that name contract keys (`content`, `index`, `upgrading`, `first-run`, in `en` and `es`); verify `rg "plataforma: \"1\"|\bcabecera\b|vista\.columnas"` outside `openspec/` and the guide's migration note returns nothing
- [x] 6.2 Check `openspec/config.yaml` for contract key wording and align it if any

## 7. Validation

- [x] 7.1 `rg` the repository (outside `openspec/changes/archive/`, the contract 1 module, its tests and the migration note) for the Spanish contract keys in code and YAML positions, and justify every hit left
- [x] 7.2 `bun run check-types`, Biome (`bunx biome check .`) and `bun run test` pass from the repo root
