# Docker Dev Environment

## Purpose

Provides a hot-reloading Docker Compose dev stack with a local dev PostgreSQL that shares the native dev configuration and coexists with native dev.

## Requirements

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

### Requirement: Dev images separate from production images

Each of backend and frontend SHALL have an `apps/<app>/Dockerfile.dev` that installs dependencies with the same manifest-first cached layer as its production `Dockerfile`, copies the source and starts the app's dev server (`bun run --hot src/index.ts` for the backend, `bun run dev --host 0.0.0.0` for the frontend, whose `dev` script runs `astro dev --port 4320`). Only `compose.dev.yml` SHALL use the `Dockerfile.dev` files; the production `Dockerfile`s, `compose.yml`, `compose.prod.yml` and the CI workflow SHALL NOT.

#### Scenario: Production build unaffected

- **WHEN** CI builds the production images
- **THEN** it SHALL use the production `Dockerfile`s and never a `Dockerfile.dev`

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

### Requirement: Configurable Astro dev proxy target

`apps/frontend/astro.config.mjs` SHALL read the dev proxy target for `/rpc`, `/api`, `/scalar` and `/openapi.json` from `BACKEND_URL`, the same variable the frontend's server-side session lookups use to reach the backend, defaulting to `http://localhost:3000`. Native dev uses that default from `.env`, and the Docker dev stack overrides it with `http://backend:3000`.

#### Scenario: Native dev keeps working

- **WHEN** `bun run dev:local` runs natively without `BACKEND_URL`
- **THEN** the frontend SHALL proxy those paths to `http://localhost:3000`

### Requirement: Coexistence with native dev

Native dev (`bun run dev:local` plus `bun run gateway`) SHALL keep working alongside the Docker dev stack and serve the app at the same `https://localhost:4321`. The gateway is required for native dev, because it terminates TLS on `:4321` in front of the host processes `astro dev` (`:4320`) and backend (`:3000`). Because both setups bind the host's `:4321`, the documentation SHALL state that only one of them runs at a time.

#### Scenario: Switching back to native dev

- **WHEN** a developer stops the Docker dev stack and runs `bun run dev:local` and `bun run gateway`
- **THEN** native dev SHALL work at `https://localhost:4321` with the same root `.env` file, the same trusted CA and no extra changes

### Requirement: Persistent frontend dependency cache

`compose.dev.yml` SHALL mount a named volume on the frontend container's Vite dependency cache directory (`/app/apps/frontend/node_modules/.vite`), so the optimized dependencies survive container recreation by `bun run dev` and `bun run dev:down`. The volume SHALL NOT be a bind mount of the host repository. When dependencies change, Vite's own lockfile and config hash check SHALL invalidate the cached optimization.

#### Scenario: Restarting the dev stack

- **WHEN** a developer runs `bun run dev`, loads a page, runs `bun run dev:down` and then `bun run dev` again
- **THEN** the second start SHALL reuse the optimized dependencies from the volume, and the first page load SHALL NOT log `optimized dependencies changed. reloading` for dependencies optimized in the previous run

#### Scenario: Dependency change invalidates the cache

- **WHEN** `bun.lock` changes and compose rebuilds the frontend image
- **THEN** Vite SHALL detect the changed lockfile hash and re-optimize dependencies, never serving stale optimized modules

### Requirement: Frontend dev server warms up at startup

`apps/frontend/astro.config.mjs` SHALL configure the Astro dev server, for both native dev and the Docker dev stack, so that:
- the view-transition modules that `<ClientRouter />` injects (`astro/virtual-modules/transitions-*`) are listed in `vite.optimizeDeps.include` and optimized at startup rather than discovered on the first page load;
- `vite.server.warmup` pre-transforms, on the client side, the island entry modules mounted from `.astro` files (the feature barrels under `src/features` and the layout components imported directly from `src/components`), and on the SSR side the `.astro` pages and the middleware.

These settings SHALL only affect the dev server; `astro build` output SHALL be unchanged.

#### Scenario: First page load after startup

- **WHEN** the frontend dev server has started and a developer opens an authenticated page for the first time
- **THEN** the dev server SHALL NOT log `optimized dependencies changed. reloading`, and the browser SHALL NOT be forced into a full page reload

#### Scenario: Production build unaffected by warmup

- **WHEN** `astro build` runs for the production image
- **THEN** the build SHALL produce the same bundles as without the warmup and pre-optimization settings

### Requirement: HTTPS and HTTP/2 dev entry on the usual port

In development the app SHALL be served at `https://localhost:4321` over TLS with HTTP/2. The dev gateway SHALL:
- terminate TLS on `:4321` with a certificate issued by its local certificate authority (`tls internal`);
- negotiate `h2`, with `http/1.1` as fallback;
- forward requests with the production routing to the backend and to `astro dev` (`:4320`).

The CA SHALL persist in the named volume `gateway_data`, shared by `compose.dev.yml` and `apps/gateway/compose.yml` (both compose project `stack-dev`), so it doesn't change across restarts. The root script `dev:cert` SHALL export the CA's root certificate to a git-ignored file at the repo root, for the developer to trust in their browser once. `.env.example` SHALL set `BETTER_AUTH_URL` and `CORS_ORIGIN` to `https://localhost:4321`. The dev gateway SHALL serve no other site and SHALL NOT bind ports 80 or 443. `astro dev` SHALL fail to start rather than move to another port when `:4320` is taken.

#### Scenario: Browser negotiates HTTP/2

- **WHEN** the dev stack runs, the developer has trusted the exported CA and opens `https://localhost:4321`
- **THEN** the page and its modules SHALL be served over HTTP/2 without a certificate warning, and signing in SHALL work

#### Scenario: HMR through the gateway

- **WHEN** a developer saves a change under `apps/frontend/src` while viewing `https://localhost:4321`
- **THEN** Vite's HMR client SHALL connect through the gateway (`wss://localhost:4321`) and apply the change

#### Scenario: CA survives restarts

- **WHEN** a developer runs `bun run dev:down` and `bun run dev` again
- **THEN** the gateway SHALL reuse the same root CA, and the browser SHALL keep trusting the certificate

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
