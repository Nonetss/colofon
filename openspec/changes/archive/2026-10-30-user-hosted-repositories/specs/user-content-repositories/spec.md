## MODIFIED Requirements

### Requirement: Repository ownership and visibility

A content repository SHALL either belong to no user (a platform repository, as created by admins) or belong to exactly one user, whether it is external or hosted by the platform. A platform repository SHALL be readable by every signed-in user. A repository that belongs to a user SHALL be readable only by that user and by the members of the organizations it is shared with (`repository-sharing`): the reader, the documentation search, the skills, the `llms.txt` pages and the MCP tools SHALL neither list it nor serve any of its pages, files or skills to anyone else, admins included, and SHALL answer for it as for an unknown repository (`NOT_FOUND`). The only exception SHALL be the git endpoint of a user's hosted repository, which serves it with no credentials (`content-git-hosting`). The periodic sync SHALL keep syncing every repository, whoever owns it. Deleting a user SHALL delete their repositories, their clones and their shares.

#### Scenario: Private repository in the navigation

- **WHEN** `ana` owns the repository `apuntes` and `luis` reads the navigation
- **THEN** `apuntes` SHALL NOT be listed for `luis`, and it SHALL be listed for `ana` beside the platform repositories

#### Scenario: Page of someone else's repository

- **WHEN** `luis` reads a page of `apuntes`
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Admin does not read it either

- **WHEN** an admin lists the repositories in the MCP or the reader
- **THEN** `apuntes` SHALL NOT appear

#### Scenario: Periodic sync

- **WHEN** the five-minute job runs with the platform repository `casa` and `ana`'s `apuntes`
- **THEN** both SHALL be synced

#### Scenario: Shared with the reader's organization

- **WHEN** `ana` shares `apuntes` with `equipo-docs` and `luis`, a member of `equipo-docs`, reads the navigation
- **THEN** `apuntes` SHALL be listed for `luis`

#### Scenario: Private hosted repository in the reader

- **WHEN** `ana` owns the hosted repository `notas`, not shared, and `luis` reads one of its pages
- **THEN** the backend SHALL answer `NOT_FOUND`, even though `luis` can clone `notas` from its git URL

### Requirement: Owner-only management procedures

The backend SHALL expose to every signed-in user procedures, under `v1.content`, to list, create, edit, delete and read the branches of their own repositories, and to sync them (the sync procedure of `content-repository-management`). They SHALL act only on repositories the caller owns: any other slug, a platform repository's included, SHALL answer `NOT_FOUND`. A user's repository SHALL be either external, with a `url`, or hosted by the platform, created with `hosted: true` instead of a `url`; creating one with both or neither SHALL fail input validation. Both SHALL take a `name` and a `ref` (default `main`), validated like the admin's. An external one's `url` SHALL be validated like the admin's. A hosted one SHALL take no credential and SHALL be served at `/git/<slug>.git` (`content-git-hosting`). A repository SHALL keep the source it was created with: editing a hosted one with a `url` or a credential SHALL answer `BAD_REQUEST` and change nothing, and the edit procedure SHALL NOT take `hosted`, and SHALL ignore it when sent. The `slug` SHALL follow the same rules as in `content-repository-management` and SHALL be unique across all repositories; a slug in use SHALL answer `CONFLICT`. Creating or editing an external repository SHALL start a sync without waiting for it, credentials SHALL never leave the backend, and a failing sync SHALL answer `BAD_GATEWAY` with the git error, all as in `content-repository-management`. Creating a hosted repository SHALL create its empty bare repository and start no sync, as the admin's do. Reading the branches of a stored hosted repository SHALL read its bare repository. Each repository these procedures return SHALL carry the organizations it is shared with (id, name and slug), ordered by name, whether it is hosted, and, for a hosted one, the absolute git URL to clone and push it (`null` for an external one). Requests without a session SHALL answer `UNAUTHORIZED`.

#### Scenario: Creating a repository

- **WHEN** `ana` creates the repository `apuntes` with the URL `https://github.com/ana/apuntes.git`
- **THEN** it SHALL be stored as hers with the ref `main`, a sync SHALL start, and only she SHALL see it

#### Scenario: Creating a hosted repository

- **WHEN** `ana` creates the repository `notas` with `hosted: true`
- **THEN** it SHALL be stored as hers, hosted, with an empty bare repository, no sync SHALL start, and the answer SHALL carry `hosted: true` and the git URL ending in `/git/notas.git`

#### Scenario: Both or neither source

- **WHEN** a user creates a repository with both a `url` and `hosted: true`, or with neither
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Hosted not offered

- **WHEN** a user edits their external repository `apuntes` with `hosted: true`
- **THEN** `hosted` SHALL be ignored and `apuntes` SHALL stay external

