## MODIFIED Requirements

### Requirement: A single root env file

The repo SHALL be configured from one `.env` file at the repo root. Every workspace SHALL read it in native dev and in its CLI tasks: the backend and the TS packages (through `@nonete/env`), the frontend's Astro server and dev proxy, and the Drizzle CLI. No workspace SHALL read an `apps/<app>/.env` or `packages/<pkg>/.env`, and no workspace SHALL use varlock, a per-app `.env.schema` or a generated `env.ts`. A variable already present in the process environment SHALL take precedence over the file.

#### Scenario: One value reaches every service

- **WHEN** `DATABASE_URL` is set only in the root `.env`, `bun run dev:local` starts the backend and a developer runs the Drizzle CLI
- **THEN** both of them SHALL read that same `DATABASE_URL`

#### Scenario: Per-app files are ignored

- **WHEN** an `apps/backend/.env` exists with a different `DATABASE_URL` from the root `.env`
- **THEN** the backend and the Drizzle CLI SHALL use the root `.env` value

#### Scenario: The process environment wins

- **WHEN** `LOG_LEVEL=debug` is exported in the shell and the root `.env` sets `LOG_LEVEL=info`
- **THEN** the services started from that shell SHALL use `debug`

#### Scenario: No file in a container

- **WHEN** a production image starts with its variables provided by compose and no `.env` file inside the image
- **THEN** the service SHALL start using those variables and its defaults

### Requirement: Validated server environment

`@nonete/env/server` SHALL validate the server variables with t3-env and zod and export them as a typed `env` object:
- required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL` (URL) and `CORS_ORIGIN` (URL);
- with defaults: `NODE_ENV` (`development` | `production` | `test`, default `development`), `LOG_LEVEL` (`fatal` | `error` | `warn` | `info` | `debug` | `trace`, default `info`) and `CONTENT_REF` (default `main`);
- optional: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 8 characters), `ADMIN_NAME`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_DISCOVERY_URL`, `CONTENT_DIR` (a folder path) and `CONTENT_REPO` (a git repository URL), where `CONTENT_DIR` and `CONTENT_REPO` SHALL NOT both be set.

Empty strings SHALL be treated as unset. Validation SHALL be skipped when `SKIP_ENV_VALIDATION` is set. `@nonete/env/web` SHALL validate the client variable `PUBLIC_SERVER_URL`.

#### Scenario: Missing required variable

- **WHEN** the backend starts without `BETTER_AUTH_SECRET` and without `SKIP_ENV_VALIDATION`
- **THEN** environment validation SHALL fail and the backend SHALL NOT start

#### Scenario: Defaults apply

- **WHEN** neither `NODE_ENV`, `LOG_LEVEL` nor `CONTENT_REF` is set
- **THEN** `env.NODE_ENV` SHALL be `development`, `env.LOG_LEVEL` SHALL be `info` and `env.CONTENT_REF` SHALL be `main`

#### Scenario: Out-of-range sample ratio

- **WHEN** the backend starts with `OTEL_TRACES_SAMPLER_ARG=2`
- **THEN** environment validation SHALL NOT fail on it, because the variable is no longer part of the validated environment

#### Scenario: Two content sources

- **WHEN** the backend starts with both `CONTENT_DIR` and `CONTENT_REPO` set
- **THEN** environment validation SHALL fail and the backend SHALL NOT start

#### Scenario: Build without secrets

- **WHEN** a production image is built with `SKIP_ENV_VALIDATION=1` and no runtime variables
- **THEN** the build SHALL NOT fail on environment validation

### Requirement: One example documents every variable

The repo SHALL ship a single `.env.example` at the root that lists every variable any workspace, compose file or script reads, grouped by concern; the code that reads a variable is the source of truth for whether it belongs there. Each entry SHALL say whether it is required and what it defaults to. Uncommented lines SHALL be what local dev needs: the required values, with `DATABASE_URL` set to the dev stack's PostgreSQL as native dev reaches it (`postgresql://postgres:postgres@localhost:5432/stack`), and the optional values local dev relies on. Every other optional variable SHALL be commented out, showing its default. No `apps/*/.env.example` SHALL exist.

#### Scenario: Example covers the code

- **WHEN** a variable is read by `packages/env/src/server.ts`, `packages/env/src/web.ts`, the `astro:env` schema, the Caddyfile, a compose file or a script
- **THEN** the root `.env.example` SHALL list it

#### Scenario: Fresh checkout

- **WHEN** a developer copies `.env.example` to `.env` and fills in the required values
- **THEN** `bun run dev:local` SHALL have every value it needs from that one file

### Requirement: Compose files read the root env file

Every compose file (`compose.yml`, `compose.dev.yml`, `compose.prod.yml`) SHALL load the root `.env` for the app services and SHALL override only:
- container-network addresses (service hostnames, `BACKEND_URL`);
- container paths of host folders the compose file mounts (`CONTENT_DIR`, set to where the host's `CONTENT_DIR` is mounted, and only when the host value is set);
- values fixed by the compose file itself (such as the `CORS_ORIGIN` and `BETTER_AUTH_URL` of the port it publishes, or `BETTER_AUTH_URL` taken from `CORS_ORIGIN`);
- `NODE_ENV`.

It SHALL always use the unified names.

#### Scenario: Production overrides use unified names

- **WHEN** `compose.prod.yml` starts the stack from a `.env` written by `scripts/bootstrap.sh`
- **THEN** the backend SHALL receive the public origin as `CORS_ORIGIN` from `.env`, the same origin as `BETTER_AUTH_URL`, and `NODE_ENV=production`
- **AND** the frontend SHALL receive its internal backend address as `BACKEND_URL`

#### Scenario: Content folder inside a container

- **WHEN** the Docker dev stack starts with `CONTENT_DIR=../documentacion` in `.env`
- **THEN** the backend container SHALL receive `CONTENT_DIR` set to the container path where that folder is mounted

#### Scenario: Content repository inside a container

- **WHEN** a compose file starts the backend with `CONTENT_REPO` set and `CONTENT_DIR` unset in `.env`
- **THEN** the backend container SHALL receive `CONTENT_REPO` and `CONTENT_REF` unchanged and no `CONTENT_DIR`
