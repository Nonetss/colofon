# Docker and CI

Four compose files, one per way of running the stack: three at the root (dev, production-like, registry) and `apps/gateway/compose.yml`. The root ones run the three app images (frontend, backend, gateway) plus stock `postgres:17`.

## Renaming on a new project

This repo is a template: the compose files still carry its own names. When a project starts from it, rename in `compose.yml`, `compose.dev.yml`, `compose.prod.yml` and `apps/gateway/compose.yml`:

- the compose project `name:` (`stack`, `stack-dev`), keeping `apps/gateway/compose.yml` on the same name as `compose.dev.yml` so both share the gateway's CA volume;
- the services' `container_name`s (`stack-*`, `stack-dev-*`), so two projects on one host don't collide;
- in `compose.yml` and `compose.prod.yml`, also the `POSTGRES_DB`; in `compose.prod.yml`, the `stack` network and the `stack-*` image names.

Renaming a service key also renames its hostname on the compose network: update the addresses that use it (`BACKEND_URL`, `DATABASE_URL`, the gateway's `routes.caddy` upstreams).

## `compose.dev.yml` (hot-reloading dev stack)

Project `stack-dev`, started by `bun run dev` (`up --build --watch`), removed by `bun run dev:down`. Runs frontend (`astro dev`, `:4320`) and backend (`bun --hot`, `:3000`) from `apps/*/Dockerfile.dev`, `gateway` from its production Dockerfile running `Caddyfile.dev` (the dev URL `https://localhost:4321`, local CA, HTTP/2, its CA in the `gateway_data` volume; plain `http://localhost:4321` is redirected to https on the same port by the `http_redirect` listener wrapper) and `db`. **Like production, only the gateway publishes a port** (`4321:4321`). Frontend (`astro dev --host 0.0.0.0`), backend and PostgreSQL stay on the stack's default network with `expose` only, and the gateway reaches them as `backend:3000` and `frontend:4320`. The apps read the root `.env`, and compose overrides only the container addresses: `BACKEND_URL=http://backend:3000` (frontend) and `DATABASE_URL` (the stack's `db`, backend), plus the backend's `CONTENT_DIR` (see the content mount below). Never add `ports` or `network_mode: host` to another dev service; a new entry point goes through the gateway.

