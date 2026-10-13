## MODIFIED Requirements

### Requirement: Administrator log query

The system SHALL let administrators query indexed page-view and API-call
log entries, filterable by user, event type, path, and date range, without
exposing the underlying log store directly to the browser. The query SHALL
return entries newest first by default or oldest first when asked, and
SHALL page with an opaque cursor that continues in the requested order.

#### Scenario: Administrator filters activity by user

- **WHEN** an administrator queries the activity log filtered by a
  specific user
- **THEN** the system SHALL return only log entries attributed to that
  user

#### Scenario: Administrator filters activity by event type and date range

- **WHEN** an administrator queries the activity log filtered by event
  type (page view or API call) and a date range
- **THEN** the system SHALL return only matching log entries within that
  range

#### Scenario: Administrator pages oldest first

- **WHEN** an administrator queries the activity log with `order: "asc"`
  and then passes the returned `nextCursor`
- **THEN** the first page SHALL start at the oldest matching entry in the
  range, and the next page SHALL hold the entries strictly after the last
  entry of the first page

#### Scenario: Browser never talks to the log store directly

- **WHEN** the administrative log screen requests log data
- **THEN** the request SHALL go through the application's own
  administrator-gated API, never directly to the underlying log store
