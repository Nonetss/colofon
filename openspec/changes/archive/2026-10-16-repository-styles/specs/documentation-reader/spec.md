## MODIFIED Requirements

### Requirement: Reader procedures

The backend SHALL expose, under `v1.docs` and to every signed-in user, procedures to:
- read the navigation of every stored repository, ordered by name: its slug, its display name, the `nombre` and `descripcion` of its `doc.config.yaml`, whether it has readable content, and its navigation tree (`content-pages`);
- read one page by repository slug and page path (the empty path being the repository's home): its header, render tree, headings, breadcrumbs, previous and next pages, its problems and the repository's cleaned stylesheet (`content-styles`), or `null` when the repository has none;
- read one image file of a repository's `docs/` folder by path, with its content type.

All three SHALL be `GET` procedures. An unknown repository, a page that does not exist, or a file that does not exist or is not an allowed image SHALL answer `NOT_FOUND`. Users without a session SHALL get `UNAUTHORIZED`. Problems SHALL be returned in full only to users with the `admin` role; other users SHALL only learn whether the page has problems. A repository whose content has never been read or synced SHALL be listed without a tree and marked as having no readable content.

#### Scenario: Navigation of two repositories

- **WHEN** a signed-in user reads the navigation and the repositories `casa` and `trabajo` are stored with valid content
- **THEN** the answer SHALL list both, ordered by name, each with its tree of sections and pages

#### Scenario: Repository not synced yet

- **WHEN** a hosted repository has had nothing pushed
- **THEN** it SHALL be listed without a tree and marked as having no readable content

#### Scenario: Page of an unknown repository

- **WHEN** a user reads the page `red/dns` of the repository `nadie`
- **THEN** the procedure SHALL answer `NOT_FOUND`

#### Scenario: Problems for a non-admin

- **WHEN** a user without the `admin` role reads a page that has problems
- **THEN** the answer SHALL say the page has problems and SHALL NOT list them

#### Scenario: File outside docs

- **WHEN** a user asks for the file `../doc.config.yaml` of a repository
- **THEN** the procedure SHALL answer `NOT_FOUND` and read nothing outside `docs/`

#### Scenario: Page of a repository with styles

- **WHEN** a user reads a page of a repository that holds `estilos/tema.css`
- **THEN** the answer SHALL carry the repository's cleaned stylesheet, the same for every page of that repository

## ADDED Requirements

### Requirement: Repository styles on its pages

When a page's answer carries a stylesheet, the reader SHALL apply it to that page after the platform's styles, so that where both set the same property with the same selector weight the repository's value wins, the theme tokens of `:root` and `.dark` included. The stylesheet SHALL be part of the page's HTML, so it applies on the first paint and leaves with the page when the reader navigates to a page of another repository. Pages of other repositories, the "Todos" home and every page outside the reader SHALL NOT get it.

#### Scenario: A repository with its own primary colour

- **WHEN** a repository's `estilos/tema.css` sets `--primary` on `:root` and on `.dark`, and a user opens one of its pages
- **THEN** the page's links, accents and tokens built on `--primary` SHALL take the repository's colour in both themes

#### Scenario: Leaving for another repository

- **WHEN** the user goes from a page of a repository with styles to a page of a repository without them
- **THEN** the second page SHALL show the platform's styles only

#### Scenario: The admin area

- **WHEN** the user opens `/admin` after reading a repository with styles
- **THEN** no style of that repository SHALL apply
