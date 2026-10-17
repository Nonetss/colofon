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

### Requirement: Content folder of a repository

A content repository SHALL have a `path`, the folder inside its git repository where its content lives, empty by default (the root of the repository). It SHALL be a relative path with `/` separators, at most 255 characters, whose segments are neither empty, `.`, `..` nor start with a dot, and that does not start with `/`; anything else SHALL fail input validation with a Spanish message and store nothing. Unlike the `slug`, it SHALL be editable.

The create and edit procedures, both the admin's and the owner's (`user-content-repositories`), SHALL accept `path`, edit keeping it when omitted, and every repository in a response SHALL carry it. Editing only the `path` SHALL NOT start a sync, since the clone is the same; it SHALL make the next read use the new folder. Creating SHALL start a sync as before.

The admin screen's form and the profile's repositories form SHALL offer it as an optional “Carpeta del contenido” field, empty meaning the root, and both cards SHALL show it when it is not empty.

#### Scenario: Site in a docs folder

- **WHEN** an admin creates a repository for this monorepo with the path `docs`
- **THEN** it SHALL be stored with the path `docs`, and its declarations and pages SHALL be read from that folder of the clone

#### Scenario: Default

- **WHEN** an admin creates a repository without a path
- **THEN** its path SHALL be empty and its content SHALL be read from the root, as before

#### Scenario: Path that climbs

- **WHEN** a user creates a repository with the path `../fuera` or `/etc`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Moving the content

- **WHEN** an owner edits only the path of their repository from empty to `documentacion`
- **THEN** no sync SHALL start and the next read SHALL use `documentacion` of the existing clone

#### Scenario: Form

- **WHEN** a user opens the creation form
- **THEN** it SHALL offer an optional “Carpeta del contenido” field, empty by default

### Requirement: Content folders of a repository

The backend SHALL expose to admins a procedure that lists the content folders of a git repository at a ref, and to every signed-in user an equivalent one limited to their own repositories (`user-content-repositories`). A content folder is a folder of the repository that contains a `doc.config.yaml`; the root counts as the empty path. It SHALL take the repository as in the branches procedure (a typed URL or the slug of a stored repository, one of the two) and an optional `ref`, defaulting to the remote's HEAD, and SHALL read only the repository's tree at that ref, never file contents. The answer SHALL list the folders as paths that are valid content paths, root first and then in alphabetical order, at most 50. Its input SHALL travel in the request body, never in the query string. An unknown slug SHALL answer `NOT_FOUND`, a remote or ref that can't be read `BAD_GATEWAY` with the git error without credentials, and a repository with no `doc.config.yaml` an empty list. A hosted repository SHALL be read from its bare repository on disk. The user's procedure SHALL refuse the URLs the user rules refuse (`BAD_REQUEST`) before any read.

#### Scenario: Site inside docs

- **WHEN** an admin lists the folders of a repository whose only `doc.config.yaml` is at `docs/doc.config.yaml`
- **THEN** the answer SHALL be `docs`

#### Scenario: Root and subfolder

- **WHEN** a repository has `doc.config.yaml` at its root and at `ejemplo/doc.config.yaml`
- **THEN** the answer SHALL list the root first and then `ejemplo`

#### Scenario: Other branch

- **WHEN** the branch `produccion` holds the site in `sitio` and `main` holds it in `docs`, and the folders are listed for `produccion`
- **THEN** the answer SHALL be `sitio`

#### Scenario: Remote that can't be read

- **WHEN** a remote rejects the credentials
- **THEN** the procedure SHALL answer `BAD_GATEWAY` with git's error and no credential in it

#### Scenario: A user asks for an internal address

- **WHEN** a user lists the folders of `https://192.168.1.10/x.git`
- **THEN** the backend SHALL answer `BAD_REQUEST` and read nothing

### Requirement: Content folder select

The “Carpeta del contenido” field of the admin form and of the profile's form SHALL be a select of the repository's content folders once they can be read: from the typed URL and the chosen ref once the URL is complete, from the stored repository while editing with the URL left empty, or from the platform's own bare repository for a hosted one. The root SHALL show as “Raíz del repositorio”. The options SHALL include the current value even when it isn't among the folders found, and SHALL refresh when the chosen branch changes. While the folders can't be read, or none is found, the field SHALL be a text field, with the reason as its hint when the read failed. Choosing the only folder found while creating SHALL NOT be automatic: the field starts at the root until the user chooses.

#### Scenario: Choosing the folder

- **WHEN** a user types the URL of a repository whose site is in `docs`
- **THEN** the field SHALL become a select offering “Raíz del repositorio” and `docs`

#### Scenario: Changing the branch

- **WHEN** the user picks another branch in the same form
- **THEN** the folders SHALL be read again for that branch

#### Scenario: Folder typed before

- **WHEN** an edited repository has the folder `antiguo`, which the listing doesn't find
- **THEN** the select SHALL still offer `antiguo`, selected

#### Scenario: Unreadable remote

- **WHEN** the folders can't be read
- **THEN** the field SHALL stay a text field and say why

### Requirement: Access token in the repository form

The form to add or edit an external repository, in the admin's “Contenido” screen and in the profile's “Repositorios” screen, SHALL hold the address without credentials in the URL field and, next to it, the access fields of `git-credentials` (a saved credential, or “Usuario” and a masked “Token de acceso” never prefilled). When credentials can't be saved because the platform has no encryption key, the fields SHALL be put in the URL, as follows: when a token is given, the form SHALL require a user and SHALL send the URL with that user and token as its credentials, percent-encoded, in place of any credentials the typed URL already carried; without a token, the typed URL SHALL be sent as it is, so a URL pasted with credentials keeps working. The form SHALL explain that the token is created in the git server and needs read access to the repository, without naming any git product. The branches and folders reads SHALL use the composed URL.

While editing, leaving the URL and the token empty SHALL keep the stored URL, credentials included. A token typed without the URL SHALL NOT be sent: the form SHALL ask for the URL, since the stored one is only known masked. The token SHALL travel only in the request body and SHALL NOT appear in any response, as in “Credentials never leave the backend”. This requirement does not apply to hosted repositories. All copy SHALL be in Spanish.

#### Scenario: Adding a private repository without saving credentials

- **WHEN** the platform has no encryption key and a user types `https://git.example.com/org/docs`, the user `ana` and the token `s3cr/et`
- **THEN** the form SHALL send `https://ana:s3cr%2Fet@git.example.com/org/docs` as the URL

#### Scenario: Token without user

- **WHEN** a token is typed and the user is empty
- **THEN** the form SHALL not submit and SHALL ask for the user

#### Scenario: Public repository

- **WHEN** the user and the token are left empty
- **THEN** the form SHALL send the URL as typed

#### Scenario: URL with credentials and no token

- **WHEN** the typed URL is `https://ana:tok@host/org/docs.git` and the token field is empty
- **THEN** the form SHALL send that URL unchanged

#### Scenario: Token replaces pasted credentials

- **WHEN** the typed URL is `https://ana:old@host/org/docs.git`, the user is `ana` and the token is `new`
- **THEN** the form SHALL send `https://ana:new@host/org/docs.git`

#### Scenario: Editing without retyping anything

- **WHEN** a repository is edited with the URL and the token left empty
- **THEN** the stored URL, credentials included, SHALL stay unchanged

#### Scenario: New token on edit needs the URL

- **WHEN** a token is typed while editing and the URL is empty
- **THEN** the form SHALL ask for the URL and SHALL NOT send the token
