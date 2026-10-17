# content-repository-management Specification

## Purpose
Stores the content repositories the platform reads in the database and lets administrators list, create, edit, delete and sync them from admin-only procedures and the `/admin/content` screen.

## Requirements

### Requirement: Content repositories in the database

The platform SHALL keep its content repositories in the database, one record per git repository, with:
- `slug`: unique, 1 to 63 characters of lowercase letters, digits and single hyphens, neither starting nor ending with a hyphen, and none of the reserved names taken by the web's own top-level routes or by the paths the gateway sends to the backend (such as `admin`, `api`, `rpc`, `git`, `login`, `me` or `scalar`); it names the repository in the editor's schema URLs, in a hosted repository's git URL and in its reader routes (`/<slug>/…`), and SHALL NOT change after the repository is created;
- `name`: a display name, required;
- `url`: for an external repository, the git repository's `https://` or `http://` URL, with any credentials inside it; for a repository hosted by the platform (`content-git-hosting`), the marker `/git/<slug>.git` with its own slug;
- `ref`: the branch, tag or commit to check out, default `main`;
- the outcome of its last sync: when it ran, the commit checked out on success and the error on failure, each empty until the first sync.

A repository SHALL be hosted exactly when its `url` is its own marker. The marker SHALL only be stored by asking for a hosted repository, never typed as a URL.

#### Scenario: Two repositories

- **WHEN** an admin creates the repositories `documentacion` and `homelab`
- **THEN** both SHALL be stored, and each SHALL have its own schema catalog

#### Scenario: Invalid slug

- **WHEN** an admin creates a repository with the slug `Mi Repo`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Reserved slug

- **WHEN** an admin creates a repository with the slug `admin`
- **THEN** the request SHALL fail input validation with a Spanish message saying the name is reserved, and nothing SHALL be stored

#### Scenario: Hosted repository stored

- **WHEN** an admin creates the hosted repository `manual`
- **THEN** its stored `url` SHALL be `/git/manual.git`

#### Scenario: Marker typed as a URL

- **WHEN** an admin creates a repository sending `/git/manual.git` as its URL
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

### Requirement: Admin-only management procedures

The backend SHALL expose, under the `v1.content` procedures and only to users with the `admin` role, procedures to:
- list the platform's repositories (those that belong to no user, `user-content-repositories`), ordered by name;
- create a repository (HTTP 201), either external with a `url` or hosted;
- edit a repository's `name`, `url` and `ref`, or make it hosted, keeping omitted fields; the `slug` SHALL NOT be editable;
- delete a repository;
- sync a repository now, answering once the sync ends with the commit checked out.

Create and edit SHALL refuse a request that sends both a `url` and asks for a hosted repository; create SHALL also refuse one that sends neither. Editing a hosted repository with a `url` SHALL make it external. Every repository in a response SHALL say whether it is hosted and, for a hosted one, carry its push URL, `<platform origin>/git/<slug>.git`; an external one SHALL carry no push URL.

These procedures SHALL act only on the platform's repositories: a repository that belongs to a user SHALL answer `NOT_FOUND` to them, and the slug of one SHALL count as taken on create. A request without a session SHALL answer `UNAUTHORIZED` and one from a non-admin `FORBIDDEN`, except syncing a repository, which any signed-in user may do for the repositories they can read (every platform repository and their own). Creating a repository with a slug already in use SHALL answer `CONFLICT` and store nothing. Editing, deleting or syncing an unknown or unreadable repository SHALL answer `NOT_FOUND`. A sync that fails SHALL answer `BAD_GATEWAY` with the git error, without credentials, and SHALL store that failure as the repository's last sync.

#### Scenario: Duplicate slug

- **WHEN** an admin creates a repository with the slug `documentacion` and one with that slug exists
- **THEN** the backend SHALL answer `CONFLICT` and SHALL NOT create a second record

#### Scenario: Non-admin

- **WHEN** an authenticated user without the `admin` role lists the repositories
- **THEN** the backend SHALL answer `FORBIDDEN`

#### Scenario: Editing the ref

- **WHEN** an admin changes only the `ref` of `documentacion` to `produccion`
- **THEN** its name and URL SHALL stay as they were and the next sync SHALL check out `produccion`

#### Scenario: Push URL of a hosted repository

- **WHEN** an admin lists the repositories on a platform served at `https://docs.example.com` and `manual` is hosted
- **THEN** `manual` SHALL be returned as hosted with the push URL `https://docs.example.com/git/manual.git`

#### Scenario: Both URL and hosted

- **WHEN** an admin creates a repository sending a URL and asking for a hosted one
- **THEN** the backend SHALL answer `BAD_REQUEST` and store nothing

### Requirement: Credentials never leave the backend

No management procedure response SHALL include the credentials of a repository's URL: the URL SHALL be returned with its user and password replaced by `***`, and a stored or returned sync error SHALL have them removed. Logs SHALL never include them.

#### Scenario: Private repository listed

- **WHEN** a repository's URL is `https://ana:secreto@git.example.com/org/docs.git` and an admin lists the repositories
- **THEN** its URL SHALL be returned as `https://***@git.example.com/org/docs.git` and no response or log line SHALL contain `secreto`

#### Scenario: Editing without retyping the token

