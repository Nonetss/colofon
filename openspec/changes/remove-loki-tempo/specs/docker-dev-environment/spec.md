## MODIFIED Requirements

### Requirement: Hot-reloading Docker dev stack

The repo SHALL provide `compose.dev.yml`, with compose project name `stack-dev`, running `frontend`, `backend`, `gateway` and `db` on the stack's private network. Like production, the `gateway` SHALL be the only service that publishes a port (`4321:4321`, see "HTTPS and HTTP/2 dev entry on the usual port"). `frontend`, `backend` and `db` SHALL use `expose` only, and no dev service SHALL use `network_mode: host`. Each app SHALL run its development server from source: the frontend `astro dev` on `0.0.0.0:4320` and the backend `bun --hot` on `:3000`. The gateway SHALL reach them as `frontend:4320` and `backend:3000`. The backend SHALL reach the database at `db:5432`. `bun run dev` SHALL run `docker compose -f compose.dev.yml up --build --watch` and `bun run dev:down` SHALL remove the containers.

#### Scenario: Starting the dev stack

- **WHEN** a developer runs `bun run dev`
- **THEN** compose SHALL build the dev images, start all four services with file watching enabled for the apps, and the app SHALL be reachable at `https://localhost:4321`

#### Scenario: Single published port

- **WHEN** the dev stack runs
- **THEN** only the host port `4321` SHALL be bound by the stack, and the backend (`3000`), the frontend dev server (`4320`) and PostgreSQL (`5432`) SHALL NOT be reachable from the host except through the gateway's routing

#### Scenario: Production-like routing in the dev stack

- **WHEN** the dev stack runs and the browser requests `https://localhost:4321/rpc/...`, `/api/...`, `/scalar` or `/openapi.json`
- **THEN** the gateway SHALL forward them to `backend:3000` and every other path to `frontend:4320`

### Requirement: Edits reach containers without rebuilding

`compose.dev.yml` SHALL declare `develop.watch` rules, used by `docker compose watch` / `up --watch`, so that:
- edits under an app's source (`apps/frontend/src`, `apps/frontend/public`, `apps/backend/src`) and under the `packages/*/src` the frontend uses (`api`, `auth`, `env`, `logger`) are synced into the containers that use them and picked up by the running dev server without restarting the container;
- edits under the `packages/*/src` the backend uses (`api`, `auth`, `cron`, `db`, `env`, `logger`) are synced into the backend container and restart it, because `bun --hot` doesn't reload synced edits to workspace packages;
- edits to `apps/frontend/astro.config.mjs` are synced and restart the frontend;
- edits to `apps/gateway/Caddyfile.dev` or `apps/gateway/routes.caddy` are synced and restart the gateway;
- edits to a dependency manifest or lockfile (`package.json`, `bun.lock`, `apps/<app>/package.json`) rebuild the affected services.

Dev images SHALL NOT bind-mount the repository, so host `node_modules` never shadow the container's own. Named volumes for caches and data (the Vite cache, the gateway's CA) are allowed.

#### Scenario: Backend code change

- **WHEN** a developer saves a change under `apps/backend/src` while the dev stack runs
- **THEN** the file SHALL be synced into the backend container and `bun --hot` SHALL reload it without a rebuild or a container restart

#### Scenario: Shared package change

- **WHEN** a developer saves a change under `packages/api/src` while the dev stack runs
- **THEN** the file SHALL be synced into the backend container and the backend SHALL restart, so it never serves the old code next to a frontend that already has the new one

#### Scenario: Frontend component change

- **WHEN** a developer saves a change under `apps/frontend/src`
- **THEN** the change SHALL appear in the browser through Astro/Vite HMR

#### Scenario: Dependency change

- **WHEN** a developer changes `bun.lock`
- **THEN** compose SHALL rebuild the frontend and backend dev images

#### Scenario: Routing table change

- **WHEN** a developer edits `apps/gateway/routes.caddy`
- **THEN** the gateway container SHALL restart with the new routing table without an image rebuild

### Requirement: Dev stack uses the native dev configuration

Each dev app container SHALL read its configuration from the root `.env` file that native dev reads. The only compose `environment` overrides for the apps SHALL be container addresses: `BACKEND_URL=http://backend:3000` for the frontend and `DATABASE_URL` (the stack's `db`) for the backend; and, for the backend, the container path of the content folder. When `.env` sets `CONTENT_DIR`, the backend container SHALL get that host folder mounted read-only and `CONTENT_DIR` overridden to the mount path; when it does not, no host folder SHALL be mounted and `CONTENT_DIR` SHALL stay unset. The backend SHALL keep a `CONTENT_REPO` clone in a named volume, so it survives recreating the container. Every other value, including `BETTER_AUTH_URL`, `CORS_ORIGIN`, `CONTENT_REPO` and `CONTENT_REF`, SHALL come from `.env` unchanged.

#### Scenario: Shared data with native dev

- **WHEN** a developer creates a record while running the Docker dev stack, stops it, and later runs `bun run postgres:start` and native `bun run dev:local` with the default `DATABASE_URL`
- **THEN** the record SHALL be visible, because the dev stack's `db` and native dev's `db-native` keep their data in the same `db_data` volume

#### Scenario: Editing content with the Docker dev stack

- **WHEN** `.env` sets `CONTENT_DIR=../documentacion` and a writer saves a new entity there while the Docker dev stack runs
- **THEN** the backend container SHALL see the new file on its next read, without a rebuild, a restart or a sync rule

#### Scenario: Content folder is read-only in the container

- **WHEN** the backend container tries to write under its content mount
- **THEN** the write SHALL fail, leaving the host folder untouched

### Requirement: Coexistence with native dev

Native dev (`bun run dev:local` plus `bun run gateway`) SHALL keep working alongside the Docker dev stack and serve the app at the same `https://localhost:4321`. The gateway is required for native dev, because it terminates TLS on `:4321` in front of the host processes `astro dev` (`:4320`) and backend (`:3000`). Because both setups bind the host's `:4321`, the documentation SHALL state that only one of them runs at a time.

#### Scenario: Switching back to native dev

- **WHEN** a developer stops the Docker dev stack and runs `bun run dev:local` and `bun run gateway`
- **THEN** native dev SHALL work at `https://localhost:4321` with the same root `.env` file, the same trusted CA and no extra changes

## REMOVED Requirements

### Requirement: Local Loki service

**Reason**: The project dropped Loki together with the activity log; no service ships logs anywhere but stdout.

**Migration**: None. Use `docker compose -f compose.dev.yml logs` or the native processes' stdout; the `loki:start` and `loki:stop` scripts are gone, and an existing `loki_data` volume stays on the host until removed by hand.

### Requirement: Local Tempo service

**Reason**: The project dropped Tempo and OpenTelemetry; nothing exports or reads traces.

**Migration**: None. The `tempo:start` and `tempo:stop` scripts are gone, and an existing `tempo_data` volume stays on the host until removed by hand.