- `db` (`postgres:17`, container `stack-dev-db`, database `stack`, password `${POSTGRES_PASSWORD:-postgres}`, volume `db_data`, `pg_isready` healthcheck; shared definition `x-db`) is the dev database, on the private network only. The backend waits for it to be healthy and gets `DATABASE_URL=postgresql://postgres:…@db:5432/stack` whatever `.env` says; on boot it applies the committed migrations and seeds the admin. Native dev uses `db-native` (profile `native`, container `stack-dev-db-native`, published on `127.0.0.1:5432` (or `POSTGRES_PORT` when 5432 is taken), the `DATABASE_URL` in `.env.example`), started and stopped by `bun run postgres:start` / `postgres:stop`. Both share `db_data`, so run one or the other; `bun run dev:down -v` deletes the data.
- One read-only bind mount, the content: when `.env` sets `CONTENT_DIR`, the backend gets that folder at `/content` (`:ro`) and `CONTENT_DIR=${CONTENT_DIR:+/content}`; unset, `/content` is the empty named volume `content_unset` and the variable stays empty. A relative `CONTENT_DIR` must start with `./` or `../`, or compose takes it for a volume name. A `CONTENT_REPO` clone lives in the named volume `content_data` on `/app/.content`. `compose.yml` and `compose.prod.yml` mount both the same way.
- No other bind mounts: `develop.watch` `sync`s app source (`apps/<app>/src`, the frontend's `public/`) and the `packages/*/src` the frontend imports (`api`, `auth`, `env`, `logger`), `sync+restart`s the `packages/*/src` the backend imports (`api`, `auth`, `content`, `cron`, `db`, `env`, `logger`: `bun --hot` was seen not to reload synced package edits, leaving a stale backend), `sync+restart`s `apps/frontend/astro.config.mjs` and the gateway's `Caddyfile.dev` and `routes.caddy`, and `rebuild`s on `bun.lock`, the root `package.json` and the app's own `package.json`. **A new TS package or source folder a service imports needs its own `sync` entry.**
- The frontend mounts the named volume `frontend_vite_cache` on `/app/apps/frontend/node_modules/.vite` (Vite's optimized-dependency cache), so recreating the container doesn't re-optimize dependencies and force a reload on the first page load. Vite invalidates it itself when the lockfile or config hash changes; `bun run dev:down -v` resets it by hand, and also the gateway's CA and the database's `db_data`. `astro.config.mjs` also pre-optimizes `@base-ui/react/**` (`optimizeDeps.include`) and warms up the island barrels, pages and middleware at dev startup (`vite.server.warmup`) — dev-only, `astro build` ignores both.

## `compose.yml` (production-like, builds from source)

Project `stack`, started by `bun run docker:up` (`up -d --build`); `docker:build`, `docker:down`, `docker:logs` are the other root scripts. The app is on `http://localhost:${FRONTEND_PORT:-4444}`.

| Service | Ports | Notes |
| --- | --- | --- |
| `frontend` | `expose` 4321 | Astro SSR only, reached through the gateway. Waits for a healthy backend. Healthcheck `bun -e fetch('http://localhost:4321/login')`. |
| `backend` | `expose` 3000 | Waits for a healthy `db`. Healthcheck `bun -e fetch('http://localhost:3000/')`. |
| `gateway` | `${FRONTEND_PORT:-4444}` → 80 | Caddy (`apps/gateway/`): `/rpc/*`, `/api/*`, `/scalar*`, `/openapi.json` → backend, the rest → frontend. Waits for a healthy frontend. Healthcheck `wget http://localhost/health`. |
| `db` | none | `postgres:17`, password `${POSTGRES_PASSWORD:-postgres}`, database `stack`, volume `db_data`. |

Every app reads the root `.env` (`required: false`); container addresses are overridden in `environment` (`references/env.md`).

## `compose.prod.yml` (registry images)

Prebuilt images `ghcr.io/nonetss/stack-{frontend,backend,gateway}:main`, the same four services on a `stack` bridge network, all reading one `.env` generated by `scripts/bootstrap.sh` in the deployment directory (`env_file: .env`, required). **Only `gateway` declares `ports`** (`${FRONTEND_PORT:-4444}:80`); every other service uses `expose` or nothing. Keep it that way: a new public route goes in the gateway's site, never as a `ports` entry on another service. The backend migrates the database and seeds the admin on startup, so a deployment needs no manual database step.

## `apps/gateway/compose.yml`

Runs only the gateway on the host network for native dev (`bun run gateway`), with the same `Caddyfile.dev`, upstreams (`localhost:3000`, `localhost:4320`) and `gateway_data` volume as `compose.dev.yml`. Same project name (`stack-dev`), so both share the volume `stack-dev_gateway_data` and therefore the CA. Required for native dev: `https://localhost:4321` is only served here.

## Dockerfiles

- `apps/backend/Dockerfile`, `apps/frontend/Dockerfile` — build and run on `oven/bun:${BUN_VERSION}-slim` (no Node; `BUN_VERSION` is an `ARG` kept in sync with the root `packageManager`; compose healthchecks use `bun -e`). Copy every workspace manifest first, `bun install --frozen-lockfile` (cache mount `/root/.bun/install/cache`), then `COPY . .` + build with `SKIP_ENV_VALIDATION=1` — dependency changes are the only thing that busts the install layer. Runtime images ship no `node_modules`: the backend copies `dist` plus `packages/db/src/migrations` (resolved as `../../packages/db/src/migrations` from `WORKDIR apps/backend`); the frontend copies `dist` and runs `dist/server/entry.mjs` on `HOST=0.0.0.0`, `PORT=4321`. The backend runtime stage and `apps/backend/Dockerfile.dev` also install `git` and `ca-certificates` (apt, Debian base) for the content sync of `CONTENT_REPO`.
  - **When adding a Bun workspace, add its `package.json` COPY line to both.**
- `apps/gateway/Dockerfile` — `caddy:2-alpine` plus `Caddyfile`, `Caddyfile.dev` and `routes.caddy` in `/etc/caddy`; `CMD` runs `Caddyfile` (the dev compose files override it with `Caddyfile.dev`); no build step. The frontend image has no proxy of its own. `routes.caddy` also sets the baseline security headers (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, no `Server`); HSTS and CSP are deliberately left out (see its comment). A feature that needs camera, microphone, geolocation, payment or USB relaxes `Permissions-Policy` there.
- `apps/{backend,frontend}/Dockerfile.dev` — dev images for `compose.dev.yml`: same dependency layer as prod, `CMD` is the app's dev server (`bun run --hot src/index.ts`, `bun run dev --host 0.0.0.0`, which is `astro dev --port 4320` on all interfaces so the gateway reaches it over the compose network). Production Dockerfiles and CI never use them. **When adding a Bun workspace, add its `package.json` COPY line to both `Dockerfile.dev`s too.**
- `.dockerignore` keeps `node_modules`, build outputs, Dockerfiles, `compose.yml` and every `.env*` (except `.env.example`) out of the build context.

## CI

`.github/workflows/docker-build.yml` — on pushes to `main`, detects which images changed (backend: `apps/backend/`, `packages/`, root manifests; frontend: `apps/frontend/`, `packages/`, root manifests; gateway: `apps/gateway/`; the workflow itself and `.dockerignore` rebuild all) and builds and pushes those of the three (`…-backend`, `…-frontend`, `…-gateway`) to `ghcr.io/<owner>/<repo>-<app>` on GitHub-hosted `ubuntu-26.04` runners (login with the workflow's `GITHUB_TOKEN`, `packages: write`; no secret to configure) with a registry layer cache. Tags: `latest`, branch name, `<branch>-<sha8>`. It runs no lint, type-check or test step.

`.gitea/workflows/docker-build.yml` — the same pipeline for the Gitea remote (Gitea runs `.gitea/workflows` and ignores `.github/workflows` when the former exists; GitHub ignores `.gitea/`, so both coexist). Same change rules (with its own file as the rebuild-all trigger) and tags, but a fixed three-entry matrix where each job runs its own change detection and skips build/push when nothing affects it (Gitea can't reliably build a matrix from a previous job's outputs), `max-parallel: 2`, `ubuntu-latest` runner label, plain `docker build` on the runner's own daemon (local layer and `--mount=type=cache` reuse, no registry cache) and push to the Gitea container registry `<gitea-host>/<owner>/<repo>-<app>` (host taken from `github.server_url`), logging in with `github.actor` and the `TOKEN` repo secret (a token with `write:package`). No deploy step. When a change rule changes, update both workflows.
