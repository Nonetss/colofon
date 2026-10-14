## MODIFIED Requirements

### Requirement: One example documents every variable

The repo SHALL ship a single `.env.example` at the root that lists every variable any workspace, compose file or script reads, grouped by concern; the code that reads a variable is the source of truth for whether it belongs there. Each entry SHALL say whether it is required and what it defaults to. Uncommented lines SHALL be what local dev needs: the required values, with `DATABASE_URL` set to the dev stack's PostgreSQL as native dev reaches it (`postgresql://postgres:postgres@localhost:5432/stack`), and the optional values local dev relies on, such as `LOKI_URL` set to the dev stack's Loki (`http://localhost:3100`) and `OTEL_EXPORTER_OTLP_ENDPOINT` and `TEMPO_URL` set to its Tempo (`http://localhost:4318`, `http://localhost:3200`). Every other optional variable SHALL be commented out, showing its default. No `apps/*/.env.example` SHALL exist.

#### Scenario: Example covers the code

- **WHEN** a variable is read by `packages/env/src/server.ts`, `packages/env/src/web.ts`, the `astro:env` schema, the Caddyfile, a compose file or a script
- **THEN** the root `.env.example` SHALL list it

#### Scenario: Fresh checkout

- **WHEN** a developer copies `.env.example` to `.env` and fills in the required values
- **THEN** `bun run dev:local` SHALL have every value it needs from that one file


### Requirement: Validated server environment

`@nonete/env/server` SHALL validate the server variables with t3-env and zod and export them as a typed `env` object:
- required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL` (URL) and `CORS_ORIGIN` (URL);
- with defaults: `NODE_ENV` (`development` | `production` | `test`, default `development`), `LOG_LEVEL` (`fatal` | `error` | `warn` | `info` | `debug` | `trace`, default `info`) and `OTEL_TRACES_SAMPLER_ARG` (a number from `0` to `1`, default `1`);
- optional: `LOKI_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT` (URL), `TEMPO_URL` (URL), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 8 characters), `ADMIN_NAME`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_DISCOVERY_URL`.

Empty strings SHALL be treated as unset. Validation SHALL be skipped when `SKIP_ENV_VALIDATION` is set. `@nonete/env/web` SHALL validate the client variable `PUBLIC_SERVER_URL`. The frontend's `astro:env` schema SHALL declare `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG` as optional server variables with the same meaning and default.

#### Scenario: Missing required variable

- **WHEN** the backend starts without `BETTER_AUTH_SECRET` and without `SKIP_ENV_VALIDATION`
- **THEN** environment validation SHALL fail and the backend SHALL NOT start

#### Scenario: Defaults apply

- **WHEN** neither `NODE_ENV`, `LOG_LEVEL` nor `OTEL_TRACES_SAMPLER_ARG` is set
- **THEN** `env.NODE_ENV` SHALL be `development`, `env.LOG_LEVEL` SHALL be `info` and `env.OTEL_TRACES_SAMPLER_ARG` SHALL be `1`

#### Scenario: Out-of-range sample ratio

- **WHEN** the backend starts with `OTEL_TRACES_SAMPLER_ARG=2`
- **THEN** environment validation SHALL fail and the backend SHALL NOT start

#### Scenario: Build without secrets

- **WHEN** a production image is built with `SKIP_ENV_VALIDATION=1` and no runtime variables
- **THEN** the build SHALL NOT fail on environment validation

### Requirement: Compose files read the root env file

Every compose file (`compose.yml`, `compose.dev.yml`, `compose.prod.yml`) SHALL load the root `.env` for the app services and SHALL override only:
- container-network addresses (service hostnames, `BACKEND_URL`, `LOKI_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `TEMPO_URL`);
- values fixed by the compose file itself (such as the `CORS_ORIGIN` and `BETTER_AUTH_URL` of the port it publishes, or `BETTER_AUTH_URL` taken from `CORS_ORIGIN`);
- `NODE_ENV`.

It SHALL always use the unified names.

#### Scenario: Production overrides use unified names

- **WHEN** `compose.prod.yml` starts the stack from a `.env` written by `scripts/bootstrap.sh`
- **THEN** the backend SHALL receive the public origin as `CORS_ORIGIN` from `.env`, the same origin as `BETTER_AUTH_URL`, and `NODE_ENV=production`
- **AND** the frontend SHALL receive its internal backend address as `BACKEND_URL`
- **AND** both apps SHALL receive `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318`, and the backend `TEMPO_URL=http://tempo:3200`
