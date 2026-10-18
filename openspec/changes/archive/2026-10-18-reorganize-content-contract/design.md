## Context

See proposal.md. The package's layout is enforced by `tests/structure.test.ts` (`content-package-structure`): one folder per area, a one-way dependency table, no cycles, tests mirroring `src/`. Imports use the `#*` → `./src/*.ts` subpath map, so a nested module is imported as `#contract/read/files`.

## Goals / Non-Goals

**Goals:** each module of `contract/` sits in a subfolder named after its concern; no module mixes unrelated reasons to change; everything contract 1 needs lives in `versions/v1.ts`, `versions/reading.ts` and `editor/v1-schemas.ts`.

**Non-Goals:** no behavior, message or exported name changes; no new shared area (helpers used by several areas stay in `contract/`, the lowest one, as the spec already asks).

## Decisions

**Where `load.ts` goes.**
- `read/files.ts`: the path constants (`CONFIG_FILE`, `CATALOG_DIR`, `DOCS_DIR`, `TYPE_FILE`, `MENU_FILE`, `DIAGRAMS_DIR`, `CATALOG_PATH`), `readText`, directory listing, the `docs/` page and folder paths and `isReservedDocsPath`.
- `read/yaml.ts`: `parseYaml`, `yamlErrorReason`. `read/json.ts`: `parseJson` (used by diagrams).
- `read/problems.ts`: `ContentProblem`, `PageProblem` (from `problems.ts`), `describeIssue` and `spanishErrors`.
- `read/declarations.ts`: `loadContent`, `ContentDeclarations`, `LoadResult`, validating each declaration, the type and entity ids, `checkRefs`.
- `versions/reading.ts`: `ContractReading`, `asContract2`, `foreignKeyMessage` and the `plataforma: "1"` check.
- `describeIssue` maps paths through `pathFor` from `versions/v1.ts`, so `read/problems.ts` imports `versions/`; `versions/` imports only `read/problems.ts` types and `read/records.ts`, with no cycle.

**Names.** `read/` and `catalog/read.ts` follow `styles/read.ts` and `diagrams/read.ts`; `versions/detect.ts` holds what `versions.ts` held minus `isRecord`; files don't repeat their folder's name (`catalog/paths.ts`, not `catalog/catalog-paths.ts`), nor their parent's: the contract 1 module is `versions/v1.ts`, not `versions/contract-1.ts`, so a contract 3 would add a `v2.ts` beside it.

**Moves keep history.** Whole-file moves use `git mv`; `load.ts` is split by moving it to `read/declarations.ts` and extracting the other modules from it.

**Imports are rewritten by symbol.** A one-off codemod rewrites each `import … from "#contract/load"` into imports from the new modules by name; the other moves are path renames. Biome then orders the imports.

## Risks / Trade-offs

- [A missed import or a new cycle] → `check-types`, the structure test (areas and cycles) and `bun run test` cover both.
- [Churn in blame for moved files] → `git mv` and a separate commit keep the rename detectable.
