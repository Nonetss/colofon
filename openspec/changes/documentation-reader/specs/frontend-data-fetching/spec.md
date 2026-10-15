## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Reads wait for the value they need

A read that cannot run until some value exists (a selected id, an open entity) SHALL be skipped while the value is missing. It SHALL NOT send a request, and SHALL NOT be keyed with a stand-in value (an all-zero id, an empty string) in its place.

#### Scenario: No branch known yet

- **WHEN** `/admin/git/<slug>` renders before the repository's branch is known
- **THEN** no folder read SHALL be sent and no cache entry SHALL be keyed with a stand-in branch

## REMOVED Requirements

### Requirement: Reads that wait on a value are skipped

**Reason**: Its only scenario described the removed cron detail page.

**Migration**: Replaced by "Reads wait for the value they need", the same rule with an admin example.
