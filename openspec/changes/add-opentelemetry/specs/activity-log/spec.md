## ADDED Requirements

### Requirement: Activity entries link to their trace

Each entry returned by the administrator log query SHALL include the `traceId` written on its log line, or `null` when the line has none. The query SHALL accept an optional `traceId` filter that returns only the entries written with that trace id; the existing event-type filter still applies. In `/admin/logs`, the detail of an entry with a `traceId` SHALL link to `/admin/traces?trace=<traceId>`, which opens that trace, and the page SHALL apply a trace filter given in its URL (`?trace=<traceId>`).

#### Scenario: From an entry to its trace

- **WHEN** an administrator expands an API-call entry written inside a sampled trace
- **THEN** the detail SHALL show a link to that entry's trace page

#### Scenario: Entry without a trace

- **WHEN** an entry was written with tracing disabled
- **THEN** its `traceId` SHALL be `null` and its detail SHALL show no trace link

#### Scenario: From a trace to its entries

- **WHEN** an administrator opens `/admin/logs?trace=<id>`
- **THEN** the list SHALL show only the activity entries carrying that trace id
