## MODIFIED Requirements

### Requirement: Administrative user list

The admin panel SHALL list user accounts at `/admin/users` from an
administrator-only, cursor-paginated read (`v1.adminUser.list`) that loads
further users as the administrator scrolls. The list SHALL be orderable by
name, email, role, ban state or creation date (newest first by default) and
filterable by specific users (found by typing part of their name or email),
by role (administrator or not) and by ban state, with the order and filters
applied by the server, kept in the page URL, and the total counting the
users the filters keep. The same read SHALL accept a search term matching
the name or the email (ignoring case, at least two characters), which every
admin "pick a user" control uses. Account changes (create, password, role,
ban, delete) SHALL stay on Better Auth's admin endpoints.

#### Scenario: Administrator filters banned administrators

- **WHEN** an administrator keeps only "Administrador" in the "Rol" filter
  and only "Baneado" in the "Estado" filter
- **THEN** the list SHALL show only banned administrators, and the total
  SHALL count only them

#### Scenario: Finding a user by email or name

- **WHEN** an administrator types "nonete" in a "pick a user" control of
  the admin panel
- **THEN** the options SHALL include users whose name or whose email
  contains "nonete"

#### Scenario: Scrolling loads more users

- **WHEN** the administrator scrolls to the end of the loaded users and more
  exist
- **THEN** the next page SHALL load in the same order and filters, without
  page buttons

#### Scenario: Non-admin requests the user list

- **WHEN** a user without the `admin` role calls `v1.adminUser.list`
- **THEN** the system SHALL deny access

### Requirement: Administrative session history

The system SHALL provide administrators a read-only, cursor-paginated
session history (`v1.sessionHistory.list`), sourced from persisted session
records and ordered from newest to oldest by default. Callers SHALL be able
to order it instead by start time, expiration time, IP address, user or
status (valid before expired when ascending), in either direction, and to
filter it by status (valid or expired) and by one or more users, with the
order and the filters applied by the server across every page. The total
SHALL count the sessions the filters keep. The admin panel has no page for
it.

#### Scenario: Administrator views persisted sessions

- **WHEN** an administrator calls `v1.sessionHistory.list`
- **THEN** the system SHALL return paginated session records with the
  associated user's identity, IP address, user-agent, creation time, update
  time, expiration time, and stored session metadata, newest first

#### Scenario: Administrator orders sessions by user

- **WHEN** an administrator reads the session history sorted by user, ascending
- **THEN** the system SHALL return the first page of sessions ordered by the
  user's name, and further pages SHALL continue in that order

#### Scenario: Administrator filters sessions by user and status

- **WHEN** an administrator reads the session history filtered by two users
  and by the expired status
- **THEN** the system SHALL list only those users' expired sessions, and
  the total SHALL count only them

#### Scenario: Expired sessions remain auditable

- **WHEN** a persisted session has expired
- **THEN** the system SHALL retain it in the history and identify it as expired

#### Scenario: Non-admin requests session history

- **WHEN** a user without the `admin` role calls `v1.sessionHistory.list`
- **THEN** the system SHALL deny access

#### Scenario: Session credential remains protected

- **WHEN** an administrator reads the session history
- **THEN** the system SHALL NOT expose the session token in the API response

## ADDED Requirements

### Requirement: Enabled plugin list

The system SHALL provide administrators a read-only list of the Better Auth plugins currently enabled on the server (`v1.plugins.list`), sourced from the live server configuration rather than a hardcoded list, so it cannot drift from reality. Unrecognized plugin ids SHALL still be listed. The API SHALL NOT offer operations to enable, disable or configure a plugin. The admin panel has no page for it.

#### Scenario: Plugin list reflects the server configuration

- **WHEN** an admin calls `v1.plugins.list`
- **THEN** the system SHALL list every plugin id present in the server's Better Auth configuration

#### Scenario: Non-admin requests the plugin list

- **WHEN** a user without the `admin` role calls `v1.plugins.list`
- **THEN** the system SHALL deny access

## REMOVED Requirements

### Requirement: Plugin visibility

**Reason**: The Plugins page was removed from the admin panel; only its read stays.

**Migration**: Use “Enabled plugin list”: `v1.plugins.list` keeps returning the enabled plugins to administrators.
