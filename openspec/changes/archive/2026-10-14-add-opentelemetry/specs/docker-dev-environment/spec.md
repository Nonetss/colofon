## MODIFIED Requirements

### Requirement: Hot-reloading Docker dev stack

The repo SHALL provide `compose.dev.yml`, with compose project name `stack-dev`, running `frontend`, `backend`, `gateway`, `db`, `loki` and `tempo` on the stack's private network. Like production, the `gateway` SHALL be the only service that publishes a port (`4321:4321`, see "HTTPS and HTTP/2 dev entry on the usual port"). `frontend`, `backend`, `db`, `loki` and `tempo` SHALL use `expose` only, and no dev service SHALL use `network_mode: host`. Each app SHALL run its development server from source: the frontend `astro dev` on `0.0.0.0:4320` and the backend `bun --hot` on `:3000`. The gateway SHALL reach them as `frontend:4320` and `backend:3000`. The apps SHALL reach Loki as `loki:3100` and send spans to `http://tempo:4318`. The backend SHALL query Tempo at `http://tempo:3200` and SHALL reach the database at `db:5432`. `bun run dev` SHALL run `docker compose -f compose.dev.yml up --build --watch` and `bun run dev:down` SHALL remove the containers.

#### Scenario: Starting the dev stack

- **WHEN** a developer runs `bun run dev`
- **THEN** compose SHALL build the dev images, start all six services with file watching enabled for the apps, and the app SHALL be reachable at `https://localhost:4321`

#### Scenario: Single published port

- **WHEN** the dev stack runs
- **THEN** only the host port `4321` SHALL be bound by the stack, and the backend (`3000`), the frontend dev server (`4320`), PostgreSQL (`5432`), Loki (`3100`) and Tempo (`3200`, `4318`) SHALL NOT be reachable from the host except through the gateway's routing

#### Scenario: Production-like routing in the dev stack

- **WHEN** the dev stack runs and the browser requests `https://localhost:4321/rpc/...`, `/api/...`, `/scalar` or `/openapi.json`
- **THEN** the gateway SHALL forward them to `backend:3000` and every other path to `frontend:4320`

### Requirement: Dev stack uses the native dev configuration

Each dev app container SHALL read its configuration from the root `.env` file that native dev reads. The only compose `environment` overrides for the apps SHALL be container addresses: `BACKEND_URL=http://backend:3000` for the frontend, `LOKI_URL=http://loki:3100` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318` for both apps, and `DATABASE_URL` (the stack's `db`) and `TEMPO_URL=http://tempo:3200` for the backend. Every other value, including `BETTER_AUTH_URL` and `CORS_ORIGIN`, SHALL come from `.env` unchanged.

#### Scenario: Shared data with native dev

- **WHEN** a developer creates a record while running the Docker dev stack, stops it, and later runs `bun run postgres:start` and native `bun run dev:local` with the default `DATABASE_URL`
- **THEN** the record SHALL be visible, because the dev stack's `db` and native dev's `db-native` keep their data in the same `db_data` volume

## REMOVED Requirements

### Requirement: External dev database

**Reason**: Development now runs its own PostgreSQL in the dev stack (and for native dev), so every developer has a database without a shared external server.
**Migration**: `bun run dev` starts the `db` service and the backend uses it automatically. For native dev, run `bun run postgres:start` and keep the `.env.example` default `DATABASE_URL` (`postgresql://postgres:postgres@localhost:5432/stack`), or point `DATABASE_URL` at any other PostgreSQL. Data on the old external server is not copied.

## ADDED Requirements

### Requirement: Local dev database

`compose.dev.yml` SHALL define a `db` service running `postgres:17` (database `stack`, user `postgres`, password `POSTGRES_PASSWORD` defaulting to `postgres`, data in the named volume `db_data`) with a `pg_isready` healthcheck, reachable only on the stack's private network. The backend SHALL wait for it to be healthy and SHALL receive `DATABASE_URL` pointing at `db:5432/stack`. For native dev, `compose.dev.yml` SHALL define a `db-native` service with the same definition under the `native` profile, published only on `127.0.0.1:${POSTGRES_PORT:-5432}` (the `DATABASE_URL` of `.env.example`). `bun run dev` SHALL NOT start it. The root scripts `postgres:start` and `postgres:stop` SHALL start (detached) and stop only `db-native`.

#### Scenario: Fresh dev stack

- **WHEN** a developer runs `bun run dev` on a machine with no database
- **THEN** the `db` service SHALL start, the backend SHALL apply the committed migrations and seed the admin against it, and the app SHALL work at `https://localhost:4321`

#### Scenario: Native dev database

- **WHEN** a developer runs `bun run postgres:start` and `bun run dev:local` with the `.env.example` defaults
- **THEN** only `db-native` SHALL start, on `127.0.0.1:5432` (or `POSTGRES_PORT`), and the backend SHALL connect to it

#### Scenario: Removing the dev containers keeps the data

- **WHEN** a developer runs `bun run dev:down` without `-v`
- **THEN** the `db_data` volume and its data SHALL be kept


### Requirement: Local Tempo service

`compose.dev.yml` SHALL define a `tempo` service running `grafana/tempo` in monolithic mode (OTLP HTTP receiver on `4318`, query API on `3200`), keeping its data in a named volume, reachable only on the stack's private network. Like Loki, Tempo SHALL be configured by the compose file alone, with no config file in the repo: flags in `command`, plus an inline compose `configs` entry for the settings Tempo only accepts as YAML (the OTLP receiver and the retention). No service SHALL wait for it. For native dev, `compose.dev.yml` SHALL define a `tempo-native` service with the same definition under the `native` profile, published only on `127.0.0.1:4318` and `127.0.0.1:3200` (the `OTEL_EXPORTER_OTLP_ENDPOINT` and `TEMPO_URL` of `.env.example`). `bun run dev` SHALL NOT start it. The root scripts `tempo:start` and `tempo:stop` SHALL start (detached) and stop only `tempo-native`.

#### Scenario: Traces in the dev stack

- **WHEN** a developer runs `bun run dev` and loads a page as an administrator
- **THEN** the frontend's and backend's spans SHALL reach `tempo` over the private network, and the trace SHALL show up at `/admin/traces`

#### Scenario: Standalone Tempo for native dev

- **WHEN** a developer runs `bun run tempo:start` and `bun run dev:local`
- **THEN** only `tempo-native` SHALL start, the apps SHALL export spans to it with the default `OTEL_EXPORTER_OTLP_ENDPOINT`, and the backend SHALL read them back with the default `TEMPO_URL`
