## ADDED Requirements

### Requirement: Saved git credentials

A saved git credential SHALL belong to exactly one user and SHALL hold a `host` (the host and optional port of a git server, lowercase), a `username` and a token. The token SHALL be stored encrypted at rest with the secrets' key (`SECRETS_ENCRYPTION_KEY`), bound to the credential's id and owner, and SHALL never be returned by any procedure, written to a log or included in an error. A user SHALL have at most one credential per host and username. Deleting a user SHALL delete their credentials. The feature SHALL be off while `SECRETS_ENCRYPTION_KEY` is unset.

#### Scenario: Token never returned

- **WHEN** a user saves a credential and lists their credentials
- **THEN** the list SHALL show its host and username and SHALL NOT contain the token

#### Scenario: Same host and user replaces the token

- **WHEN** a user saves a credential for `git.example.com` and `ana`, and later saves another for the same host and user with a new token
- **THEN** there SHALL be one credential, holding the new token

### Requirement: Credential procedures

The backend SHALL expose to every signed-in user, from a browser session, procedures to list, save and delete their own credentials; they SHALL act only on the caller's credentials, another user's id answering `NOT_FOUND`. Save SHALL take `host`, `username` and `token` (the host validated as a host with optional port, the username and token non-empty) and SHALL be idempotent by host and username. The list SHALL say whether the feature is enabled. Deleting a credential that a repository uses SHALL answer `CONFLICT` and delete nothing. While the feature is off, save SHALL answer an error explaining that credentials can't be saved. Requests without a session SHALL answer `UNAUTHORIZED`.

#### Scenario: Another user's credential

- **WHEN** a user deletes the id of a credential that belongs to someone else
- **THEN** the procedure SHALL answer `NOT_FOUND` and the credential SHALL remain

#### Scenario: Credential in use

- **WHEN** a user deletes a credential that one of their repositories references
- **THEN** the procedure SHALL answer `CONFLICT` and the credential SHALL remain

### Requirement: Repositories use a saved credential

An external repository SHALL optionally reference one of the caller's credentials, by `credentialId` on create and edit (`null` on edit removing it). The credential's host SHALL equal the host of the repository's URL, otherwise the request SHALL answer `BAD_REQUEST`; a credential of another user SHALL answer `NOT_FOUND`. A repository's URL SHALL then be stored without credentials. Whenever the backend clones, syncs or reads the branches or folders of the repository, it SHALL use the URL with the credential's username and token, so replacing the token takes effect on the next sync. A credential that can't be decrypted SHALL fail the sync with a Spanish error that says the credential must be saved again, without values. Management responses SHALL include the repository's `credentialId` and never a token; the credential's host and username are read from the credentials list.

#### Scenario: Token rotated

- **WHEN** a user saves the credential for `git.example.com` and `ana` again with a new token
- **THEN** the next sync of every repository that uses it SHALL clone with the new token

#### Scenario: Credential for another host

- **WHEN** a user creates a repository at `https://other.example.com/org/docs` with a credential for `git.example.com`
- **THEN** the request SHALL answer `BAD_REQUEST` and store nothing

#### Scenario: Existing credentialed URLs

- **WHEN** a repository was stored with credentials inside its URL and no `credentialId`
- **THEN** it SHALL keep syncing with them

### Requirement: Credential picker in the repository form

In the repository form the user SHALL be able to choose, for the URL's host, one of their saved credentials, none, or a new one entered as a username and a masked token, which is saved on submit and referenced by the repository. Typing a URL whose host has a saved credential SHALL preselect it (the only one, or the most recently used). While the feature is off the form SHALL offer the username and token only to be put in the URL as typed. The profile's “Repositorios” page SHALL list the user's credentials by host and username, with replace-token and delete actions, a delete refused while in use showing why. The copy SHALL describe the token as created in the user's own git server with read access, naming no git product. All copy SHALL be in Spanish.

#### Scenario: Second repository on the same server

- **WHEN** a user who saved a credential for `git.example.com` types the URL of another repository on that host
- **THEN** the form SHALL preselect the credential and ask for no username or token

#### Scenario: New credential saved once

- **WHEN** a user enters a username and a token for a host without credentials and submits
- **THEN** the credential SHALL be saved and the repository SHALL reference it

#### Scenario: Feature off

- **WHEN** the platform has no encryption key and the user enters a username and a token
- **THEN** the form SHALL send the URL with those credentials inside it
