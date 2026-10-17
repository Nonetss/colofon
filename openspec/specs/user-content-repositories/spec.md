## Purpose

Lets any signed-in user add, edit, delete and sync their own external git repositories, readable only by them, alongside the repositories the administrators register for everyone.

## Requirements

### Requirement: Repository ownership and visibility

A content repository SHALL either belong to no user (a platform repository, as created by admins) or belong to exactly one user. A platform repository SHALL be readable by every signed-in user. A repository that belongs to a user SHALL be readable only by that user: the reader, the documentation search, the skills, the `llms.txt` pages and the MCP tools SHALL neither list it nor serve any of its pages, files or skills to anyone else, admins included, and SHALL answer for it as for an unknown repository (`NOT_FOUND`). The periodic sync SHALL keep syncing every repository, whoever owns it. Deleting a user SHALL delete their repositories and their clones.

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

### Requirement: Owner-only management procedures

The backend SHALL expose to every signed-in user procedures, under `v1.content`, to list, create, edit, delete and read the branches of their own repositories, and to sync them (the sync procedure of `content-repository-management`). They SHALL act only on repositories the caller owns: any other slug, a platform repository's included, SHALL answer `NOT_FOUND`. A user's repository SHALL be external with a `url`, `name` and `ref` (default `main`), validated like the admin's, and SHALL NOT be hosted. The `slug` SHALL follow the same rules as in `content-repository-management` and SHALL be unique across all repositories; a slug in use SHALL answer `CONFLICT`. Create and edit SHALL start a sync without waiting for it, credentials SHALL never leave the backend, and a failing sync SHALL answer `BAD_GATEWAY` with the git error, all as in `content-repository-management`. Requests without a session SHALL answer `UNAUTHORIZED`.

#### Scenario: Creating a repository

- **WHEN** `ana` creates the repository `apuntes` with the URL `https://github.com/ana/apuntes.git`
- **THEN** it SHALL be stored as hers with the ref `main`, a sync SHALL start, and only she SHALL see it

#### Scenario: Editing someone else's repository

- **WHEN** `luis` edits `apuntes`
- **THEN** the backend SHALL answer `NOT_FOUND` and change nothing

#### Scenario: Editing a platform repository

- **WHEN** a non-admin user edits the platform repository `casa` through the owner procedures
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Slug already used by another user

- **WHEN** `luis` creates a repository with the slug `apuntes`, which is `ana`'s
- **THEN** the backend SHALL answer `CONFLICT` and store nothing

#### Scenario: Hosted not offered

- **WHEN** a user asks for a hosted repository
- **THEN** the request SHALL fail input validation

### Requirement: Limits and restricted remotes

A user SHALL NOT own more than 10 repositories; creating one beyond the limit SHALL answer `BAD_REQUEST` with a Spanish message. The URL of a user's repository SHALL use `https://` and its host SHALL NOT be a loopback, private, link-local or unspecified address, whether typed as an IP literal or resolved from a name; the check SHALL run on create, on edit and before every sync. A URL that fails it SHALL be refused on create and edit (input validation) and make the sync fail with an error that does not reveal the resolved address. Admin-created repositories SHALL keep the URL rules of `content-repository-management`.

#### Scenario: Eleventh repository

- **WHEN** a user who owns 10 repositories creates another
- **THEN** the backend SHALL answer `BAD_REQUEST` and store nothing

#### Scenario: Internal address

- **WHEN** a user creates a repository with the URL `https://192.168.1.10/x.git`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Plain HTTP

- **WHEN** a user creates a repository with the URL `http://github.com/ana/x.git`
- **THEN** the request SHALL fail input validation

#### Scenario: Name that now resolves inside

- **WHEN** the host of a stored user repository starts resolving to a private address and it is synced
- **THEN** the sync SHALL fail and record an error, and no clone or fetch SHALL be attempted

### Requirement: No editor schemas for user repositories

The public editor schema endpoints of `content-contract` SHALL answer `NOT_FOUND` for a repository that belongs to a user, and the user's repositories SHALL NOT appear in any schema catalog.

#### Scenario: Schema catalog of a private repository

- **WHEN** anyone requests `/api/v1/content/schemas/apuntes`, which belongs to `ana`
- **THEN** the backend SHALL answer `NOT_FOUND`

### Requirement: Repositories screen in the profile

The profile section SHALL provide a “Repositorios” page at `/me/repositories`, listed in the profile sidebar for every signed-in user, that shows the user's own repositories as cards (name, slug, URL without credentials, ref and last sync with its time and short commit or its full error, a sync button and a menu to edit or delete) and an empty state with a button to add one. Creating and editing SHALL use a form with name, slug (editable only on creation), URL, an empty URL on edit keeping the stored one, and a ref chosen from the remote's branches once they can be read, as in `content-repository-management`; deleting SHALL ask for a confirmation. The page SHALL show how many of the allowed repositories are used. All copy SHALL be in Spanish. A request without a session SHALL be redirected to the login.

#### Scenario: Empty state

- **WHEN** a user without repositories opens `/me/repositories`
- **THEN** the page SHALL explain that the repositories are only visible to them and offer to add one

#### Scenario: Failed sync shown

- **WHEN** a user syncs a repository whose remote rejects the credentials
- **THEN** the card SHALL show the failure with git's error, without the credentials

#### Scenario: Reaching the new repository

- **WHEN** a user adds `apuntes` and its first sync succeeds
- **THEN** the reader's repository selector SHALL list `apuntes` for that user only, and `/apuntes` SHALL open its home

### Requirement: Trusted internal hosts

The server MAY list host names in `TRUSTED_GIT_HOSTS` (`environment-configuration`). A user's repository whose URL host equals a listed name SHALL be exempt from the internal-address rules of `Limits and restricted remotes`: it SHALL be accepted on create and edit and in the branch and folder listings, and its syncs SHALL NOT be refused for resolving to a private address. The URL SHALL still use `https://`, clones SHALL still use the https transport only, and the repository limit SHALL still apply. Hosts not listed SHALL stay blocked, and with the variable unset nothing SHALL change.

#### Scenario: Internal host that is listed

- **WHEN** `TRUSTED_GIT_HOSTS` is `git.noneweb.online`, that name resolves to `10.1.1.10`, and a user adds `https://git.noneweb.online/nonete/homelab`
- **THEN** the repository SHALL be stored and its sync SHALL run

#### Scenario: Another internal host

- **WHEN** the same variable is set and a user adds `https://git.otro.lan/x.git`, which resolves to `10.1.1.20`
- **THEN** the sync SHALL fail as a host that is not allowed

#### Scenario: Plain HTTP on a listed host

- **WHEN** a user adds `http://git.noneweb.online/x.git`
- **THEN** the request SHALL fail input validation

#### Scenario: Variable unset

- **WHEN** `TRUSTED_GIT_HOSTS` is unset and a user adds a host that resolves to a private address
- **THEN** the sync SHALL fail as a host that is not allowed
