## MODIFIED Requirements

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
