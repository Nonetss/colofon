## MODIFIED Requirements

### Requirement: One folder per area

`packages/content/src/` SHALL hold only the public barrel `index.ts` and one folder per area:

- `contract/`: the content contract, in subfolders by concern: `schema/` (the meta-schema, entity schemas, icon names and the generated Lucide list), `read/` (`loadContent`, the content files and paths, YAML and JSON parsing, the problem types shared by every area), `versions/` (the contract versions and reading a contract 1 repository) and `catalog/` (`readCatalog` and the catalog page paths), plus reserved slugs and image files at its root.
- `git/`: clones of content repositories, the git server of hosted repositories, and reading a bare repository's folders and files.
- `editor/`: the editor JSON Schemas and their catalog.
- `diagrams/`: reading, checking, laying out and drawing diagram files, with the typed forms under `diagrams/types/`.
- `styles/`: the style modules of a repository's `styles/`: their names and order, reading them and cleaning them into one stylesheet.
- `pages/`: the MDX page pipeline, the navigation, the generated catalog pages and the entity tables.
- `skills/`: reading a repository's `skills/` folder, the skills the platform serves to agents.

A module SHALL live in the folder of the area it belongs to, and its file name SHALL NOT repeat the folder's name as a prefix.

#### Scenario: The source root

- **WHEN** `packages/content/src/` is listed
- **THEN** it SHALL contain `index.ts` and the folders `contract`, `git`, `editor`, `diagrams`, `styles`, `pages` and `skills`, and no other file or folder

#### Scenario: A diagram module

- **WHEN** a module draws a diagram as SVG
- **THEN** it SHALL be `src/diagrams/svg.ts`, imported as `#diagrams/svg`, not a `diagram-svg.ts` under `src/pages/`

### Requirement: One-way dependencies between areas

A module SHALL import from another area only along these directions:

- `contract` imports from no other area.
- `git` imports only from `contract`.
- `diagrams` imports only from `contract`.
- `styles` imports only from `contract`.
- `skills` imports only from `contract`.
- `pages` imports only from `contract`, `diagrams`, `styles` and `skills`.
- `editor` imports only from `contract` and `diagrams`.
- Only `src/index.ts` may import from every area.

A helper needed by two areas SHALL live in the lowest area both may import from. It SHALL NOT be imported upward.

#### Scenario: A diagram needs an entity's page path

- **WHEN** diagram code needs the page an entity links to
- **THEN** it SHALL import `entityPagePath` from `#contract/catalog/paths`, never from a module under `pages/`

#### Scenario: A forbidden direction is introduced

- **WHEN** a module under `contract/` imports a module under `pages/`, or one under `diagrams/` imports one under `pages/` or `editor/`, or one under `styles/` or `skills/` imports one under `pages/`
- **THEN** the package's structure test SHALL fail and name the importing file and the imported module
