# Frontend Data Fetching

## Purpose

Defines how the frontend reads and writes server state through its shared query cache, so that what a screen shows stays consistent with what the user just changed, errors that a retry can't fix appear at once, and reads that wait on a value never reach the server.

## Requirements

### Requirement: Reads of one entity share a key prefix

Every cached read of an entity SHALL be keyed under that entity's prefix, whether it goes through the typed API client or through the auth client. Keys for reads made outside the typed API client SHALL come from one key factory per entity, not be written inline. Admin user reads (a single user by id, users by ids, the user search, the user counters of the admin overview) SHALL all be keyed under the admin users prefix.

#### Scenario: A user lookup shares the users prefix

- **WHEN** a screen looks up one user by id for an admin view (the cron "runs as" user)
- **THEN** that read SHALL be keyed under the admin users prefix

#### Scenario: A new admin user read

- **WHEN** a developer adds a read of admin user data through the auth client
- **THEN** its key SHALL come from the admin users key factory

### Requirement: Mutations refresh every read of what they changed

A mutation SHALL invalidate every cached read that shows the entity it changed: its lists, its detail and every derived read (counters, statuses, searches). An admin user mutation (create, ban, unban, remove, role change) SHALL invalidate the whole admin users prefix.

#### Scenario: A role change reaches the user lookups

- **WHEN** an administrator changes a user's role and then opens a page that shows that user
- **THEN** the page SHALL show the new role without a page reload

#### Scenario: A new user is searchable at once

- **WHEN** an administrator creates a user and then searches for it in a user picker
- **THEN** the search SHALL return the new user

#### Scenario: Overview counters follow bans

- **WHEN** an administrator bans a user and then opens the admin overview in the same session
- **THEN** the banned users counter SHALL include that user

### Requirement: A mutation settles after its refetch

A mutation that invalidates cached reads SHALL stay pending until those reads have refetched, so a control that waits on the mutation (a dialog's submit button, a dialog that closes on success) SHALL NOT show the pre-mutation data once it is no longer pending.

#### Scenario: Creating from a dialog

- **WHEN** a user submits a create dialog for a list and the server accepts it
- **THEN** the mutation SHALL report pending until the list has refetched, and the list visible after the dialog closes SHALL include the new item

### Requirement: Client errors are not retried

A read that fails with a client error (an HTTP status from 400 to 499 other than 408 and 429, from the typed API client or from the auth client) SHALL NOT be retried and SHALL surface its error state at once. Other failures (408 timeouts, 429 rate limits, server errors, network failures, errors without a status) SHALL keep being retried a bounded number of times with backoff before surfacing.

#### Scenario: A deleted resource

- **WHEN** a detail screen reads a resource that no longer exists and the server answers 404
- **THEN** the screen SHALL show its error state after that single request

#### Scenario: A server error

- **WHEN** a read fails with a 5xx status, a 429 or a network failure
- **THEN** it SHALL be retried before the error state is shown

### Requirement: Reads wait for the value they need

A read that cannot run until some value exists (a selected id, an open entity) SHALL be skipped while the value is missing. It SHALL NOT send a request, and SHALL NOT be keyed with a stand-in value (an all-zero id, an empty string) in its place.

#### Scenario: No branch known yet

- **WHEN** `/admin/git/<slug>` renders before the repository's branch is known
- **THEN** no folder read SHALL be sent and no cache entry SHALL be keyed with a stand-in branch
