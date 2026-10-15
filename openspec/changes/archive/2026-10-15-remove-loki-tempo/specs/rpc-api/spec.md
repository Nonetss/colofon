## MODIFIED Requirements

### Requirement: Feature-nested router

The router SHALL group procedures by feature, nesting each feature's procedures under its own key (for example `v1.health.check`, `v1.apiKey.create`, `v1.private.getPrivateData`). Client calls SHALL address procedures as `<version>.<feature>.<method>`, never as a flat top-level name and never omitting the version. The `v1` router SHALL contain the features `health`, `private`, `authConfig`, `apiKey`, `organization`, `plugins`, `sessionHistory`, `adminUser`, `cron`, `comment` and `entityIcon`.

#### Scenario: Client calls a nested procedure

- **WHEN** a client invokes a procedure through the typed client
- **THEN** the call SHALL take the form `orpc.<version>.<feature>.<method>()`

### Requirement: Shared cursor pagination helper

Any procedure returning a cursor-paginated list SHALL build its page through the shared pagination helper (`#shared/pagination`) rather than reimplementing the over-fetch/slice/`hasMore` steps or the `"<field>|<id>"` cursor encode/decode pair locally. The helper SHALL give every endpoint it is applied to the same `limit` bounds, the same cursor string format, the same response shape, and a `BAD_REQUEST` error on a malformed cursor.

A list whose caller chooses the order SHALL take a `sort` input (an enum of the keys it can order by, defaulting to its natural order) and an `order` input (`asc` or `desc`), and SHALL page with a shared sorted cursor that records the sort key, the order and the last row's position. That list SHALL order rows with no value for the sort key last in both directions, SHALL break ties on a unique column so no row is skipped or repeated across pages, and SHALL reject a cursor issued for another sort key or order with `BAD_REQUEST` before querying the database.

#### Scenario: Handler builds a page

- **WHEN** a handler needs to return a bounded page of rows plus a `hasMore`/next-cursor decision
- **THEN** it SHALL call the shared `paginate()` helper instead of writing its own `limit + 1` / slice / `hasMore` logic

#### Scenario: Handler encodes or decodes a keyset cursor

- **WHEN** a handler's pagination is a keyset cursor over an ordered `(timestamp, id)` pair
- **THEN** it SHALL use the shared cursor encode/decode pair, which throws `BAD_REQUEST` on a cursor that doesn't parse into a valid timestamp and id

#### Scenario: Malformed cursor is rejected

- **WHEN** a caller supplies a `cursor` value that isn't a valid `"<ISO timestamp>|<id>"` pair
- **THEN** the procedure SHALL throw `BAD_REQUEST` before querying the database

#### Scenario: Non-keyset pagination still shares the slicing helper

- **WHEN** a procedure paginates over a data source that isn't queried by keyset, so the shared encode/decode pair doesn't apply
- **THEN** it SHALL still use the shared `paginate()` slicing helper for the over-fetch/`hasMore` step, and MAY manage its own cursor value

#### Scenario: A caller-ordered list pages through every row once

- **WHEN** a caller pages through `v1.sessionHistory.list` with `sort: "ipAddress"` and `order: "desc"`, following each `nextCursor`, while several sessions share an IP address and some have none
- **THEN** every session SHALL appear exactly once, ordered by IP address descending, with the sessions without an IP address last

#### Scenario: A cursor from another order is rejected

- **WHEN** a caller passes a cursor issued for `sort: "createdAt"` together with `sort: "expiresAt"`, or with the opposite `order`
- **THEN** the procedure SHALL throw `BAD_REQUEST` before querying the database
