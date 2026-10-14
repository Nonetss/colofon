## MODIFIED Requirements

### Requirement: Production compose from registry images

`compose.prod.yml`, with compose project name `stack`, SHALL run `frontend`, `backend` and `gateway` from the registry images `ghcr.io/nonetss/stack-frontend:main`, `ghcr.io/nonetss/stack-backend:main` and `ghcr.io/nonetss/stack-gateway:main`. Alongside them it SHALL run:
- a `db` service (`postgres:17`, database `stack`, password `POSTGRES_PASSWORD` from `.env`, data in the named volume `db_data`);
- a `loki` service (`grafana/loki`, data in the named volume `loki_data`, 720h retention);
- a `tempo` service (`grafana/tempo`, data in the named volume `tempo_data`, 168h retention).

Because a deployment directory holds only `compose.prod.yml` and `.env`, Tempo SHALL be configured entirely inside `compose.prod.yml` (flags plus an inline `configs` entry), with the same settings as in `compose.yml`. Containers SHALL be named `stack-<service>` and SHALL share a bridge network `stack`. The app services SHALL load `.env` through `env_file`. The backend SHALL receive `NODE_ENV=production`, `BETTER_AUTH_URL` set to the `.env`'s `CORS_ORIGIN`, `LOKI_URL=http://loki:3100`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318` and `TEMPO_URL=http://tempo:3200`. The frontend SHALL receive `BACKEND_URL=http://backend:3000`, `LOKI_URL=http://loki:3100` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318`. The gateway SHALL publish `${FRONTEND_PORT:-4444}:80`.

#### Scenario: Starting a deployment

- **WHEN** an operator runs `docker compose -f compose.prod.yml --env-file .env up -d` in a directory holding a `.env` written by `scripts/bootstrap.sh`
- **THEN** compose SHALL pull the `stack-*` images, start `db`, `loki`, `tempo`, `backend`, `frontend` and `gateway`, and serve the app on `FRONTEND_PORT`

#### Scenario: Data survives a redeploy

- **WHEN** the stack is recreated with newer images
- **THEN** the database, Loki and Tempo data SHALL be kept in the `db_data`, `loki_data` and `tempo_data` volumes

#### Scenario: Standalone deployment directory

- **WHEN** `compose.prod.yml` is started from a directory that contains only it and `.env`
- **THEN** Tempo SHALL start with its full configuration, without reading any other file

### Requirement: Local production-like compose

`compose.yml`, with compose project name `stack`, SHALL build the production images locally from the same `Dockerfile`s. It SHALL run `frontend`, `backend`, `gateway`, `db`, `loki` and `tempo` with the same healthchecks, using the root `.env` (optional) through `env_file`. Its `db` service (`postgres:17`, database `stack`, data in the named volume `db_data`) SHALL publish no port, and the backend SHALL start only after it is healthy. The gateway SHALL publish `${FRONTEND_PORT:-4444}:80`. The backend SHALL receive `NODE_ENV=production`, a `DATABASE_URL` pointing at `db:5432/stack`, `BETTER_AUTH_URL` and `CORS_ORIGIN` both set to `http://localhost:${FRONTEND_PORT:-4444}`, and `TEMPO_URL=http://tempo:3200`. Both apps SHALL receive `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318`. The root scripts `docker:build`, `docker:up`, `docker:down` and `docker:logs` SHALL operate on it.

#### Scenario: Running production images locally

- **WHEN** a developer runs `bun run docker:up` without `FRONTEND_PORT` set
- **THEN** the production images SHALL be built from source, the database SHALL start in the `db` container, the app SHALL be served through the gateway at `http://localhost:4444`, and traces SHALL be browsable at `/admin/traces`
