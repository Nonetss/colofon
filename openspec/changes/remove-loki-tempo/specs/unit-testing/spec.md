## MODIFIED Requirements

### Requirement: Unit tests are hermetic

Unit tests SHALL NOT open a database connection, make a network call, or depend on a running service (backend, frontend, gateway or Postgres). A unit suite SHALL pass on a machine where none of those is running and no `.env` file is present, and SHALL produce the same results when a root `.env` is present. The `packages/api` suite SHALL preload a setup file (`packages/api/tests/setup.ts`) that overwrites the required server variables with placeholders (a `DATABASE_URL` pointing at a loopback port that refuses connections) and sets the optional variables that switch on integrations (`ADMIN_*`, `OIDC_*`, `SKIP_ENV_VALIDATION`) to an empty value, so loading the root `.env` cannot re-enable them. The same setup file SHALL replace `@nonete/env/server` once, for the whole run, with the shared env fixture (`testEnv` in `packages/api/tests/fixtures/env.ts`): a test turns an integration on by setting it on `testEnv`, and `resetEnv()` in `beforeEach` restores the placeholder env with every integration off. Code that queries the database SHALL be tested against the fake database fixture, never a real or in-process database. Code that calls `fetch` SHALL be tested with `fetch` replaced for the duration of the test. Results that depend on the timezone or the current time SHALL be computed under a fixed timezone and a fixed system clock.

#### Scenario: Suites pass with nothing running

- **WHEN** `bun run test` runs on a machine with no database, no dev stack and no `.env` files
- **THEN** every unit suite SHALL pass

#### Scenario: A real DATABASE_URL in the shell is never used

- **WHEN** `bun run test` runs with a `DATABASE_URL` that points at a live database exported in the shell
- **THEN** no `packages/api` or `packages/cron` test SHALL connect to that database

#### Scenario: The root .env does not re-enable integrations

- **WHEN** the `packages/api` suite runs with a root `.env` that sets `OIDC_*` or `ADMIN_*`
- **THEN** `@nonete/env/server` SHALL read those variables as unset unless a test sets them on `testEnv`

#### Scenario: An integration a test turns on does not leak

- **WHEN** a test sets `testEnv.CONTENT_DIR` and the next test starts after `resetEnv()` in `beforeEach`
- **THEN** the next test SHALL read `CONTENT_DIR` as unset

#### Scenario: Results do not depend on the machine's timezone

- **WHEN** the frontend suite runs on machines whose local timezone differs
- **THEN** every date-formatting assertion SHALL produce the same result

### Requirement: API feature handlers are covered

The `packages/api` unit suite SHALL cover the rules each feature handler enforces beyond the procedure builders, calling handlers or procedures with the fake database, with `@nonete/env/server` replaced by the shared env fixture, with the cron service bound to a fake through `bindCronService` (`#v1/cron/runtime`), and with `@nonete/auth` and `fetch` spied at their boundaries:

- `comment`: the list is nested by `parentId` and drops a soft-deleted root with no replies while keeping one with replies, with its content blanked; `counts` returns `0` for entities with no rows; `create` rejects a missing or deleted parent with `NOT_FOUND` and a parent on another entity with `BAD_REQUEST`; `update` and `delete` reject a non-author with `FORBIDDEN`; deleting an already deleted comment succeeds without writing.
- `entity-icon`: an entity type with no registered target fails with `BAD_REQUEST`; `set`/`clear` on an entity the target does not report as writable fail with `NOT_FOUND`; `getMany` returns only icons of readable entities and makes no query when none is readable; `deleteEntityIcons` with no ids makes no query.
- `organization`: assigning a role that is neither built-in nor a custom role of that organization fails with `BAD_REQUEST`; adding a user who is already a member fails with `CONFLICT`; a missing organization, member or team fails with `NOT_FOUND`.
- `session-history`: the page holds at most `limit` sessions, `nextCursor` is set only when more rows exist and decodes to the last row, and sessions without a user are skipped.
- `api-key`: the dates Better Auth returns are serialized as ISO strings or `null`.
- `cron`: `CronNotFoundError`, `CronReadOnlyError` and `CronValidationError` from the service map to `NOT_FOUND`, `CONFLICT` and `BAD_REQUEST`; `create` binds the job to the caller when `userId` is omitted and to no user when it is `null`; `listRuns` pages with a keyset cursor.

#### Scenario: Soft-deleted comment with replies stays in the tree

- **WHEN** `comment.list` loads a soft-deleted root comment that has a visible reply
- **THEN** the root SHALL be returned with empty `content` and the reply nested under it

#### Scenario: Only the author edits a comment

- **WHEN** `comment.update` is called by a user who is not the comment's author
- **THEN** the call SHALL fail with `FORBIDDEN` and no update SHALL be recorded

#### Scenario: Unknown role is rejected

- **WHEN** `organization.addMember` is called with a role that is not built-in and not a custom role of the organization
- **THEN** the call SHALL fail with `BAD_REQUEST` and no insert SHALL be recorded

#### Scenario: Loki is unreachable

- **WHEN** the `packages/api` suite runs
- **THEN** no handler under test SHALL query Loki, and no test SHALL replace `fetch` to fake a Loki response

#### Scenario: Read-only cron job

- **WHEN** the cron service throws `CronReadOnlyError` for `cron.update`
- **THEN** the handler SHALL fail with `CONFLICT`
