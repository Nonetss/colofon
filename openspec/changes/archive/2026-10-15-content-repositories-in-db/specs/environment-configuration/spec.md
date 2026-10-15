## MODIFIED Requirements

### Requirement: Validated server environment

`@nonete/env/server` SHALL validate the server variables with t3-env and zod and export them as a typed `env` object:
- required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL` (URL) and `CORS_ORIGIN` (URL);
- with defaults: `NODE_ENV` (`development` | `production` | `test`, default `development`), `LOG_LEVEL` (`fatal` | `error` | `warn` | `info` | `debug` | `trace`, default `info`);
- optional: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 8 characters), `ADMIN_NAME`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_DISCOVERY_URL`.

The content repositories are not configured through the environment: `CONTENT_DIR`, `CONTENT_REPO` and `CONTENT_REF` SHALL NOT be declared or read. Empty strings SHALL be treated as unset. Validation SHALL be skipped when `SKIP_ENV_VALIDATION` is set. `@nonete/env/web` SHALL validate the client variable `PUBLIC_SERVER_URL`.

#### Scenario: Missing required variable

- **WHEN** the backend starts without `BETTER_AUTH_SECRET` and without `SKIP_ENV_VALIDATION`
- **THEN** environment validation SHALL fail and the backend SHALL NOT start

#### Scenario: Defaults apply

- **WHEN** neither `NODE_ENV` nor `LOG_LEVEL` is set
- **THEN** `env.NODE_ENV` SHALL be `development` and `env.LOG_LEVEL` SHALL be `info`

#### Scenario: Retired content variables

- **WHEN** the repo (excluding archived OpenSpec changes) is searched for `CONTENT_DIR`, `CONTENT_REPO` and `CONTENT_REF`
- **THEN** no env schema, `.env.example`, compose file, script or current document SHALL reference them

#### Scenario: Two content sources

- **WHEN** the backend starts with the retired `CONTENT_DIR` and `CONTENT_REPO` both still set
- **THEN** environment validation SHALL NOT fail on them and the backend SHALL start, reading no content from them

#### Scenario: Build without secrets

- **WHEN** a production image is built with `SKIP_ENV_VALIDATION=1` and no runtime variables
- **THEN** the build SHALL NOT fail on environment validation

### Requirement: Compose files read the root env file

Every compose file (`compose.yml`, `compose.dev.yml`, `compose.prod.yml`) SHALL load the root `.env` for the app services and SHALL override only:
- container-network addresses (service hostnames, `BACKEND_URL`);
- values fixed by the compose file itself (such as the `CORS_ORIGIN` and `BETTER_AUTH_URL` of the port it publishes, or `BETTER_AUTH_URL` taken from `CORS_ORIGIN`);
- `NODE_ENV`.

It SHALL always use the unified names.

#### Scenario: Production overrides use unified names

- **WHEN** `compose.prod.yml` starts the stack from a `.env` written by `scripts/bootstrap.sh`
- **THEN** the backend SHALL receive the public origin as `CORS_ORIGIN` from `.env`, the same origin as `BETTER_AUTH_URL`, and `NODE_ENV=production`
- **AND** the frontend SHALL receive its internal backend address as `BACKEND_URL`

#### Scenario: Content folder inside a container

- **WHEN** the Docker dev stack starts with a leftover `CONTENT_DIR=../documentacion` in `.env`
- **THEN** the backend container SHALL get no host content folder mounted and no `CONTENT_DIR` override

#### Scenario: Content repository inside a container

- **WHEN** any compose file starts the backend
- **THEN** it SHALL set no content variable, and the backend SHALL read its content repositories from the database
