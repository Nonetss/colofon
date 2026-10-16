## Context

`packages/content/src/` is flat at the root (17 modules), with `pages/` holding both the page pipeline and the diagram engine. The diagram engine is about 15,000 of the package's 21,600 hand-written lines (`lucide-icons.generated.ts` excluded). Computing the strongly connected components of the `#…` import graph gives a single cycle of 51 modules. It covers `pages/diagrams.ts`, `pages/diagram-svg.ts` and every module of `pages/diagram-types/`, including `layout/`. It exists because:

- `diagrams.ts` imports `diagram-svg.ts`, the registry `diagram-types/index.ts` and the helpers `scene`, `form`, `budget`, `items` and `links`.
- Those modules, and about 20 typed forms and layout helpers, import back from `#pages/diagrams`. They import only types (`Point`, `DiagramBox`, `DiagramEdge`, `DiagramZone`, `DiagramNote`, `Diagram`, `BoxShape`, `DiagramRow`, `DiagramContext`, `DiagramFile`) and one function, `accentPaths`.
- `diagrams.ts`'s own `Diagram` type uses `Graphic`, `LegendEntry` and `TextBlock` from `diagram-types/scene.ts`. `scene.ts`'s `Scene` and `Tools` use `DiagramBox`, `DiagramEdge`, `DiagramContext` and the other diagram types. So the cycle runs through the types as well as through the functions.

The diagram code depends on `pages/` in two places. `diagrams.ts` imports `PageProblem` from `pages/types.ts`, and `diagram-types/items.ts` imports `entityPagePath` from `pages/entities.ts`. `entityPagePath` only uses `entityPath` from `pages/catalog-paths.ts`, which itself only uses `CATALOG_PATH` from `load.ts`.

Path-sensitive spots outside the moved files:

- `tests/reserved-slugs.test.ts` resolves the repo root with `path.resolve(import.meta.dir, "../../..")`, so the moved test needs one more `..`.
- `apps/frontend/scripts/generate-icon-names.ts` writes `packages/content/src/lucide-icons.generated.ts`.
- A comment in `apps/frontend/src/styles/global.css` cites `packages/content/src/pages/diagram-svg.ts`.
- `.agents/skills/stack/references/frontend/entity-icons.md` cites the generated file, and `references/workspaces.md` cites most modules.

`compose.dev.yml` mounts `packages/content/src` as a whole, the `package.json` `imports` map `#*` to `./src/*.ts`, and `bunfig.toml`'s test root is `./tests`. None of them needs a change.

## Goals / Non-Goals

**Goals:**

- One folder per area with a one-way dependency direction, and no import cycle anywhere in `src/` (`content-package-structure`).
- A diagram model module that every diagram module shares, so the reader, the drawn-format reader, the figure and the SVG drawer are separate files.
- A structure test that keeps both rules true after this change.
- Identical behavior: same exports, same problems and messages, same HTML and SVG output. The existing suites pass with only their import paths and file locations changed.

**Non-Goals:**

- No change to any rendering, reading, validation or API behavior, and no change to `packages/api`.
- No new `package.json` subpath exports (`@nonete/content/git`, …). `packages/api` is the only consumer and goes through the barrel.
- No split of the large typed-form modules (`line.ts`, `architecture-delta.ts`, `diagram-svg.ts`). They are single-purpose and large because of their content. Splitting them is a separate decision.
- No moves inside `diagrams/types/layout/`.
- No updates to the human documentation in `docs/`.

## Decisions

### Target layout

| Today | Moves to |
|---|---|
| `meta-schema`, `entity-schema`, `enum-of`, `icon-name`, `lucide-icons.generated`, `load`, `catalog`, `reserved-slugs` | `contract/<same name>` |
| `pages/catalog-paths` | `contract/catalog-paths`, gaining `entityPagePath` from `pages/entities` |
| `PageProblem` from `pages/types` | `contract/problems` |
| `source`, `hosting`, `browse` | `git/<same name>` |
| `editor-schemas` | `editor/schemas` |
| `pages/diagram-schema`, `diagram-measure`, `diagram-svg`, `diagram-illustration` | `diagrams/schema`, `measure`, `svg`, `illustration` |
| `pages/diagram-read` (report and salvage helpers) | `diagrams/report` |
| `pages/diagrams` | split into `diagrams/model`, `read`, `drawn`, `figure` (below) |
| `pages/diagram-types/<form>` | `diagrams/types/<form>` |
| `pages/diagram-types/{scene,form,budget,items,links,values,chart-kit}` | `diagrams/types/kit/<same name>` |
| `pages/diagram-types/layout/*` | `diagrams/types/layout/*` |
| `pages/diagram-types/{graph,flow,concept,chart,chart-more,delta}` | removed, merged into `diagrams/types/index` |
| `pages/{site,parse,header,nav,transform,to-hast,entities,references,catalog-pages,types}` | stay in `pages/` |

`PageHeader`, `PageHeading` and `Page` stay in `pages/types.ts`. Only `PageProblem` moves, because diagrams and pages both report it. A separate `contract/problems.ts` was chosen over adding it to `load.ts`. `load.ts` already defines `ContentProblem`, which has no `line`, and merging the two would invite mixing them up.

