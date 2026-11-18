# Repository Sharing

## Purpose

Lets the owner of a repository share it with organizations they belong to, so every member of those organizations reads its documentation as the owner does while only the owner manages it.

## Requirements

### Requirement: Sharing a repository with organizations

The owner of a repository (`user-content-repositories`) SHALL set the organizations it is shared with, as a whole list that replaces the previous one, choosing only among the organizations they are a member of, with any role. Sharing with an organization the owner doesn't belong to, or an unknown one, SHALL answer `NOT_FOUND` and change nothing. Only the owner SHALL change a repository's sharing: any other caller, an organization member or an admin included, SHALL get `NOT_FOUND`, as for the other owner procedures. Platform repositories SHALL NOT be shared, since every signed-in user already reads them. Requests without a session SHALL answer `UNAUTHORIZED`.

#### Scenario: Sharing with two organizations

- **WHEN** `ana`, a member of `equipo-docs` and `casa`, shares `apuntes` with both
- **THEN** `apuntes` SHALL be shared with exactly `equipo-docs` and `casa`

#### Scenario: Stopping a share

- **WHEN** `ana` sets the sharing of `apuntes` to `equipo-docs` only
- **THEN** `apuntes` SHALL no longer be shared with `casa`

#### Scenario: Organization the owner isn't in

- **WHEN** `ana` shares `apuntes` with `ajena`, which she doesn't belong to
- **THEN** the backend SHALL answer `NOT_FOUND` and the sharing of `apuntes` SHALL stay as it was

#### Scenario: A member tries to change the sharing

- **WHEN** `luis`, a member of `equipo-docs`, sets the sharing of `apuntes`
- **THEN** the backend SHALL answer `NOT_FOUND`

### Requirement: What organization members can do

