## ADDED Requirements

### Requirement: Shared caller-ordered keyset builder

A backend list whose caller chooses the order (one primary expression in either direction) SHALL build its ordering and its "rows after this cursor" condition through the shared `sortedKeyset` helper in `@nonete/db`, so `packages/cron` can use it without depending on `packages/api`. The helper SHALL put rows without a primary value last in both directions and break ties on a fixed tiebreak whose columns all go ascending, or all descending when the list's natural order is newest first. `cron.listRuns` (through the cron service) and `sessionHistory.list` SHALL use it.

#### Scenario: Ties follow the list's natural order

- **WHEN** `cron.listRuns` is ordered by status and several runs share a status
- **THEN** those runs SHALL come newest first, and paging with each `nextCursor` SHALL return every run exactly once

#### Scenario: The cron service stays API-agnostic

- **WHEN** `packages/cron/src/service.ts` builds the caller-ordered run query
- **THEN** it SHALL import `sortedKeyset` from `@nonete/db`, and `packages/cron/package.json` SHALL still declare no dependency on `@nonete/api`

## MODIFIED Requirements

### Requirement: Shared keyset pagination builder

Any backend list endpoint that paginates by a `(timestamp, id)` keyset cursor SHALL build its query through the shared `withKeysetPagination` Drizzle helper (`@nonete/db/keyset-pagination`) instead of hand-rolling its own `SQL[]` filter accumulation, cursor condition and `orderBy`/`limit` chain. The helper SHALL combine the defined filters, add the cursor condition `timestamp < cursor.timestamp OR (timestamp = cursor.timestamp AND id < cursor.id)` when a cursor is given, order by the timestamp and then the id descending, and apply the requested limit. It SHALL also page ascending when the caller asks for it, with `>` in the cursor condition and the timestamp and the `id` tiebreak ordered ascending; descending (newest first) SHALL stay the default.

#### Scenario: Cron runs are paginated through the shared builder

- **WHEN** `cron.listRuns` is called with filters, a cursor and a limit
- **THEN** its query SHALL be built with `withKeysetPagination` over `(cron_run.started_at, cron_run.id)`, returning only rows that match the filters and come strictly after the cursor, in the requested direction, capped at the limit

#### Scenario: Cursor ordering is stable across duplicate timestamps

- **WHEN** two or more rows share the exact same ordering timestamp (`cron_run.started_at`)
- **THEN** the query builder breaks ties using `id` in the paging direction, so no row is skipped or duplicated across pages

#### Scenario: Descending stays the default

- **WHEN** a caller builds a page without choosing a direction
- **THEN** the rows SHALL come newest first, exactly as before the direction option existed

#### Scenario: Paging oldest first

- **WHEN** a caller asks for ascending order and passes the cursor of the last row of the previous page
- **THEN** the next page SHALL hold the rows strictly after that row in `(timestamp, id)` ascending order