### Splitting `pages/diagrams.ts`

- **`diagrams/model.ts`.** The exported types today at the top of `diagrams.ts`, plus `accentPaths`. It also takes the data types of `diagram-types/scene.ts` that `Diagram` uses: `Paint`, `Datum`, `TEXT_ROLES`/`TextRole`, `GraphicShape`, `Graphic`, `LegendSample`, `LegendEntry` and the `Text*` types. It imports only `#contract/catalog` (`Catalog`, `Entity`), `#contract/problems`, `#diagrams/schema` and `hast` types. `kit/scene.ts` keeps what a typed form is given and returns: `Scene`, `Tools`, `TypeModule`, `paint()` and `emptyScene()`. It imports the model.
- **`diagrams/read.ts`.** `readDiagrams`, `illustrationFile`, `readDiagram` (the dispatch between the drawn format and a typed form), the typed-form path (`typedDiagram`, `variantOf`, `sceneDiagram`), `diagramsByEntity`, and the private file helpers (`extensionOf`, `listDir`).
- **`diagrams/drawn.ts`.** Reading the `lib.mjs` format: `drawnDrawing`, `chainDrawing`, boxes, zones, notes, edges, measuring and `accentsOf`. It owns its own `diagramSchemas()` instance and exports the two `Drawing` readers that `read.ts` calls.
- **`diagrams/figure.ts`.** `diagramFigure` and the text version (`textVersionOf`, `typedText` and their helpers). It calls `#diagrams/svg`.

The typed form `architecture-delta` read each snapshot through `readDiagram`: it serialized the snapshot to JSON, and then split the field path back out of each problem message. That kept a small cycle (`read → types/index → architecture-delta → read`). It now calls `drawnDiagram()` from `drawn.ts` with its own report, and the round trip through JSON and `reportUnder` is gone. The messages are the same, because the drawn reader never reports at an empty path.

The resulting edges are `read → drawn, kit/*, types/index, illustration, model`, `figure → svg, model`, and `svg → measure, schema, kit/scene, model`. None of them points back at `read`, `drawn` or `figure`, which breaks the cycle.

The alternative was to keep `diagrams.ts` whole and only extract the types. That also breaks the cycle, but it leaves one 1,200-line file doing three jobs. Splitting it now costs little, because the functions already fall into these groups.

### One registry instead of family files

`diagrams/types/index.ts` imports every form and lists them in one `DIAGRAM_TYPES` array, in the same order as today's spread of `GRAPH_TYPES`, `FLOW_TYPES`, `CONCEPT_TYPES`, `CHART_TYPES`, `CHART_MORE_TYPES` and `DELTA_TYPES`. A comment line marks each family. The order matters, because `typeNames()` feeds the "unknown type" message and the editor schema's enum. The family files only existed to keep `index.ts` short, and the `chart`/`chart-more` split was arbitrary.

### The structure test

`tests/structure.test.ts` walks `src/` with `node:fs`. In every `.ts` file it collects the specifiers of `from "#…"` (imports, type imports and re-exports alike) and of `import("#…")`. It resolves each one through the package's own `#*` mapping to `src/<specifier>.ts` and builds the graph. It then makes three assertions:

1. The source root holds only `index.ts` and the five area folders.
2. Every edge between areas is allowed by the direction table. The failure lists `file → specifier`.
3. The graph has no cycle. A depth-first search reports each cycle found as its list of modules.

A regex over the source is enough, because the package only uses static `#…` specifiers. The test needs no TypeScript compiler API. To see it fail first, it runs against today's tree, where both the direction and the cycle assertions fail.

### Order of the work

1. Write the structure test against today's tree and see it fail.
2. Move files with `git mv`, so history follows them, and rewrite their `#…` specifiers.
3. Split `diagrams.ts` and `scene.ts`, move the two helpers, and merge the registry.
4. Move the tests the same way.
5. Update the path citations.

Every step keeps `check-types` green before the next one.

## Risks / Trade-offs

- **[Collision with work in progress]** → The change `page-edited-date-from-git` is being implemented, with uncommitted edits in `source.ts`, `catalog.ts`, `index.ts`, `pages/{types,site,header,catalog-pages}.ts` and their tests. Moving those files under it would mix two changes in one diff. This change starts only once that work is committed, with a clean `packages/content`. Its `readEditDates` makes `git/source.ts` import `DOCS_DIR` from `contract/load`, an edge the direction table already allows.
- **[History hidden by the split]** → `git mv` keeps file history for plain moves. For the four files split out of `diagrams.ts`, `git log --follow` traces back only through whichever file git sees as the rename. This is accepted. The commit message names the split.
- **[A missed specifier]** → `check-types` fails on any `#…` path that no longer resolves, and the structure test fails on any file left outside an area folder.
- **[Order change in the registry]** → The existing `registry.test.ts` checks the "unknown type" message. Before the merge, a test asserting the full `typeNames()` list is added and seen passing, then kept.
- **[Structure test too strict for future needs]** → If a new area or an extra allowed edge is ever needed, the direction table in the test and the `content-package-structure` spec change together.

## Migration Plan

This is a pure refactor in one commit (`refactor(content): …`), with no data, configuration or deployment step. Rollback is reverting the commit.
