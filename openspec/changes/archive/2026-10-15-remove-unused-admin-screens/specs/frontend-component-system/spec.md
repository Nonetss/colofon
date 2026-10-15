## MODIFIED Requirements

### Requirement: Behavioral and visual migration parity

Migration to declarative components SHALL preserve existing routes, access
control, queries, mutations, optimistic behavior, responsive behavior and
user-visible functionality. It SHALL also preserve the quiet-editorial design
rules and the documented exceptions for authentication and global chrome.

#### Scenario: An admin resource page is migrated

- **WHEN** users or API keys adopt the shared resource APIs
- **THEN** the same authorized users SHALL retain the same available data and
  actions at the same route

#### Scenario: The cron surface is migrated

- **WHEN** the cron overview adopts shared page, state, filter or row APIs
- **THEN** grouping, admin-only mutations, URL-backed filters and detail links
  SHALL continue to behave as before

#### Scenario: A documented visual exception is encountered

- **WHEN** authentication or global navigation uses a distinct layout
- **THEN** the migration SHALL preserve that exception and limit changes to
  genuinely shared behavior or feature-internal decomposition