#### Scenario: Giving a hosted repository a URL

- **WHEN** `ana` edits her hosted repository `notas` with a `url`
- **THEN** the backend SHALL answer `BAD_REQUEST` and `notas` SHALL stay hosted

#### Scenario: Editing someone else's repository

- **WHEN** `luis` edits `apuntes`
- **THEN** the backend SHALL answer `NOT_FOUND` and change nothing

#### Scenario: Editing a platform repository

- **WHEN** a non-admin user edits the platform repository `casa` through the owner procedures
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Slug already used by another user

- **WHEN** `luis` creates a repository with the slug `apuntes`, which is `ana`'s
- **THEN** the backend SHALL answer `CONFLICT` and store nothing

#### Scenario: Listing a shared repository

- **WHEN** `ana` lists her repositories and `apuntes` is shared with `equipo-docs`
- **THEN** `apuntes` SHALL be returned with `equipo-docs` among its organizations, `hosted: false` and no git URL

#### Scenario: Branches of a hosted repository

- **WHEN** `ana` reads the branches of `notas` after pushing `main` and `borrador` to it
- **THEN** the backend SHALL answer `main` and `borrador`

### Requirement: Restricted remotes

A user MAY own any number of repositories. The URL of a user's external repository SHALL use `https://` and its host SHALL NOT be a loopback, private, link-local or unspecified address, whether typed as an IP literal or resolved from a name; the check SHALL run on create, on edit and before every sync. A URL that fails it SHALL be refused on create and edit (input validation) and make the sync fail with an error that does not reveal the resolved address. A user's hosted repository has no remote: its syncs SHALL read its bare repository with no remote check. Admin-created repositories SHALL keep the URL rules of `content-repository-management`.

#### Scenario: Eleventh repository

- **WHEN** a user who owns 10 repositories creates another
- **THEN** it SHALL be stored and its first sync SHALL start, as the first one was

#### Scenario: Internal address

- **WHEN** a user creates a repository with the URL `https://192.168.1.10/x.git`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Plain HTTP

- **WHEN** a user creates a repository with the URL `http://github.com/ana/x.git`
- **THEN** the request SHALL fail input validation

#### Scenario: Name that now resolves inside

- **WHEN** the host of a stored user repository starts resolving to a private address and it is synced
- **THEN** the sync SHALL fail and record an error, and no clone or fetch SHALL be attempted

#### Scenario: Syncing a user's hosted repository

- **WHEN** `ana` pushes to `main` of her hosted repository `notas` and it is synced
- **THEN** the sync SHALL succeed and record the pushed commit

### Requirement: Repositories screen in the profile

The profile section SHALL provide a “Repositorios” page at `/me/repositories`, listed in the profile sidebar for every signed-in user, that shows the user's own repositories as cards (name, slug, the URL without credentials for an external one or the git URL with a control to copy it for a hosted one, ref and last sync with its time and short commit or its full error, a sync button, the organizations it is shared with and a menu to edit or delete) and an empty state with a button to add one. Creating SHALL use a form that first chooses the source, “Repositorio externo” or “Alojado en la plataforma”, then asks for name, slug (editable only on creation), the ref and the organizations to share it with (`repository-sharing`), and, for an external one only, the URL and its login. Editing SHALL use the same form with the source fixed and not changeable. For an external repository an empty URL on edit SHALL keep the stored one, and the ref SHALL be chosen from the remote's branches once they can be read, as in `content-repository-management`. For a hosted one the ref SHALL be chosen from its branches, or typed while it has none. Deleting SHALL ask for a confirmation, and for a hosted repository SHALL warn that its git history is deleted too. All copy SHALL be in Spanish. A request without a session SHALL be redirected to the login.

#### Scenario: Empty state

- **WHEN** a user without repositories opens `/me/repositories`
- **THEN** the page SHALL explain that the repositories are only visible to them and to the organizations they share them with, and offer to add one

#### Scenario: Failed sync shown

- **WHEN** a user syncs a repository whose remote rejects the credentials
- **THEN** the card SHALL show the failure with git's error, without the credentials

#### Scenario: Reaching the new repository

- **WHEN** a user adds `apuntes` and its first sync succeeds
- **THEN** the reader's repository selector SHALL list `apuntes` for that user only, until they share it, and `/apuntes` SHALL open its home

#### Scenario: Creating a hosted repository from the form

- **WHEN** `ana` picks “Alojado en la plataforma”, names it `notas` and saves
- **THEN** the form SHALL NOT have asked for a URL or a login, and the `notas` card SHALL show its git URL with a control to copy it

#### Scenario: Editing a hosted repository

- **WHEN** `ana` edits `notas`
- **THEN** the form SHALL show it as hosted, without a way to change the source or a URL field
