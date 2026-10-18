## Why

`packages/content/src/contract/` has grown into a flat folder of fourteen modules mixing four concerns: the schemas, reading a repository's declarations, the contract versions and the catalog. Two modules became catch-alls: `load.ts` (path constants, file listing, YAML and JSON parsing, version-aware validation, `ref` checks and the `docs/` page paths) and `contract-1.ts` (which also renames the editor's JSON Schemas, an `editor/` concern). `skills.ts` reads a repository's `skills/` folder, which is no more part of the declaration contract than `styles/` or `diagrams/`, and `isRecord` is written three times. Finding where something lives, and removing contract 1 one day, both cost more than they should.

## What Changes

- `contract/` is split into subfolders by concern: `schema/` (meta-schema, entity schema, enum and icon helpers, the generated Lucide list), `read/` (declarations, files and paths, YAML, JSON, problems, `isRecord`), `versions/` (version detection, the contract 1 translation, version-aware reading) and `catalog/` (reading entities, catalog paths). `images.ts` and `reserved-slugs.ts` stay at its root.
- `load.ts` is split across `read/` by reason to change; `ContentProblem` and `PageProblem` live together in `read/problems.ts`.
- The JSON Schema renaming for contract 1 moves to `editor/contract-1-schemas.ts`; `versions/contract-1.ts` exposes the Spanish names it needs.
- A new area, `skills/`, reads a repository's `skills/` folder (formerly `contract/skills.ts`). It imports only from `contract`, and `pages` may import from it.
- `isRecord` is defined once, in `contract/read/records.ts`, and the copies in `diagrams/` and `pages/` import it.
- The public barrel exports the same names; tests move to mirror the new paths. No behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-package-structure`: the area list gains `skills/`, `contract/` is described by its subfolders, the allowed directions add `skills` (from `contract`) and `pages → skills`, and the scenario that names `#contract/catalog-paths` names its new path.

## Impact

- `packages/content`: module moves and import updates across `src/` and `tests/`, the structure test's area table.
- `packages/api`: none (it imports only `@nonete/content`).
- The `stack` skill's `references/workspaces.md`, which describes `packages/content` module by module.
