# content-git-browser Specification

## Purpose
Lets admins look inside the content repositories the platform hosts, on any branch, from the admin panel: walk their folders and read their files without cloning them.
## Requirements
### Requirement: Folders of a hosted repository

The backend SHALL expose to admins, under the `v1.content` procedures, a read-only `GET` procedure that lists the entries of one folder of a hosted repository on one of its branches. It SHALL take the repository's `slug`, a `branch` name and a `path` relative to the repository root, empty for the root. Each entry SHALL carry its name, its path from the root, its kind (`folder`, `file` or `submodule`) and, for a file, its size in bytes. Entries SHALL be ordered folders first, then by name. A `path` that is absolute, ends in `/`, has an empty, `.` or `..` segment, or is longer than 1024 characters SHALL fail input validation.

It SHALL answer `NOT_FOUND` for an unknown slug, for a repository that is not hosted, for a `branch` that is not a branch of the repository, and for a `path` that is not a folder on that branch. It SHALL NOT write anything, not even a missing bare repository: a hosted repository nothing has been pushed to has no branches. A request without a session SHALL answer `UNAUTHORIZED` and one from a non-admin `FORBIDDEN`.

#### Scenario: Root of a branch

- **WHEN** an admin lists the root of `main` of the hosted repository `manual`, which holds `doc.config.yaml`, `docs/` and `catalog/`
- **THEN** the backend SHALL answer `catalog` and `docs` as folders, then `doc.config.yaml` as a file with its size

#### Scenario: Nested folder

- **WHEN** an admin lists the path `docs/red` of `main` of `manual`
- **THEN** each entry SHALL carry its path from the root, such as `docs/red/dns.mdx`

#### Scenario: Another branch

- **WHEN** an admin lists the root of `borrador` of `manual`, a branch with a file that `main` lacks
- **THEN** the answer SHALL include that file

#### Scenario: Unknown branch or path

- **WHEN** an admin lists `main` of `manual` at the path `no-existe`, or the root of the branch `no-existe`
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: External repository

- **WHEN** an admin lists the root of `main` of `homelab`, an external repository
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Escaping the root

- **WHEN** an admin lists the path `docs/../..`
- **THEN** the request SHALL fail input validation

### Requirement: Files of a hosted repository

The backend SHALL expose to admins a read-only `GET` procedure that reads one file of a hosted repository on one of its branches, taking the repository's `slug`, a `branch` and the file's `path`, validated as for folders and not empty. It SHALL answer the file's path and size in bytes and, for a text file of at most 512 KiB, its content decoded as UTF-8. A file holding a NUL byte in its first 8000 bytes SHALL be answered as binary, and a larger file as too large, both without content. It SHALL answer `NOT_FOUND` for an unknown slug, a repository that is not hosted, a `branch` that is not one of its branches, and a `path` that is not a file on that branch, and SHALL NOT write anything. Access SHALL be as for folders.

#### Scenario: Text file

- **WHEN** an admin reads `docs/index.mdx` on `main` of `manual`
- **THEN** the backend SHALL answer its content and size

#### Scenario: Binary file

- **WHEN** an admin reads `docs/diagrama.png` on `main` of `manual`
- **THEN** the backend SHALL answer it as binary, with its size and no content

#### Scenario: Large file

- **WHEN** an admin reads a 2 MiB text file
- **THEN** the backend SHALL answer it as too large, with its size and no content

#### Scenario: A folder is not a file

- **WHEN** an admin reads the path `docs` on `main` of `manual`
- **THEN** the backend SHALL answer `NOT_FOUND`

### Requirement: Git repositories screen

The admin panel SHALL provide a “Git” screen at `/admin/git`, listed in the admin navigation and overview for admins only, that shows each hosted repository as a card with its name, slug, published ref and git URL with a control to copy it, and a search field that keeps only the cards whose name or slug contains every word typed, ignoring case and accents. The search SHALL live in the page's URL. Opening a card SHALL go to that repository's code screen. With no hosted repository, it SHALL say so and link to `/admin/content` to create one; when the search matches none, it SHALL say so and offer to clear it.

Non-admin users SHALL NOT reach the screen; the request SHALL be redirected to the home page. All of its copy SHALL be in Spanish.

#### Scenario: Searching

- **WHEN** an admin types `man` in the search of `/admin/git`, with the hosted repositories `manual` and `notas`
- **THEN** only the `manual` card SHALL remain, and reloading the page SHALL keep the search

#### Scenario: Opening a repository

- **WHEN** an admin opens the `manual` card
- **THEN** the browser SHALL go to `/admin/git/manual`

#### Scenario: No hosted repository

- **WHEN** an admin opens `/admin/git` and every content repository is external
- **THEN** the screen SHALL say there is no hosted repository and link to `/admin/content`

#### Scenario: Non-admin request

- **WHEN** an authenticated user without the `admin` role requests `/admin/git`
- **THEN** the request SHALL be redirected to the home page

### Requirement: Repository code screen

The admin panel SHALL provide a code screen at `/admin/git/<slug>` for each hosted repository, with a link back to `/admin/git`, that:
- shows the repository's name and git URL with a control to copy it;
- offers its branches in a select, starting on the repository's ref when it is one of its branches, else on the branch its HEAD points at, else on the first;
- shows the current folder's entries in a table with their name and, for files, their size, with a breadcrumb from the repository root to the current folder; opening a folder enters it and opening a file shows it;
- shows a file as monospaced text with line numbers, and, for a binary or too large file, its size and why it is not shown;
- keeps the branch, folder and file in the page's URL, so reloading or sharing it opens the same view and the browser's back button returns to the previous one; a URL whose branch, folder or file no longer exists falls back to the repository's root on its starting branch;
- for a hosted repository nothing has been pushed to, says it is empty and shows its git URL to push to;
- for a slug with no hosted repository, says so and links back to `/admin/git`.

Non-admin users SHALL NOT reach the screen. All of its copy SHALL be in Spanish. The screen SHALL NOT offer any action that writes.

#### Scenario: Walking into a folder

- **WHEN** an admin opens `/admin/git/manual` and opens the folder `docs`
- **THEN** the screen SHALL list the entries of `docs` on `manual`'s starting branch, the breadcrumb SHALL read `Manual / docs`, and the URL SHALL name the branch and `docs`

#### Scenario: Opening a file

- **WHEN** an admin opens `docs/index.mdx` from the listing
- **THEN** the screen SHALL show its text with line numbers, and going back in the browser SHALL show the `docs` listing again

#### Scenario: Switching branch

- **WHEN** an admin viewing `docs` on `main` picks the branch `borrador`
- **THEN** the screen SHALL list `docs` on `borrador`, or the root of `borrador` when it has no `docs` folder

#### Scenario: Empty hosted repository

- **WHEN** an admin opens the code screen of a hosted repository nothing has been pushed to
- **THEN** the screen SHALL say it is empty and show its git URL with a control to copy it

#### Scenario: Unknown repository

- **WHEN** an admin opens `/admin/git/no-existe`
- **THEN** the screen SHALL say there is no such hosted repository and link back to `/admin/git`

