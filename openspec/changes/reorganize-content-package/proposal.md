## Why

`packages/content` has grown into four unrelated areas sharing one flat `src/`. The content contract, the git side (clones, hosting, browsing), the page pipeline and a diagram engine all sit together. The diagram engine alone is about two thirds of the package, and it lives inside `src/pages/` as eight `diagram-*` files next to `nav.ts` and `header.ts`, plus `diagram-types/`. Its modules form one import cycle of 51 files. `pages/diagrams.ts` (1291 lines) is at the same time the diagram model that every typed form imports, the file reader, the drawn-format reader and the hast figure builder. Nothing states which area may depend on which, so the next change has no rule to follow. The cycles also make the diagram code hard to read and to change in isolation.

## What Changes

- Split `packages/content/src/` into one folder per area: `contract/` (meta-schema, entity schemas, `loadContent`, `readCatalog`, icon names, reserved slugs, catalog paths, the shared problem type), `git/` (`source`, `hosting`, `browse`), `editor/` (the editor JSON Schemas), `diagrams/` (the whole diagram engine) and `pages/` (the MDX page pipeline, navigation, catalog pages, entity tables).
- Move the diagram engine out of `pages/` into `diagrams/`. The `diagram-` prefixes are dropped, because the folder now names the area. `diagram-types/` becomes `diagrams/types/`, with its shared helpers in `diagrams/types/kit/` and `layout/` kept as is.
- Break the 51-file cycle. The diagram data types (`Diagram`, `DiagramBox`, `DiagramEdge`, `Point`, the drawable graphics, legends and text blocks) and `accentPaths` move to `diagrams/model.ts`. `pages/diagrams.ts` is split by job into reading the files, reading the drawn format and building the figure.
- Replace the six typed-form family files (`chart.ts`, `chart-more.ts`, `flow.ts`, …), each 6 to 23 lines, with one registry in `diagrams/types/index.ts`. It keeps today's order.
- Fix a one-way dependency direction between areas. `git` stands alone. `contract` depends on nothing else. `diagrams` depends only on `contract`. `pages` depends on `contract` and `diagrams`. `editor` depends on `contract` and `diagrams`. This needs two small moves: `PageProblem` and `entityPagePath` move to `contract/`, so that diagrams never import from `pages/`.
- Add a structure test that reads every `#…` import under `src/` and fails on a forbidden direction or on any import cycle.
- Mirror the new layout under `tests/`.
- No behavior change. The public barrel `src/index.ts` exports the same names, so `packages/api` keeps compiling unchanged. The `#*` subpath mapping stays.
- Update the `packages/content` entry of the `stack` skill's `references/workspaces.md` to the new paths.

## Capabilities

### New Capabilities

- `content-package-structure`: how `packages/content` is laid out. It covers the area folders, the allowed dependency direction between them, no import cycles, the diagram model as the module that the diagram code shares, the stable public barrel, and tests mirroring `src/`.

### Modified Capabilities

_None._ No spec states a file path in `packages/content`, and no rendering, reading or API requirement changes.

## Impact

- `packages/content/src/**` and `packages/content/tests/**`: files move and `#…` imports are rewritten. The changed contents are limited to the new `diagrams/model.ts`, the split of `pages/diagrams.ts`, the merged type registry and the two helpers moved to `contract/`.
- `packages/content/src/index.ts`: same exported names, new source paths.
- `packages/api`: no change, since it only imports `@nonete/content`.
- `.agents/skills/stack/references/workspaces.md`: the `packages/content` row is rewritten to the new paths, and its single paragraph becomes one entry per area.
- The open change `page-edited-date-from-git` names `src/source.ts` and `src/pages/types.ts`. Whichever lands second updates those paths: `source.ts` becomes `git/source.ts`, and `PageHeader` stays in `pages/types.ts`.
