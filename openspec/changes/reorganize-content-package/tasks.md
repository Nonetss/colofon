## 1. Preconditions and guard tests

- [x] 1.1 Check that `git status --short packages/content` is empty, so the `page-edited-date-from-git` work is committed. Stop and ask the user if it is not
- [x] 1.2 Write `packages/content/tests/structure.test.ts` (see design, "The structure test"). It walks `src/`, collects the `from "#…"` and `import("#…")` specifiers, resolves them to `src/<specifier>.ts` and asserts three things. First, the source root holds only `index.ts` and `contract`, `git`, `editor`, `diagrams` and `pages`. Second, every edge between areas follows the direction table of `content-package-structure`, with `index.ts` exempt, and a failure lists `file → specifier`. Third, there is no import cycle, and each cycle is reported as its list of modules. Run it against today's tree and see all three assertions fail
- [x] 1.3 Add a test to the typed-form tests asserting that `typeNames()` returns the full list in today's order. See it pass before the registry is touched

## 2. Contract and git

- [x] 2.1 `git mv` `meta-schema`, `entity-schema`, `enum-of`, `icon-name`, `lucide-icons.generated`, `load`, `catalog` and `reserved-slugs` into `src/contract/`, and `pages/catalog-paths.ts` into `src/contract/catalog-paths.ts`. Rewrite every `#…` specifier that points at them
- [x] 2.2 Move `entityPagePath` from `pages/entities.ts` to `contract/catalog-paths.ts`, and point `pages/entities.ts` and `diagram-types/items.ts` at it
- [x] 2.3 Create `contract/problems.ts` with `PageProblem` moved out of `pages/types.ts`, and point every importer at `#contract/problems`
- [x] 2.4 `git mv` `source`, `hosting` and `browse` into `src/git/`, and rewrite their specifiers
- [x] 2.5 `git mv` `editor-schemas.ts` to `src/editor/schemas.ts`, and rewrite its specifiers
- [x] 2.6 Update the output path in `apps/frontend/scripts/generate-icon-names.ts` to `packages/content/src/contract/lucide-icons.generated.ts`
- [x] 2.7 Run `check-types` for `@nonete/content`

## 3. Diagrams

- [x] 3.1 `git mv` `pages/diagram-schema`, `diagram-measure`, `diagram-svg`, `diagram-illustration` and `diagram-read` to `src/diagrams/schema`, `measure`, `svg`, `illustration` and `report`
- [x] 3.2 `git mv` `pages/diagram-types/` to `src/diagrams/types/`. Move `scene`, `form`, `budget`, `items`, `links`, `values` and `chart-kit` into `src/diagrams/types/kit/`. Keep `layout/` as is
- [x] 3.3 Create `diagrams/model.ts` with the exported types of `pages/diagrams.ts`, `accentPaths`, and the data types `Diagram` uses from `kit/scene.ts` (`Paint`, `Datum`, `TEXT_ROLES`, `TextRole`, `GraphicShape`, `Graphic`, `LegendSample`, `LegendEntry` and the `Text*` types). It imports only `#contract/*`, `#diagrams/schema` and `hast` types. `kit/scene.ts` keeps `Scene`, `Tools`, `TypeModule`, `paint()` and `emptyScene()` and imports the model
- [x] 3.4 Split the rest of `pages/diagrams.ts` into `diagrams/read.ts`, `diagrams/drawn.ts` and `diagrams/figure.ts` as the design lists. `drawn.ts` owns its own `diagramSchemas()` instance. Delete `pages/diagrams.ts`
- [x] 3.5 Point every module that imported `#pages/diagrams` at `#diagrams/model`, `#diagrams/read` or `#diagrams/figure`, and rewrite the remaining `#pages/diagram*` specifiers
- [x] 3.6 Replace the family modules `graph`, `flow`, `concept`, `chart`, `chart-more` and `delta` with one `DIAGRAM_TYPES` array in `diagrams/types/index.ts`, keeping today's order with a comment line per family. Delete the six files
- [x] 3.7 Run `check-types` for `@nonete/content` and see the structure test's direction and cycle assertions pass

## 4. Barrel and tests

- [x] 4.1 Update `src/index.ts` to the new paths, exporting exactly the same names as before. Check that `packages/api` type-checks without changes
- [x] 4.2 `git mv` the tests so that they mirror `src/`. That gives `tests/contract/` (`catalog`, `editor` as `tests/editor/schemas.test.ts`, `entity-schema`, `load`, `meta-schema`, `reserved-slugs`), `tests/git/` (`source`, `hosting`, `browse`), `tests/diagrams/` (`diagrams`, `diagram-svg`, `diagram-measure` and `diagram-illustration` without their prefix) and `tests/diagrams/types/` (each form's test, `layout.test.ts`, `registry.test.ts`, `helpers.ts`). `tests/pages/` keeps the page tests, and `tests/fixtures/` stays
- [x] 4.3 Rewrite the `#…` and `#tests/…` specifiers in the moved tests, and add one `..` to `REPO` in the moved `reserved-slugs.test.ts`
- [x] 4.4 Run `bun test` in `packages/content` and see every suite pass, including the structure test and the `typeNames()` order test

## 5. Path citations

- [x] 5.1 Rewrite the `packages/content` row of `.agents/skills/stack/references/workspaces.md` to the new paths, as one entry per area (`contract/`, `git/`, `editor/`, `diagrams/`, `pages/`). State there the direction rule and the structure test that enforces it
- [x] 5.2 Update the generated-file path in `.agents/skills/stack/references/frontend/entity-icons.md`, and the `diagram-svg.ts` path in the comment of `apps/frontend/src/styles/global.css`
- [x] 5.3 Search the repo, outside `openspec/changes/archive/` and `docs/`, for the old paths (`src/pages/diagram`, `src/source.ts`, `src/load.ts`, `lucide-icons.generated`, …) and fix any citation left

## 6. Validation

- [ ] 6.1 From the repo root, run `bun run check-types`, Biome (`bunx biome check .`) and `bun run test`, and see all of them pass
