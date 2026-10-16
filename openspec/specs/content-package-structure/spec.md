# Content Package Structure

## Purpose

Defines how `packages/content` is laid out: one folder per area under `src/`, a one-way dependency direction between areas with no import cycles, the diagram model shared by every diagram module, a single registry of typed diagram forms, a stable public barrel, and tests mirroring `src/`, all enforced by a structure test.
## Requirements
### Requirement: One folder per area

`packages/content/src/` SHALL hold only the public barrel `index.ts` and one folder per area:

- `contract/`: the meta-schema, entity schemas, `loadContent`, `readCatalog`, icon names and the generated Lucide list, reserved slugs, the catalog page paths and the problem type shared by pages and diagrams.
- `git/`: clones of content repositories, the git server of hosted repositories, and reading a bare repository's folders and files.
- `editor/`: the editor JSON Schemas and their catalog.
- `diagrams/`: reading, checking, laying out and drawing diagram files, with the typed forms under `diagrams/types/`.
- `styles/`: the style modules of a repository's `styles/`: their names and order, reading them and cleaning them into one stylesheet.
- `pages/`: the MDX page pipeline, the navigation, the generated catalog pages and the entity tables.

A module SHALL live in the folder of the area it belongs to, and its file name SHALL NOT repeat the folder's name as a prefix.

#### Scenario: The source root

- **WHEN** `packages/content/src/` is listed
- **THEN** it SHALL contain `index.ts` and the folders `contract`, `git`, `editor`, `diagrams`, `styles` and `pages`, and no other file or folder

#### Scenario: A diagram module

- **WHEN** a module draws a diagram as SVG
- **THEN** it SHALL be `src/diagrams/svg.ts`, imported as `#diagrams/svg`, not a `diagram-svg.ts` under `src/pages/`

### Requirement: One-way dependencies between areas

A module SHALL import from another area only along these directions:

- `contract` imports from no other area.
- `git` imports only from `contract`.
- `diagrams` imports only from `contract`.
- `styles` imports only from `contract`.
- `pages` imports only from `contract`, `diagrams` and `styles`.
- `editor` imports only from `contract` and `diagrams`.
- Only `src/index.ts` may import from every area.

A helper needed by two areas SHALL live in the lowest area both may import from. It SHALL NOT be imported upward.

#### Scenario: A diagram needs an entity's page path

- **WHEN** diagram code needs the page an entity links to
- **THEN** it SHALL import `entityPagePath` from `#contract/catalog-paths`, never from a module under `pages/`

#### Scenario: A forbidden direction is introduced

- **WHEN** a module under `contract/` imports a module under `pages/`, or one under `diagrams/` imports one under `pages/` or `editor/`, or one under `styles/` imports one under `pages/`
- **THEN** the package's structure test SHALL fail and name the importing file and the imported module

### Requirement: No import cycles

The modules under `packages/content/src/` SHALL form no import cycle, counting type-only imports and re-exports, between areas or inside one.

#### Scenario: A cycle is introduced

- **WHEN** module A imports module B and B, directly or through other modules, imports A
- **THEN** the package's structure test SHALL fail and list the modules of the cycle

#### Scenario: A typed form needs the diagram types

- **WHEN** a typed form or a layout helper needs `Point`, `DiagramBox` or `DiagramEdge`
- **THEN** it SHALL import them from `#diagrams/model`, which imports no module that reads, draws or lays out a diagram

### Requirement: The diagram model is the shared diagram module

`src/diagrams/model.ts` SHALL hold the data every diagram module shares: the read diagram and its boxes, edges, zones, notes and rows, `Point` and the box shapes, the graphics, legend entries and text blocks of a typed form, the diagram file with its problems, the diagram context, and `accentPaths`. It SHALL import only from `contract/` and from `#diagrams/schema`. Reading the files, reading the drawn format, building the hast figure and drawing the SVG SHALL be separate modules that import the model.

#### Scenario: Drawing the SVG

- **WHEN** `#diagrams/svg` needs the shape of a read diagram
- **THEN** it SHALL import it from `#diagrams/model`, and no module that `#diagrams/svg` imports SHALL import `#diagrams/svg`

### Requirement: One registry for the typed forms

Each typed diagram form SHALL be one module under `src/diagrams/types/`. Helpers shared by several forms SHALL live in `src/diagrams/types/kit/` and the pure layout helpers in `src/diagrams/types/layout/`. Every form SHALL be listed once, in the single array of `src/diagrams/types/index.ts`, with no intermediate family module. The array's order SHALL be the order in which the types are listed to writers.

#### Scenario: Adding a typed form

- **WHEN** a new typed form is added
- **THEN** it SHALL be a new module under `diagrams/types/`, and the only other source file it changes in the registry SHALL be `diagrams/types/index.ts`

#### Scenario: The listed order is kept

- **WHEN** an unknown `type` is reported
- **THEN** the types SHALL be listed in the registry's order: the graph forms, then flows and time, then concepts, then charts, then before/after

### Requirement: Stable public barrel

`@nonete/content` SHALL be consumed only through `src/index.ts`, the package's single `exports` entry. Moving a module between folders SHALL NOT add, remove or rename an exported name. Consumers SHALL NOT import a module path inside the package.

#### Scenario: Consumers after a move

- **WHEN** a module of `packages/content` moves to another folder
- **THEN** `packages/api` SHALL compile without any change to its imports from `@nonete/content`

### Requirement: Tests mirror the source layout

A test of a module at `src/<area>/<path>.ts` SHALL live at `tests/<area>/<path>.test.ts`. Shared test data SHALL stay in `tests/fixtures/`, and helpers used by one area's tests SHALL live in that area's test folder. The structure test SHALL live at `tests/structure.test.ts` and read the real `src/` tree, so it stays hermetic.

#### Scenario: Where a test goes

- **WHEN** a test is written for `src/git/hosting.ts`
- **THEN** it SHALL be `tests/git/hosting.test.ts`

#### Scenario: Helpers of the typed form tests

- **WHEN** the typed form tests share a helper that reads a typed file
- **THEN** it SHALL live in `tests/diagrams/types/helpers.ts` and be imported as `#tests/diagrams/types/helpers`

