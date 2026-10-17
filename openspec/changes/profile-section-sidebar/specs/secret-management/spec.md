## MODIFIED Requirements

### Requirement: Secrets need the encryption key

The secrets feature SHALL be on only when `SECRETS_ENCRYPTION_KEY` is set, and `v1.secret.list` SHALL say whether it is (`enabled`). When it is unset, `v1.secret.list` SHALL answer `enabled: false` with no secrets, every other `v1.secret` procedure SHALL fail with a service-unavailable error saying in Spanish that the secrets are not configured on this server, the secrets page (`/me/secrets`) SHALL say so instead of the list, and the MCP SHALL NOT list the `secrets` and `request` tools. The rest of the platform SHALL work as before.

#### Scenario: Key unset

- **WHEN** the backend runs without `SECRETS_ENCRYPTION_KEY` and a signed-in user opens `/me/secrets`
- **THEN** the page SHALL say that secrets are not configured on this server, and SHALL offer no way to create one

#### Scenario: Writing with the key unset

- **WHEN** the backend runs without `SECRETS_ENCRYPTION_KEY` and a user calls `v1.secret.create`
- **THEN** the request SHALL fail with a service-unavailable error and nothing SHALL be stored

### Requirement: Secrets section on the profile page

The secrets page of the profile section (`/me/secrets`) SHALL list the signed-in user's secrets with their name, description, field names, origins, flags and last use, and a mark on the unreadable ones. It SHALL offer to:

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
