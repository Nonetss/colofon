## MODIFIED Requirements

### Requirement: Credential procedures

The backend SHALL expose to every signed-in user procedures to list, save and delete their own credentials; they SHALL act only on the caller's credentials, another user's id answering `NOT_FOUND`. The list SHALL be available with a browser session or an API key; save and delete SHALL be available only from a browser session, and a request with an API key SHALL answer `FORBIDDEN`. Save SHALL take `host`, `username` and `token` (the host validated as a host with optional port, the username and token non-empty) and SHALL be idempotent by host and username. The list SHALL say whether the feature is enabled. Deleting a credential that a repository uses SHALL answer `CONFLICT` and delete nothing. While the feature is off, save SHALL answer an error explaining that credentials can't be saved. Requests without a session SHALL answer `UNAUTHORIZED`.

#### Scenario: Another user's credential

- **WHEN** a user deletes the id of a credential that belongs to someone else
- **THEN** the procedure SHALL answer `NOT_FOUND` and the credential SHALL remain

#### Scenario: Credential in use

- **WHEN** a user deletes a credential that one of their repositories references
- **THEN** the procedure SHALL answer `CONFLICT` and the credential SHALL remain

#### Scenario: Listing with an API key

- **WHEN** a user lists their credentials with an API key
- **THEN** the procedure SHALL return their hosts and usernames, without tokens

#### Scenario: Saving with an API key

- **WHEN** a request with an API key saves or deletes a credential
- **THEN** the procedure SHALL answer `FORBIDDEN` and change nothing
