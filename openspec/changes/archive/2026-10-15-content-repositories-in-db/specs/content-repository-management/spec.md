## Purpose

Stores the content repositories the platform reads in the database and lets administrators list, create, edit, delete and sync them from admin-only procedures and the `/admin/content` screen.

## ADDED Requirements

### Requirement: Content repositories in the database

The platform SHALL keep its content repositories in the database, one record per git repository, with:
- `slug`: unique, 1 to 63 characters of lowercase letters, digits and single hyphens, neither starting nor ending with a hyphen; it names the repository in the editor's schema URLs and SHALL NOT change after the repository is created;
- `name`: a display name, required;
- `url`: the git repository's `https://` or `http://` URL, with any credentials inside it;
- `ref`: the branch, tag or commit to check out, default `main`;
- the outcome of its last sync: when it ran, the commit checked out on success and the error on failure, each empty until the first sync.

#### Scenario: Two repositories

- **WHEN** an admin creates the repositories `documentacion` and `homelab`
- **THEN** both SHALL be stored, and each SHALL have its own schema catalog

#### Scenario: Invalid slug

- **WHEN** an admin creates a repository with the slug `Mi Repo`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

### Requirement: Admin-only management procedures

The backend SHALL expose, under the `v1.content` procedures and only to users with the `admin` role, procedures to:
- list every repository, ordered by name;
- create a repository (HTTP 201);
- edit a repository's `name`, `url` and `ref`, keeping omitted fields; the `slug` SHALL NOT be editable;
- delete a repository;
- sync a repository now, answering once the sync ends with the commit checked out.

A request without a session SHALL answer `UNAUTHORIZED` and one from a non-admin `FORBIDDEN`. Creating a repository with a slug already in use SHALL answer `CONFLICT` and store nothing. Editing, deleting or syncing an unknown repository SHALL answer `NOT_FOUND`. A sync that fails SHALL answer `BAD_GATEWAY` with the git error, without credentials, and SHALL store that failure as the repository's last sync.

#### Scenario: Duplicate slug

- **WHEN** an admin creates a repository with the slug `documentacion` and one with that slug exists
- **THEN** the backend SHALL answer `CONFLICT` and SHALL NOT create a second record

#### Scenario: Non-admin

- **WHEN** an authenticated user without the `admin` role lists the repositories
- **THEN** the backend SHALL answer `FORBIDDEN`

#### Scenario: Editing the ref

- **WHEN** an admin changes only the `ref` of `documentacion` to `produccion`
- **THEN** its name and URL SHALL stay as they were and the next sync SHALL check out `produccion`

### Requirement: Credentials never leave the backend

No management procedure response SHALL include the credentials of a repository's URL: the URL SHALL be returned with its user and password replaced by `***`, and a stored or returned sync error SHALL have them removed. Logs SHALL never include them.

#### Scenario: Private repository listed

- **WHEN** a repository's URL is `https://ana:secreto@git.example.com/org/docs.git` and an admin lists the repositories
- **THEN** its URL SHALL be returned as `https://***@git.example.com/org/docs.git` and no response or log line SHALL contain `secreto`

#### Scenario: Editing without retyping the token

- **WHEN** an admin edits the name of a private repository without sending a URL
- **THEN** the stored URL, credentials included, SHALL stay unchanged

### Requirement: Changes reach the clone

Creating a repository, or changing its `url` or `ref`, SHALL start a sync of that repository without making the request wait for it. Deleting a repository SHALL remove its clone, and its schema endpoints SHALL answer `NOT_FOUND` from then on.

#### Scenario: New repository

- **WHEN** an admin creates a repository whose remote is reachable
- **THEN** the request SHALL answer without waiting for the clone, and the repository's catalog SHALL list its schemas once the sync ends

#### Scenario: Deleted repository

- **WHEN** an admin deletes the repository `homelab`
- **THEN** its clone SHALL be removed and `GET /api/v1/content/schemas/homelab` SHALL answer `NOT_FOUND`

### Requirement: Content admin screen

The admin panel SHALL provide a “Contenido” screen at `/admin/content`, listed in the admin navigation and overview for admins only, that:
- lists the repositories in a table with their name, slug, URL without credentials, ref and last sync (time, short commit, or the error);
- shows each repository's catalog URL, ready to copy into the editor's `yaml.schemaStore.url`;
- creates and edits repositories in a form, where the slug is only editable on creation and an empty URL field on edit keeps the stored URL;
- deletes a repository after a confirmation;
- syncs a repository on demand and shows the outcome.

Non-admin users SHALL NOT reach the screen; the request SHALL be redirected to the home page. All of its copy SHALL be in Spanish.

#### Scenario: Copying the editor URL

- **WHEN** an admin opens `/admin/content` on a platform served at `https://docs.example.com` with the repository `documentacion`
- **THEN** the screen SHALL show `https://docs.example.com/api/v1/content/schemas/documentacion` for that repository with a control to copy it

#### Scenario: Failed sync shown

- **WHEN** an admin syncs a repository whose remote rejects the credentials
- **THEN** the screen SHALL show the sync failed with the git error, without the credentials

#### Scenario: Non-admin request

- **WHEN** an authenticated user without the `admin` role requests `/admin/content`
- **THEN** the request SHALL be redirected to the home page
