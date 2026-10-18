## 1. Move the modules

- [x] 1.1 `git mv` the whole-file moves: `meta-schema`, `entity-schema`, `enum-of`, `icon-name`, `lucide-icons.generated` → `contract/schema/`; `catalog.ts` → `contract/catalog/read.ts`; `catalog-paths.ts` → `contract/catalog/paths.ts`; `versions.ts` → `contract/versions/detect.ts`; `contract-1.ts` → `contract/versions/contract-1.ts` (renamed in 1.5); `problems.ts` → `contract/read/problems.ts`; `skills.ts` → `skills/read.ts`; `load.ts` → `contract/read/declarations.ts`; verify the files exist at their new paths
- [x] 1.2 Split `read/declarations.ts` into `read/files.ts`, `read/yaml.ts`, `read/json.ts`, `read/problems.ts` (with `ContentProblem`, `describeIssue`, `spanishErrors`) and `versions/reading.ts`, as the design lists; move `isRecord` to `read/records.ts` and import it in `diagrams/report.ts`, `pages/header.ts` and `versions/`; verify each module holds only its concern
- [x] 1.3 Move the JSON Schema renaming from `versions/v1.ts` to `editor/v1-schemas.ts`, with `versions/v1.ts` exporting the Spanish key and kind names it needs; verify `editor/schemas.ts` imports it
- [x] 1.4 Rewrite every import in `src/` and `tests/` (by symbol for the former `#contract/load`), keep `src/index.ts` exporting the same names, and run Biome on the package; verify `bun run check-types` passes in `packages/content` and `packages/api` with no change in `packages/api`

- [x] 1.5 Rename the contract 1 module to `versions/v1.ts` (and `editor/v1-schemas.ts`, `tests/contract/versions/v1.test.ts`, `tests/fixtures/v1-site.ts`), with its exports `translateV1`, `v1Path`, `V1_FILES`, `V1File`, `v1JsonSchema` and `v1Problems`; verify no `contract-1` module path or `contract1`/`Contract1` export name is left

## 2. Structure test and tests

- [x] 2.1 Add `skills: ["contract"]` and `skills` to `pages` in `tests/structure.test.ts`'s `ALLOWED`; verify the structure test passes (areas, directions, no cycles)
- [x] 2.2 Move the tests to mirror `src/`: `tests/contract/{meta-schema,entity-schema}.test.ts` → `tests/contract/schema/`, `catalog.test.ts` → `tests/contract/catalog/read.test.ts`, `v1.test.ts` → `tests/contract/versions/`, `load.test.ts` → `tests/contract/read/declarations.test.ts` with its `parseJson` tests in `tests/contract/read/json.test.ts`, `skills.test.ts` → `tests/skills/read.test.ts`; verify `bun test` passes in `packages/content`

## 3. Documentation and validation

- [x] 3.1 Update the `stack` skill's `references/workspaces.md` (the `contract/` bullet and a `skills/` bullet) and the other cited paths (the `stack` references, the icon-names generator in `apps/frontend/scripts/`); `docs/` keeps its old Lucide path until the user asks for docs to be updated; verify every cited path exists
- [x] 3.2 `bun run check-types`, Biome and `bun run test` pass from the repo root
