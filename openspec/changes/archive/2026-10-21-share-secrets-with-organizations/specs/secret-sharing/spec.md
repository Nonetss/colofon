## Purpose

Lets the owner of a secret share it with organizations they belong to, so every member's agent can use it through the MCP's `request` tool, under the secret's own rules and without ever seeing a value, while only the owner manages it.

## ADDED Requirements

### Requirement: Sharing a secret with organizations

The owner of a secret (`secret-management`) SHALL set the organizations it is shared with, as a whole list that replaces the previous one, choosing only among the organizations they are a member of, with any role. Sharing with an organization the owner doesn't belong to, or an unknown one, SHALL answer `NOT_FOUND` and change nothing. Only the owner SHALL change a secret's sharing: any other caller, an organization member or an admin included, SHALL get `NOT_FOUND`. Sharing SHALL only accept a session created by signing in: a request that carries an API key SHALL fail with a forbidden error saying in Spanish that the secrets are managed from the web. With `SECRETS_ENCRYPTION_KEY` unset it SHALL fail with the service-unavailable error of the other secret procedures. Requests without a session SHALL answer `UNAUTHORIZED`.

#### Scenario: Sharing with two organizations

- **WHEN** `ana`, a member of `equipo-docs` and `casa`, shares her secret `komodo` with both
- **THEN** `komodo` SHALL be shared with exactly `equipo-docs` and `casa`

#### Scenario: Stopping a share

- **WHEN** `ana` sets the sharing of `komodo` to `equipo-docs` only
- **THEN** `komodo` SHALL no longer be shared with `casa`

#### Scenario: Organization the owner isn't in

- **WHEN** `ana` shares `komodo` with `ajena`, which she doesn't belong to
- **THEN** the backend SHALL answer `NOT_FOUND` and the sharing of `komodo` SHALL stay as it was

#### Scenario: A member tries to change the sharing

- **WHEN** `luis`, a member of `equipo-docs`, sets the sharing of `ana`'s `komodo`
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Sharing with an API key

- **WHEN** a request authenticated with `ana`'s API key shares `komodo` with `equipo-docs`
- **THEN** the request SHALL fail with a forbidden error and nothing SHALL be shared

### Requirement: Names are unique within an organization

Among the secrets shared with one organization, no two SHALL have the same name, whoever owns them. Sharing a secret with an organization that already has another secret of that name shared with it, or renaming a shared secret to a name already shared with one of its organizations, SHALL answer `CONFLICT` with a Spanish message naming the organization, and change nothing.

#### Scenario: Two owners, one name

- **WHEN** `ana` has shared her `komodo` with `equipo-docs` and `marta`, also a member, shares her own `komodo` with it
- **THEN** the backend SHALL answer `CONFLICT` naming `equipo-docs`, and `marta`'s `komodo` SHALL stay unshared

#### Scenario: Renaming onto a shared name

- **WHEN** `marta` renames her `pangolin`, shared with `equipo-docs`, to `komodo`
- **THEN** the backend SHALL answer `CONFLICT` and `pangolin` SHALL keep its name

### Requirement: What organization members can do

Every member of an organization a secret is shared with SHALL see it in their secrets list and the MCP's `secrets` tool (its name, description, field names, origins, flags and whether it is unreadable, never a value) and SHALL be able to use it in the MCP's `request` tool, under the secret's own origins and flags, written with the organization's slug in front (`{{<organization>/<secret>.<field>}}`, `secret-requests`). A secret shared through several of the member's organizations SHALL be usable under each of their prefixes. The owner SHALL keep using their own secret without a prefix. A member SHALL NOT edit, delete, change the sharing of, or read another member's usage of a shared secret. Users who are neither its owner nor a member of one of its organizations SHALL NOT see or use it, admins included.

#### Scenario: A member's agent uses a shared secret

- **WHEN** `komodo` of `ana` is shared with `equipo-docs` and the agent of `luis`, a member, calls `request` with the header `X-Api-Key: {{equipo-docs/komodo.key}}` to an origin `komodo` allows
- **THEN** the request SHALL be sent with `ana`'s stored value, and `luis`'s agent SHALL only see it masked

#### Scenario: A member edits it

- **WHEN** `luis` updates or deletes `ana`'s `komodo`
- **THEN** the backend SHALL answer `NOT_FOUND` and change nothing

#### Scenario: Someone outside the organization

- **WHEN** `pablo`, who is not in `equipo-docs`, uses `{{equipo-docs/komodo.key}}`
- **THEN** the result SHALL be a tool error saying no such secret is available to him, and nothing SHALL be sent

### Requirement: When a share ends

A share SHALL end, and the organization's members SHALL stop seeing and using the secret on their next request, when the owner removes it from the sharing, when the owner leaves or is removed from that organization (whichever path ends the membership), when the organization is deleted, or when the secret or its owner is deleted. A member who leaves or is removed from an organization SHALL stop seeing the secrets shared with it, unless another organization of theirs shares them too. Changing an organization's slug SHALL change the prefix its shared secrets are written with.

#### Scenario: The owner leaves the organization

- **WHEN** `ana` leaves `equipo-docs`, with which `komodo` is shared
- **THEN** `komodo` SHALL no longer be shared with `equipo-docs`, and `luis`'s `{{equipo-docs/komodo.key}}` SHALL be refused

#### Scenario: The owner's membership ends elsewhere

- **WHEN** `ana`'s membership of `equipo-docs` is removed through a path that doesn't delete her shares
- **THEN** `luis` SHALL no longer see or use `komodo`

#### Scenario: A member is removed

- **WHEN** `luis` is removed from `equipo-docs`
- **THEN** `komodo` SHALL no longer be listed for him

### Requirement: Sharing in the secrets screen

On `/me/secrets`, each of the user's secrets SHALL show the organizations it is shared with, or that it is private, and the secret form SHALL let the owner pick, among their organizations, the ones it is shared with, with the same control as the repository form; a user with no organizations SHALL see a link to `/me/organizations` instead. A separate list SHALL show the secrets shared with the user, read-only, each with its organization, its owner's name, its field names, origins and flags, the placeholder prefix to use and a mark on the unreadable ones, saying that only its owner can fix them. All copy SHALL be in Spanish.

#### Scenario: Sharing from the form

- **WHEN** `ana` edits `komodo`, picks `equipo-docs` and saves
- **THEN** `komodo` SHALL show `equipo-docs`, and `luis` SHALL see it in his shared list

#### Scenario: No organizations

- **WHEN** a user without organizations opens the secret form
- **THEN** the sharing field SHALL say they have no organizations and link to `/me/organizations`

#### Scenario: Shared list is read-only

- **WHEN** `luis` opens `/me/secrets`
- **THEN** `komodo` SHALL be listed among the secrets shared with him, with `equipo-docs`, `ana` and the prefix `equipo-docs/`, and SHALL offer no action to edit, delete or share it