Every member of an organization a repository is shared with SHALL read it as its owner does: it SHALL be listed in the reader's navigation, its pages, files, catalog and skills SHALL be served, it SHALL be found by the documentation search and appear in `llms.txt` and in the MCP's documentation tools, and the member SHALL sync it on demand. A member SHALL NOT edit or delete it, nor list it among their own repositories (the owner procedures and the MCP's `my_repositories`), with the one exception of its content folder (`Content folder of a shared repository`), and it SHALL keep answering `NOT_FOUND` to the public editor schema endpoints. Users who are neither its owner nor a member of one of its organizations SHALL keep getting `NOT_FOUND`, admins included.

#### Scenario: A member reads a shared repository

- **WHEN** `apuntes` is shared with `equipo-docs` and its member `luis` opens `/apuntes`
- **THEN** its home SHALL open, and `apuntes` SHALL appear in his navigation and search results

#### Scenario: A member edits it

- **WHEN** `luis` edits or deletes `apuntes` through the owner procedures
- **THEN** the backend SHALL answer `NOT_FOUND` and change nothing

#### Scenario: Someone outside the organization

- **WHEN** `pablo`, who is not in `equipo-docs`, reads a page of `apuntes`
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: A member syncs it

- **WHEN** `luis` syncs `apuntes` from the reader or the MCP's `sync`
- **THEN** the sync SHALL run as for its owner

### Requirement: Content folder of a shared repository

The backend SHALL let a member of an organization a repository is shared with change the folder of the git repository its content is read from (`path`), for the owner and every other member alike, and nothing else of it. The procedure SHALL answer only to a browser session: a request with an API key SHALL answer `FORBIDDEN`. The new folder SHALL be one the checked-out clone has: otherwise it SHALL answer `BAD_REQUEST` and change nothing. A repository the caller owns, a platform one, one not shared with them or an unknown one SHALL answer `NOT_FOUND`. The backend SHALL also list the folders of the shared repository that hold a `doc.config.yaml`, reading it with the owner's login, which SHALL never reach the member. The folder SHALL follow the same rules as the owner's.

#### Scenario: A member changes the folder

- **WHEN** `luis`, a member of `equipo-docs`, sets the folder of `apuntes` to `sitio`, which the clone has
- **THEN** `apuntes` SHALL be read from `sitio` by `ana` and by every member

#### Scenario: A folder the clone doesn't have

- **WHEN** `luis` sets the folder of `apuntes` to `no-existe`
- **THEN** the backend SHALL answer `BAD_REQUEST` and the folder SHALL stay as it was

#### Scenario: An API key

- **WHEN** a request with an API key sets the folder of `apuntes`
- **THEN** the backend SHALL answer `FORBIDDEN`

#### Scenario: Not shared with the caller

- **WHEN** `pablo`, who is not in `equipo-docs`, sets the folder of `apuntes`
- **THEN** the backend SHALL answer `NOT_FOUND`

### Requirement: When a share ends

A share SHALL end, and the organization's members SHALL stop reading the repository on their next request, when the owner removes it from the sharing, when the owner leaves or is removed from that organization, when the organization is deleted, or when the repository or its owner is deleted. A member who leaves or is removed from an organization SHALL stop reading the repositories shared with it, unless another organization of theirs shares them too.

#### Scenario: The owner leaves the organization

- **WHEN** `ana` leaves `equipo-docs`, with which `apuntes` is shared
- **THEN** `apuntes` SHALL no longer be shared with `equipo-docs`, and `luis` SHALL get `NOT_FOUND` for it

#### Scenario: A member is removed

- **WHEN** `luis` is removed from `equipo-docs`
- **THEN** `apuntes` SHALL no longer be listed for him

#### Scenario: Shared through two organizations

- **WHEN** `apuntes` is shared with `equipo-docs` and `casa`, and `luis`, a member of both, leaves `casa`
- **THEN** `luis` SHALL still read `apuntes`

### Requirement: Sharing in the repositories screen

On `/me/repositories`, each repository card SHALL show the organizations it is shared with, or that it is private, and the repository form SHALL let the owner pick, among their organizations, the ones it is shared with; a user with no organizations SHALL see a link to `/me/organizations` instead. The reader's repository selector SHALL show, for a repository shared with the user, the name of an organization it comes from. All copy SHALL be in Spanish.

#### Scenario: Sharing from the form

- **WHEN** `ana` edits `apuntes` and picks `equipo-docs`
- **THEN** after saving, the card SHALL show `equipo-docs` and its members SHALL read `apuntes`

#### Scenario: No organizations

- **WHEN** a user without organizations opens the repository form
- **THEN** the sharing field SHALL say they have no organizations and link to `/me/organizations`

#### Scenario: Shared repository in the selector

- **WHEN** `luis` opens the reader's repository selector and `apuntes` is shared with him through `equipo-docs`
- **THEN** `apuntes` SHALL be listed with `equipo-docs` as its origin

### Requirement: Shared repositories in the profile

The backend SHALL list, to every signed-in user, the repositories other users shared with them, ordered by name, each with the name of the organization it comes from (the first by name when several share it), its ref and folder, its last sync and whether it is hosted, and with neither URL, login nor git URL, which are the owner's. A repository the caller owns SHALL NOT be listed. `/me/repositories` SHALL show them, under the user's own repositories, as read-only cards in a section “Compartidos contigo” that is not shown when there are none. Each card SHALL offer a sync and a way to change the content folder, chosen from the folders of the repository once they can be read and typed otherwise, that warns the change is seen by everyone. All copy SHALL be in Spanish.

#### Scenario: Listing

- **WHEN** `luis` opens `/me/repositories` and `apuntes` is shared with him through `equipo-docs`
- **THEN** the section “Compartidos contigo” SHALL show `apuntes` with `equipo-docs`, without its URL, and without edit or delete actions

#### Scenario: Nothing shared

- **WHEN** nothing is shared with a user
- **THEN** the page SHALL NOT show the section

#### Scenario: Changing the folder

- **WHEN** `luis` picks another folder in the card of `apuntes` and saves
- **THEN** the card SHALL show the new folder and the reader SHALL read `apuntes` from it
