## MODIFIED Requirements

### Requirement: Reads of one entity share a key prefix

Every cached read of an entity SHALL be keyed under that entity's prefix, whether it goes through the typed API client or through the auth client. Keys for reads made outside the typed API client SHALL come from one key factory per entity, not be written inline. Admin user reads (a single user by id, users by ids, the user search, the user counters of the admin overview) SHALL all be keyed under the admin users prefix.

#### Scenario: A user lookup shares the users prefix

- **WHEN** a screen looks up one user by id for an admin view (the cron "runs as" user)
- **THEN** that read SHALL be keyed under the admin users prefix

#### Scenario: A new admin user read

- **WHEN** a developer adds a read of admin user data through the auth client
- **THEN** its key SHALL come from the admin users key factory
