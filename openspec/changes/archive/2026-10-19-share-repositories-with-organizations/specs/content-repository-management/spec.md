## MODIFIED Requirements

### Requirement: Admin-only management procedures

The backend SHALL expose, under the `v1.content` procedures and only to users with the `admin` role, procedures to:
- list the platform's repositories (those that belong to no user, `user-content-repositories`), ordered by name;
- create a repository (HTTP 201), either external with a `url` or hosted;
- edit a repository's `name`, `url` and `ref`, or make it hosted, keeping omitted fields; the `slug` SHALL NOT be editable;
- delete a repository;
- sync a repository now, answering once the sync ends with the commit checked out.

Create and edit SHALL refuse a request that sends both a `url` and asks for a hosted repository; create SHALL also refuse one that sends neither. Editing a hosted repository with a `url` SHALL make it external. Every repository in a response SHALL say whether it is hosted and, for a hosted one, carry its push URL, `<platform origin>/git/<slug>.git`; an external one SHALL carry no push URL.

These procedures SHALL act only on the platform's repositories: a repository that belongs to a user SHALL answer `NOT_FOUND` to them, and the slug of one SHALL count as taken on create. A request without a session SHALL answer `UNAUTHORIZED` and one from a non-admin `FORBIDDEN`, except syncing a repository, which any signed-in user may do for the repositories they can read (every platform repository, their own and those shared with an organization they belong to, `repository-sharing`). Creating a repository with a slug already in use SHALL answer `CONFLICT` and store nothing. Editing, deleting or syncing an unknown or unreadable repository SHALL answer `NOT_FOUND`. A sync that fails SHALL answer `BAD_GATEWAY` with the git error, without credentials, and SHALL store that failure as the repository's last sync.

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

#### Scenario: Syncing a shared repository

- **WHEN** `luis`, a member of `equipo-docs`, syncs `apuntes`, which `ana` shares with `equipo-docs`
- **THEN** the sync SHALL run and answer with the commit checked out
