## MODIFIED Requirements

### Requirement: Edits reach containers without rebuilding

`compose.dev.yml` SHALL declare `develop.watch` rules, used by `docker compose watch` / `up --watch`, so that:
- edits under an app's source (`apps/frontend/src`, `apps/frontend/public`, `apps/backend/src`) and under the `packages/*/src` the frontend uses (`api`, `auth`, `env`, `logger`, `telemetry`) are synced into the containers that use them and picked up by the running dev server without restarting the container;
- edits under the `packages/*/src` the backend uses (`api`, `auth`, `cron`, `db`, `env`, `logger`, `telemetry`) are synced into the backend container and restart it, because `bun --hot` doesn't reload synced edits to workspace packages;
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
