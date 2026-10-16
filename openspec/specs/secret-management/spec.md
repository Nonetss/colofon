# secret-management Specification

## Purpose
Lets each user store the credentials of the services their documentation describes as personal secrets, encrypted at rest and never shown again once saved, so the MCP can use them on the user's behalf without an agent ever seeing a value.

## Requirements

### Requirement: Secret shape

A secret SHALL belong to exactly one user and SHALL have:

- a `name` of 1 to 40 characters matching `^[a-z0-9][a-z0-9-]*$`, unique among that user's secrets;
- an optional `description` of up to 500 characters, telling an agent what the secret is for;
- between 1 and 10 `fields`, each with a name of 1 to 40 characters matching `^[a-z][a-z0-9_]*$`, unique within the secret, and a non-empty value of up to 8192 characters;
- between 1 and 20 `origins`, each written `http://` or `https://` followed by a host and an optional port, with no path, query or fragment. The host MAY start with `*.` to cover every subdomain of the rest of the host (not the rest itself). Origins are stored normalized: lowercase, without a default port (80 for `http`, 443 for `https`) and without a trailing slash. Private and loopback addresses and internal host names SHALL be accepted;
- `allowWrite`, `allowInUrl` and `allowInBody` flags, each `false` unless set.

Deleting a user SHALL delete their secrets and their usage log.

#### Scenario: Komodo credentials

- **WHEN** a user creates the secret `komodo` with the fields `key` and `secret`, the origin `https://komodo.casa.lan` and `allowWrite: true`
- **THEN** the secret SHALL be stored with those two fields, that origin, `allowWrite` true and `allowInUrl` and `allowInBody` false

#### Scenario: Invalid origin

- **WHEN** a user creates a secret with the origin `https://komodo.casa.lan/api`
- **THEN** the request SHALL fail with a validation error naming the origin, and nothing SHALL be stored

#### Scenario: Normalized origin

- **WHEN** a user creates a secret with the origin `HTTPS://Pangolin.Example.com:443/`
- **THEN** the stored origin SHALL be `https://pangolin.example.com`

#### Scenario: Duplicate name

- **WHEN** a user who already has a secret `npm` creates another secret named `npm`
- **THEN** the request SHALL fail with a conflict error, and another user SHALL still be able to create their own `npm`

### Requirement: Values are encrypted and never returned

The system SHALL store every field value encrypted with an authenticated cipher under a key derived from `SECRETS_ENCRYPTION_KEY`, and SHALL NOT store it in plain text. After a value is saved, no procedure, page, log line, error message or MCP tool SHALL return or write it: they SHALL show a secret's field names only. A value SHALL be decrypted only to send it in an MCP `request`.

When a stored value can't be decrypted (the key changed or the data is corrupt), the secret SHALL stay listed and editable, marked as unreadable, and using it SHALL fail with a message asking the user to save its values again.

#### Scenario: Listing does not show values

- **WHEN** a user lists their secrets
- **THEN** each secret SHALL show its name, description, field names, origins, flags, creation and update dates and last use, and no field value

#### Scenario: Stored encrypted

- **WHEN** a secret with the field value `abc123secret` is saved and the secrets table is read directly
- **THEN** no column SHALL hold `abc123secret` in plain text

#### Scenario: Key replaced

- **WHEN** `SECRETS_ENCRYPTION_KEY` is changed after the secret `komodo` was saved, and the user lists their secrets
- **THEN** `komodo` SHALL be listed and marked as unreadable, and replacing all its values SHALL make it usable again

### Requirement: Secrets need the encryption key

The secrets feature SHALL be on only when `SECRETS_ENCRYPTION_KEY` is set, and `v1.secret.list` SHALL say whether it is (`enabled`). When it is unset, `v1.secret.list` SHALL answer `enabled: false` with no secrets, every other `v1.secret` procedure SHALL fail with a service-unavailable error saying in Spanish that the secrets are not configured on this server, the Secrets section of `/me` SHALL say so instead of the list, and the MCP SHALL NOT list the `secrets` and `request` tools. The rest of the platform SHALL work as before.

#### Scenario: Key unset

- **WHEN** the backend runs without `SECRETS_ENCRYPTION_KEY` and a signed-in user opens `/me`
- **THEN** the Secrets section SHALL say that secrets are not configured on this server, and SHALL offer no way to create one

#### Scenario: Writing with the key unset

- **WHEN** the backend runs without `SECRETS_ENCRYPTION_KEY` and a user calls `v1.secret.create`
- **THEN** the request SHALL fail with a service-unavailable error and nothing SHALL be stored

### Requirement: Managing one's own secrets

The system SHALL offer `v1.secret.list`, `v1.secret.create`, `v1.secret.update`, `v1.secret.delete` and `v1.secret.usage` to any signed-in user, whatever their role. Each SHALL act only on the caller's own secrets: no user, administrators included, SHALL list, read the usage of, change or delete another user's secret, and a secret of another user SHALL be answered as not found.

`update` SHALL change any of the name, description, origins and flags, and SHALL take the fields as a full list: a field listed with a value gets that value, a field listed without a value keeps its stored value (an error if it has none), and a stored field not listed is removed. A rename SHALL keep the usage log.

`create`, `update`, `delete` and `usage` SHALL only accept a session created by signing in. A request that carries an API key SHALL fail with a forbidden error saying in Spanish that the secrets are managed from the web, so an agent holding a key can't read the usage, add an origin or turn on a flag. `list`, which never returns values, SHALL also accept an API key, so the MCP can show an agent which secrets exist.

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
- **THEN** it SHALL receive its owner's secrets without values

### Requirement: Usage log

Every MCP `request` that passes its checks and is sent SHALL be recorded with the user, the API key used (or none, for a session), the names of the secrets used, the method, the URL without its query string or fragment and with any placeholder in its path left unsubstituted, the response status (or the failure, without values), the duration and the time. Refused requests SHALL be recorded too, with the reason. The log SHALL NOT hold headers, bodies, query strings or values. Each secret SHALL show the time of its last use.

`v1.secret.usage` SHALL return the caller's log newest first, with keyset pagination and an optional filter by secret. A code-scheduled cron job SHALL delete entries older than 90 days once a day.

#### Scenario: A recorded call

- **WHEN** an agent calls `request` with `GET https://komodo.casa.lan/read/stacks?token={{komodo.key}}` and `komodo` allows the URL
- **THEN** the log SHALL hold the secret `komodo`, `GET`, `https://komodo.casa.lan/read/stacks`, the status and the duration, and SHALL NOT hold the query string

#### Scenario: Old entries purged

- **WHEN** the purge job runs and an entry is 91 days old
- **THEN** that entry SHALL be deleted and newer ones SHALL remain

### Requirement: Secrets section on the profile page

The profile page (`/me`) SHALL have a Secrets section listing the signed-in user's secrets with their name, description, field names, origins, flags and last use, and a mark on the unreadable ones. It SHALL offer to:

- create a secret, with its name, description, origins (one per line), the three flags and its fields, each with a name and a password-type value input;
- edit one, showing each stored field's name with an empty value input that keeps the stored value when left empty, and letting the user add and remove fields;
- delete one after a confirmation;
- see a secret's recent usage.

No page SHALL ever fill a value input with a stored value. All text SHALL be in Spanish.

#### Scenario: Editing without retyping

- **WHEN** the user opens the editor of `komodo`, changes only its description and saves
- **THEN** both field values SHALL be unchanged

#### Scenario: Value never shown

- **WHEN** the user opens the editor of an existing secret
- **THEN** every value input SHALL be empty, and no response the page received SHALL hold a stored value