- **WHEN** an admin edits the name of a private repository without sending a URL
- **THEN** the stored URL, credentials included, SHALL stay unchanged

### Requirement: Changes reach the clone

Creating an external repository, or changing a repository's `url` or `ref` or making it hosted, SHALL start a sync of that repository without making the request wait for it. Creating a hosted repository, or making one hosted, SHALL create its bare repository when it doesn't exist, with `HEAD` pointing at its `ref`. Creating a hosted repository SHALL NOT start a sync, since nothing has been pushed to it yet. Deleting a repository SHALL remove its clone and, for a hosted repository, its bare repository, and its schema endpoints SHALL answer `NOT_FOUND` from then on. Making a hosted repository external SHALL keep its bare repository until the repository is deleted.

#### Scenario: New repository

- **WHEN** an admin creates a repository whose remote is reachable
- **THEN** the request SHALL answer without waiting for the clone, and the repository's catalog SHALL list its schemas once the sync ends

#### Scenario: New hosted repository

- **WHEN** an admin creates the hosted repository `manual` with the ref `main`
- **THEN** an empty bare repository SHALL exist for it, no sync SHALL run, and its last sync SHALL stay empty

#### Scenario: Deleted repository

- **WHEN** an admin deletes the repository `homelab`
- **THEN** its clone SHALL be removed and `GET /api/v1/content/schemas/homelab` SHALL answer `NOT_FOUND`

#### Scenario: Deleted hosted repository

- **WHEN** an admin deletes the hosted repository `manual`
- **THEN** its bare repository SHALL be removed and `/git/manual.git` SHALL answer `404`

### Requirement: Branches of a repository

The backend SHALL expose to admins a procedure that lists the branches of a git repository, read from the remote without cloning it, and the branch its HEAD points at. It SHALL take either a typed `https://` or `http://` URL or the slug of a stored repository, which it reads at its stored URL with the credentials the client never sees, or from its bare repository when it is hosted, and SHALL refuse both or neither. Its input SHALL travel in the request body, never in the query string, since the URL may carry credentials. An unknown slug SHALL answer `NOT_FOUND`, and a remote that can't be read `BAD_GATEWAY` with the git error, without credentials. A hosted repository nothing has been pushed to SHALL answer no branches.

#### Scenario: Branches of a typed URL

- **WHEN** an admin asks for the branches of a repository with the branches `main` and `produccion` whose HEAD points at `main`
- **THEN** the backend SHALL answer `main` and `produccion`, with `main` as the default branch

#### Scenario: Branches of a private stored repository

- **WHEN** an admin asks for the branches of the stored repository `documentacion`, whose URL carries a token
- **THEN** the backend SHALL read them with that token, and the answer SHALL NOT include it

#### Scenario: Branches of a hosted repository

- **WHEN** an admin asks for the branches of the hosted repository `manual`, to which `main` and `borrador` were pushed
- **THEN** the backend SHALL answer `borrador` and `main`

### Requirement: Content admin screen

The admin panel SHALL provide a “Contenido” screen at `/admin/content`, listed in the admin navigation and overview for admins only, that:
- shows each repository as a card with its name, slug, URL without credentials (for a hosted repository, that it is hosted), ref and last sync (time and short commit, or the full error), a button to sync it and a menu to edit or delete it, in one column or two depending on the width available;
- shows each repository's catalog URL, ready to copy into the editor's `yaml.schemaStore.url`, and, for a hosted repository, its push URL with a control to copy it;
- creates and edits repositories in a form, where the slug is only editable on creation; the source is chosen between an external URL and “Alojado en la plataforma”; for an external source, an empty URL field on edit keeps the stored URL, and the ref is chosen from a select of the remote's branches once they can be read (the typed URL once complete, or the stored repository while editing with the URL left empty), preselecting the default branch on creation; for a hosted source, the ref is chosen from its branches while editing a hosted repository that has any; while branches can't be read or there are none, the ref is typed;
- deletes a repository after a confirmation, warning that a hosted repository's history is deleted with it;
- shows the outcome of an on-demand sync on the repository's card.

Non-admin users SHALL NOT reach the screen; the request SHALL be redirected to the home page. All of its copy SHALL be in Spanish.

#### Scenario: Copying the editor URL

- **WHEN** an admin opens `/admin/content` on a platform served at `https://docs.example.com` with the repository `documentacion`
- **THEN** the screen SHALL show `https://docs.example.com/api/v1/content/schemas/documentacion` for that repository with a control to copy it

#### Scenario: Choosing a branch

- **WHEN** an admin types the complete URL of a repository with the branches `main` and `produccion` in the creation form
- **THEN** the ref SHALL become a select offering `main` and `produccion`, with `main` selected

#### Scenario: Creating a hosted repository

- **WHEN** an admin chooses “Alojado en la plataforma” in the creation form
- **THEN** the form SHALL hide the URL field, keep the ref typed with `main` as its default, and once saved the screen SHALL show the repository's push URL with a control to copy it

#### Scenario: Failed sync shown

- **WHEN** an admin syncs a repository whose remote rejects the credentials
- **THEN** the screen SHALL show the sync failed with the git error, without the credentials

#### Scenario: Non-admin request

- **WHEN** an authenticated user without the `admin` role requests `/admin/content`
- **THEN** the request SHALL be redirected to the home page
