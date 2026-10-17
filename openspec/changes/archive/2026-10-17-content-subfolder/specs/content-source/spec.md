## ADDED Requirements

### Requirement: Content root inside the clone

The content root of a repository SHALL be its clone folder joined with its `path` (`content-repository-management`). The declarations (`doc.config.yaml`, `menu.yaml`, the catalog types), the pages, the diagrams, the styles, the skills and the images served from `docs/` SHALL all be read under it, and the problems the platform reports SHALL name their files relative to it. Syncing, the git browser and hosting SHALL keep working on the whole git repository.

The resolved content root SHALL lie inside the clone, symbolic links followed. When the folder does not exist in the checkout, is not a directory or resolves outside the clone, the repository SHALL behave as one without valid content, and the backend SHALL log it once with the repository's slug, without revealing the path it resolved to.

The last edit dates (`Full history and last edit dates`) SHALL be read for the files under the content root and keyed by their paths relative to it.

#### Scenario: Declarations in a subfolder

- **WHEN** the repository has the path `docs` and the checkout holds `docs/doc.config.yaml` and `docs/docs/index.mdx`
- **THEN** the reader SHALL serve the site declared there, with `index` as its home

#### Scenario: Files outside the folder

- **WHEN** the checkout also holds a `catalog/` at its root, and the repository has the path `docs`
- **THEN** that root `catalog/` SHALL NOT be read

#### Scenario: Missing folder

- **WHEN** the repository has the path `docs` and the checkout has no such folder
- **THEN** the repository SHALL be listed without readable content and the backend SHALL log the problem once

#### Scenario: Symbolic link out of the clone

- **WHEN** the path names a symbolic link of the repository that points outside the clone
- **THEN** nothing outside the clone SHALL be read and the repository SHALL have no readable content

#### Scenario: Edit dates in a subfolder

- **WHEN** `docs/docs/red/dns.mdx` was last changed by a commit of 2026-03-02 and the path is `docs`
- **THEN** the page `red/dns` SHALL show the date 2026-03-02

#### Scenario: Image in a subfolder

- **WHEN** a page of a repository with the path `docs` links the image `red/img/zonas.svg`
- **THEN** the image SHALL be read from `docs/docs/red/img/zonas.svg` of the clone
