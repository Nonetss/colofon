## MODIFIED Requirements

### Requirement: Production compose from registry images

`compose.prod.yml`, with compose project name `stack`, SHALL run `frontend`, `backend` and `gateway` from the registry images `ghcr.io/nonetss/stack-frontend:main`, `ghcr.io/nonetss/stack-backend:main` and `ghcr.io/nonetss/stack-gateway:main`. Alongside them it SHALL run a `db` service (`postgres:17`, database `stack`, password `POSTGRES_PASSWORD` from `.env`, data in the named volume `db_data`).

Containers SHALL be named `stack-<service>` and SHALL share a bridge network `stack`. The app services SHALL load `.env` through `env_file`. The backend SHALL receive `NODE_ENV=production` and `BETTER_AUTH_URL` set to the `.env`'s `CORS_ORIGIN`. The frontend SHALL receive `BACKEND_URL=http://backend:3000`. The gateway SHALL publish `${FRONTEND_PORT:-4444}:80`.

#### Scenario: Starting a deployment

- **WHEN** an operator runs `docker compose -f compose.prod.yml --env-file .env up -d` in a directory holding a `.env` written by `scripts/bootstrap.sh`
- **THEN** compose SHALL pull the `stack-*` images, start `db`, `backend`, `frontend` and `gateway`, and serve the app on `FRONTEND_PORT`

#### Scenario: Data survives a redeploy

- **WHEN** the stack is recreated with newer images
- **THEN** the database data SHALL be kept in the `db_data` volume

#### Scenario: Standalone deployment directory

- **WHEN** `compose.prod.yml` is started from a directory that contains only it and `.env`
- **THEN** every service SHALL start with its full configuration, without reading any other file

### Requirement: Healthchecks, startup order and restart policy

Every service in `compose.prod.yml` SHALL declare a healthcheck and `restart: unless-stopped`; the Bun apps SHALL run with `init: true`. The backend healthcheck SHALL request `http://localhost:3000/`, the frontend healthcheck `http://localhost:4321/login`, the `db` healthcheck SHALL run `pg_isready -U postgres -d stack`, and the gateway healthcheck SHALL probe Caddy inside its own container. The backend SHALL start only after `db` is healthy and the frontend only after the backend is healthy.

#### Scenario: Database not ready yet

- **WHEN** the stack starts and Postgres is still initializing
- **THEN** the backend SHALL NOT start until the `db` healthcheck passes

#### Scenario: Loki unavailable

- **WHEN** the production stack starts
- **THEN** it SHALL run no `loki` service, and the backend and frontend SHALL start and serve requests without one

#### Scenario: Crashed container

- **WHEN** the backend process exits unexpectedly
- **THEN** compose SHALL restart it

### Requirement: Local production-like compose

`compose.yml`, with compose project name `stack`, SHALL build the production images locally from the same `Dockerfile`s. It SHALL run `frontend`, `backend`, `gateway` and `db` with the same healthchecks, using the root `.env` (optional) through `env_file`. Its `db` service (`postgres:17`, database `stack`, data in the named volume `db_data`) SHALL publish no port, and the backend SHALL start only after it is healthy. The gateway SHALL publish `${FRONTEND_PORT:-4444}:80`. The backend SHALL receive `NODE_ENV=production`, a `DATABASE_URL` pointing at `db:5432/stack`, and `BETTER_AUTH_URL` and `CORS_ORIGIN` both set to `http://localhost:${FRONTEND_PORT:-4444}`. The root scripts `docker:build`, `docker:up`, `docker:down` and `docker:logs` SHALL operate on it.

#### Scenario: Running production images locally

- **WHEN** a developer runs `bun run docker:up` without `FRONTEND_PORT` set
- **THEN** the production images SHALL be built from source, the database SHALL start in the `db` container, and the app SHALL be served through the gateway at `http://localhost:4444`
