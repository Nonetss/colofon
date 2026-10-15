## MODIFIED Requirements

### Requirement: Create an API key

The system SHALL allow a globally authenticated administrator to create an API key through the `v1.apiKey.create` procedure. The request MAY specify a `name` and an `expiresIn` value in seconds; when omitted they SHALL default to `"API Key"` and 30 days. The created key SHALL belong to the requesting administrator, use the `default` configuration, have no per-key rate limit (`rateLimitEnabled: false`), and be returned with HTTP status 201. Date fields in the response (`expiresAt`, `createdAt`, `updatedAt`, `lastRefillAt`, `lastRequest`) SHALL be serialized as ISO strings or null.

#### Scenario: Administrator creates a key with defaults

- **WHEN** a user with the global `admin` role calls `v1.apiKey.create` without input
- **THEN** the system SHALL return a new API key named `"API Key"` whose `referenceId` is the administrator's user id, whose expiry is 30 days out and whose `rateLimitEnabled` is `false`

#### Scenario: Key used many times in a day

- **WHEN** an API key created through `v1.apiKey.create` authenticates more than 10 requests within 24 hours
- **THEN** every request SHALL still resolve to the key owner's session

#### Scenario: Administrator customizes the key

- **WHEN** a user with the global `admin` role calls `v1.apiKey.create` with a `name` and `expiresIn`
- **THEN** the created key SHALL use the provided name and expire after the requested number of seconds

#### Scenario: Unauthenticated create attempt

- **WHEN** a request without a valid session calls `v1.apiKey.create`
- **THEN** the system SHALL reject it as `UNAUTHORIZED`

#### Scenario: Non-admin create attempt

- **WHEN** an authenticated user without the global `admin` role calls `v1.apiKey.create`
- **THEN** the system SHALL reject it as `FORBIDDEN`
