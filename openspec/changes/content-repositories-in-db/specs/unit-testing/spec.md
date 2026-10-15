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

- **WHEN** a test sets `testEnv.OIDC_CLIENT_ID` and the next test starts after `resetEnv()` in `beforeEach`
- **THEN** the next test SHALL read `OIDC_CLIENT_ID` as unset

#### Scenario: Results do not depend on the machine's timezone

- **WHEN** the frontend suite runs on machines whose local timezone differs
- **THEN** every date-formatting assertion SHALL produce the same result
