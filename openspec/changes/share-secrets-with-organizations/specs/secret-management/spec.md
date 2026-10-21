## MODIFIED Requirements

### Requirement: Managing one's own secrets

The system SHALL offer `v1.secret.list`, `v1.secret.create`, `v1.secret.update`, `v1.secret.delete`, `v1.secret.share` and `v1.secret.usage` to any signed-in user, whatever their role. `create`, `update`, `delete` and `share` SHALL act only on the caller's own secrets: no user, administrators and members of an organization the secret is shared with included, SHALL change, share or delete another user's secret, and a secret of another user SHALL be answered as not found.

`list` SHALL return the caller's own secrets, each with the organizations it is shared with (id, name, slug), and, separately, the secrets shared with the caller through their organizations (`secret-sharing`), each with its organization (id, name, slug), its owner's name and the placeholder prefix to write it with; a secret shared with the caller through several organizations SHALL be listed once per organization. Neither list SHALL hold a value. The caller's own secrets SHALL NOT appear among the shared ones.

`update` SHALL change any of the name, description, origins and flags, and SHALL take the fields as a full list: a field listed with a value gets that value, a field listed without a value keeps its stored value (an error if it has none), and a stored field not listed is removed. A rename SHALL keep the usage log and SHALL answer `CONFLICT` when the new name is already shared with one of the secret's organizations.

`create`, `update`, `delete`, `share` and `usage` SHALL only accept a session created by signing in. A request that carries an API key SHALL fail with a forbidden error saying in Spanish that the secrets are managed from the web, so an agent holding a key can't read the usage, add an origin, turn on a flag or share a secret. `list`, which never returns values, SHALL also accept an API key, so the MCP can show an agent which secrets exist.

#### Scenario: Replace one value

- **WHEN** the user updates `komodo` listing `key` with a new value and `secret` without one
- **THEN** `key` SHALL hold the new value and `secret` SHALL keep its old one

#### Scenario: Remove a field

- **WHEN** the user updates `npm` listing only `token`, with a value, while it stored `username` and `password`
- **THEN** `npm` SHALL have only the field `token`

#### Scenario: Another user's secret

- **WHEN** a user calls `v1.secret.delete` with the id of a secret owned by someone else
- **THEN** the request SHALL fail with a not-found error and the secret SHALL remain

#### Scenario: API key cannot widen a secret

- **WHEN** a request authenticated with an API key in `x-api-key` calls `v1.secret.update` to add an origin to its owner's secret
- **THEN** the request SHALL fail with a forbidden error and the secret SHALL be unchanged

#### Scenario: API key can list

- **WHEN** a request authenticated with an API key calls `v1.secret.list`
- **THEN** it SHALL receive its owner's secrets and the secrets shared with its owner, without values

#### Scenario: Listing shared secrets

- **WHEN** `ana`'s `komodo` is shared with `equipo-docs` and its member `luis` calls `v1.secret.list`
- **THEN** `komodo` SHALL be among his shared secrets with the organization `equipo-docs`, the owner `ana` and the prefix `equipo-docs/`, and not among his own

### Requirement: Usage log

Every MCP `request` that passes its checks and is sent SHALL be recorded with the calling user, the API key used (or none, for a session), the secrets used and their names as written (a shared secret with its prefix), the method, the URL without its query string or fragment and with any placeholder in its path left unsubstituted, the response status (or the failure, without values), the duration and the time. Refused requests SHALL be recorded too, with the reason. The log SHALL NOT hold headers, bodies, query strings or values. Each secret SHALL show the time of its last use, by whoever used it.

`v1.secret.usage` SHALL return, newest first, with keyset pagination and an optional filter by secret, the calls the caller made and the calls anyone made with a secret the caller owns, each with the name of the user who made it. A member SHALL NOT see the calls other members made with a shared secret. A code-scheduled cron job SHALL delete entries older than 90 days once a day.

#### Scenario: A recorded call

- **WHEN** an agent calls `request` with `GET https://komodo.casa.lan/read/stacks?token={{komodo.key}}` and `komodo` allows the URL
- **THEN** the log SHALL hold the secret `komodo`, `GET`, `https://komodo.casa.lan/read/stacks`, the status and the duration, and SHALL NOT hold the query string

#### Scenario: The owner sees a member's call

- **WHEN** `luis`'s agent sends a request with `{{equipo-docs/komodo.key}}` and `ana`, the owner of `komodo`, reads its usage
- **THEN** she SHALL see that call, made by `luis`, with the name `equipo-docs/komodo`

#### Scenario: A member doesn't see other members' calls

- **WHEN** `luis` and `marta`, both members of `equipo-docs`, use `komodo`, and `luis` reads his usage
- **THEN** he SHALL see his own calls and not `marta`'s

#### Scenario: Old entries purged

- **WHEN** the purge job runs and an entry is 91 days old
- **THEN** that entry SHALL be deleted and newer ones SHALL remain

### Requirement: Secrets section on the profile page

The secrets page of the profile section (`/me/secrets`) SHALL list the signed-in user's secrets with their name, description, field names, origins, flags, the organizations each is shared with and last use, and a mark on the unreadable ones. It SHALL offer to:

- create a secret, with its name, description, origins (one per line), the three flags, its fields, each with a name and a password-type value input, and the organizations it is shared with;
- edit one, showing each stored field's name with an empty value input that keeps the stored value when left empty, letting the user add and remove fields and change the organizations it is shared with;
- delete one after a confirmation;
- see a secret's recent usage, with who made each call.

Below, it SHALL list the secrets shared with the user, read-only (`secret-sharing`). No page SHALL ever fill a value input with a stored value. All text SHALL be in Spanish.

#### Scenario: Editing without retyping

- **WHEN** the user opens the editor of `komodo`, changes only its description and saves
- **THEN** both field values SHALL be unchanged

#### Scenario: Value never shown

- **WHEN** the user opens the editor of an existing secret
- **THEN** every value input SHALL be empty, and no response the page received SHALL hold a stored value
