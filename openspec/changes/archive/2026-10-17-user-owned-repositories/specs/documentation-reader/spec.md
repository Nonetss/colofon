## MODIFIED Requirements

### Requirement: Reader procedures

The backend SHALL expose, under `v1.docs` and to every signed-in user, procedures to:
- read the navigation of every repository the caller can read (the platform's and their own, `user-content-repositories`), ordered by name: its slug, its display name, the `nombre` and `descripcion` of its `doc.config.yaml`, whether it has readable content, and its navigation tree (`content-pages`);
- read one page by repository slug and page path (the empty path being the repository's home): its header, render tree, headings, breadcrumbs, previous and next pages, its problems and the repository's cleaned stylesheet (`content-styles`), or `null` when the repository has none;
- read one image file of a repository's `docs/` folder by path, with its content type.

All three SHALL be `GET` procedures. An unknown repository, one the caller cannot read, a page that does not exist, or a file that does not exist or is not an allowed image SHALL answer `NOT_FOUND`. Users without a session SHALL get `UNAUTHORIZED`. Problems SHALL be returned in full only to users with the `admin` role; other users SHALL only learn whether the page has problems. A repository whose content has never been read or synced SHALL be listed without a tree and marked as having no readable content.

#### Scenario: Navigation of two repositories

- **WHEN** a signed-in user reads the navigation and the repositories `casa` and `trabajo` are stored with valid content
- **THEN** the answer SHALL list both, ordered by name, each with its tree of sections and pages

#### Scenario: Repository not synced yet

- **WHEN** a hosted repository has had nothing pushed
- **THEN** it SHALL be listed without a tree and marked as having no readable content

#### Scenario: Someone else's repository

- **WHEN** a user reads a page of a repository that belongs to another user
- **THEN** the procedure SHALL answer `NOT_FOUND`

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

- **WHEN** a user reads a page of a repository that holds `styles/theme.css`
- **THEN** the answer SHALL carry the repository's cleaned stylesheet, the same for every page of that repository
