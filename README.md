# doc

> What this project is for, the decisions behind it and what comes next (documentation site, diagrams, skills, MCP and the secrets broker): [VISION.md](VISION.md), in Spanish.

**A platform to document systems** (work infrastructure, a homelab or
anything else) that serves **people** and **AI agents** alike. The platform
knows nothing about the domain: the documentation lives in separate **content
repositories** (MDX pages plus a YAML catalog whose types and fields the
content declares), and the platform reads, validates and serves them. Secrets
are meant never to reach an AI.

It is a Turborepo monorepo with an Astro frontend and a Hono/oRPC backend
(TypeScript, Bun) behind a Caddy gateway, on PostgreSQL. It was started from
the `stack` template and keeps its packages (`@nonete/*`), conventions and
visual system, so code can move between both repos unchanged. What the
product didn't need was removed: Loki, Tempo and OpenTelemetry (with the
activity log and the trace viewer), and the admin screens for plugins,
sessions, organizations and teams (their API procedures and Better Auth
plugins stay). The rest of the base (auth, admin panel, typed API, cron
scheduler, comments, entity icons, Docker, OpenSpec) is still available.

The code is in English; the UI copy and the API error messages users see are
in Spanish.

## How it fits together

![The browser only talks to the gateway, which sends the API paths to the backend and everything else to the frontend](docs/img/architecture.svg)

- **One origin.** The gateway serves the site, the API and the hosted git
  repositories from the same host, so the browser never makes cross-origin
  calls and session cookies just work. It is the only place that maps paths to
  apps (`/rpc/*`, `/api/*`, `/git/*`, `/scalar` and `/openapi.json` go to the
  backend, everything else to the frontend); a new public route goes in
  `apps/gateway/routes.caddy` (shared by the production `Caddyfile` and the
  dev `Caddyfile.dev`), never as a published port on another service.
- **In dev, the gateway serves `https://localhost:4321`** over HTTP/2 with a
  local certificate, in front of `astro dev` on `:4320`, so dev routes exactly
  like production and Vite's many unbundled modules share one connection.
- **The backend owns the database and the content.** On startup it applies
  the committed migrations, seeds the admin user, starts the cron scheduler
  and syncs every content repository.
- **Shared packages are raw TypeScript.** `packages/*` have no build step;
  apps import their source directly.

## Features

- **Content repositories** (`packages/content`): the content contract
  (`doc.config.yaml`, MDX pages, a YAML catalog with per-type schemas), validated with
  Spanish errors per file, line and field; several repositories per platform,
  stored in the database and managed at `/admin/content`
- **Documentation reader**: every signed-in user reads the repositories'
  pages at `/<slug>/<path>`, rendered on the server from the MDX without
  executing anything, with a sidebar of sections and pages, a repository
  select ("Todos" or one repository) and an "En esta página" table of contents
- **Git hosting**: a content repository can live on the platform itself, at
  `/git/<slug>.git`, with a read-only browser at `/admin/git`
- **Editor autocompletion**: a JSON schema catalog per repository at
  `/api/v1/content/schemas/<slug>` for the YAML extension of VS Code / Cursor
- **Astro + TailwindCSS**: SSR frontend with React islands and shadcn/ui (`base-nova` on Base UI), light/dark/system theme
- **Hono + oRPC**: type-safe RPC and OpenAPI endpoints (`/rpc/v1`, `/api/v1`), versioned routing, CSRF protection, admin-only API docs at `/scalar`
- **Better Auth**: email/password (plus optional OIDC), sessions, global admin role, organizations and teams with access control, API keys
- **Drizzle + PostgreSQL**: schema per domain; committed migrations applied automatically when the backend starts
- **Cron scheduler**: persistent jobs that run cron-eligible API procedures, managed through the API (`/scalar` for admins); the content sync runs every five minutes
- **Comments and entity icons**: threaded comments and custom icons over any resource
- **PWA**: installable, with a web manifest and a service worker
- **Bun + Turborepo**: package manager and monorepo task runner
- **Biome**: linting and formatting
- **OpenSpec** (`openspec/`): spec-driven documentation of every capability

Still to come (see [VISION.md](VISION.md)): the reader's platform components,
per-type pages, full-text search and `llms.txt`, diagrams, skills for agents,
the knowledge MCP, the secrets vault and broker, and importers.

## What's in the app

Every page except login and signup requires a session.

| Route | What it is |
|---|---|
| `/` | The "Todos" home: every content repository with its description and top-level sections; redirects to `/<slug>` when the selected scope is one repository or there is only one |
| `/<slug>` | A repository's home (its `docs/index.mdx`) |
| `/<slug>/<path>` | A documentation page, with breadcrumbs, previous/next and its table of contents; admins also see the page's problems |
| `/login`, `/signup` | Sign in and create an account (email/password, plus OIDC when configured) |
| `/me` | The signed-in user's account: name, email, role, changing the name and password, and their own API keys (to hand to an AI that reads `/llms.txt`) |
| `/admin/users`, `/admin/api-keys` | Admin only: users, and the admin's own API keys as a table |
| `/admin/content` | Admin only: content repositories as cards, with their sync state, sync button and editor catalog URL |
| `/admin/git`, `/admin/git/[repo]` | Admin only: the hosted repositories, and a code screen to browse each one's branches, folders and files |
| `/scalar` | Interactive API docs (admin session) |

The navbar search (`⌘K` / `Ctrl+K`) jumps to any page and, once you type, to
the documentation pages of the selected repository (of every one under
"Todos"). Admins reach `/admin` from "Administración" in the account menu.

## Content

A content repository looks like this; the platform imposes only its shape,
the page header fields and the field types:

```txt
documentacion/
├── doc.config.yaml        # name, platform version (plataforma: "1"), extra header fields
├── docs/                  # MDX pages; each folder is a section with its index.mdx
├── catalogo/
│   └── maquinas/
│       ├── _tipo.yaml     # the type's schema
│       └── nas.yaml       # one entity per file; the file name is its id
└── skills/                # this site's own agent skills
```

Each repository registered at `/admin/content` has a name, a slug (its name in
URLs, fixed once created), a source and a ref:

- **External URL**: an `https://` git URL (GitHub, Gitea…); a private one
  carries its credentials in the URL, which the platform never shows or logs.
  The form lists the remote's branches to pick the ref.
- **Hosted on the platform**: the platform is the git server. Clone and push
  to `<origin>/git/<slug>.git`; each push to the ref's branch syncs it at
  once. **There are no credentials**: anyone who reaches the platform can
  clone and push, `--force` included.

The backend keeps a clone of each repository in `.content/<id>/` (the
`content_data` volume in Docker) and syncs it on startup, every five minutes,
when it is created or its URL or ref changes, and from its card. If a commit
leaves the content invalid, it keeps serving the last valid version. Hosted
repositories are bare repos in `.hosted/<id>/` (the `hosted_data` volume):
that may be the only copy of their history, so back it up.

For editor autocompletion, point the YAML extension at the repository's
catalog (copy the exact URL from its card):

```json
{
  "yaml.schemaStore.url": "https://<site>/api/v1/content/schemas/<slug>"
}
```

The full guide (in Spanish) is [`docs/human/contenido.md`](docs/human/contenido.md).

## The API

`packages/api` holds the oRPC router, mounted by the backend twice:

- **`/rpc/v1/...`**: the RPC protocol the frontend uses through its typed
  client (`orpc.v1.<feature>.<method>()`). Reads go out as `QUERY`, writes as
  `POST`.
- **`/api/v1/...`**: the same procedures as plain HTTP (OpenAPI), for scripts
  and other services. The document is at `/openapi.json` and the docs at
  `/scalar`. The reader's images are served from
  `/api/v1/docs/<slug>/files/<path>` (a path under the repository's `docs/`).

Each feature lives in `packages/api/src/v1/<feature>/` split into `input.ts`,
`output.ts`, `handler.ts` and `router.ts`. The v1 features are `health`,
`private`, `authConfig`, `apiKey`, `organization`, `plugins`,
`sessionHistory`, `adminUser`, `cron`, `comment`, `entityIcon`, `content` and
`docs`.

Every procedure is built from one of five builders, which decide who may call
it: `publicProcedure`, `protectedProcedure` (any signed-in user),
`adminProcedure` (global `admin` role), `permissionProcedure` (an
organization permission) and `cronProcedure` (only the scheduler, never over
HTTP). Callers authenticate with the session cookie, a Bearer token or an
`x-api-key` header.

## Auth and access

- **Better Auth** (`packages/auth`) handles sign-up, sign-in and sessions, with
  the `admin`, `organization` (teams and dynamic access control) and
  `api-key` plugins. Generic OIDC sign-in is enabled when its three env vars
  are set.
- **Global admin**: users with the `admin` role see `/admin` and the API docs.
  The first admin is created on backend startup from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` (idempotent by email).
- **Organizations** carry their own roles and permissions, checked by
  `permissionProcedure`. They have no admin screens; they are managed through
  the API.

## Cron jobs

`packages/cron` is an in-process scheduler that runs inside the backend. A job
calls an API procedure that is marked cron-eligible, with a payload, on a cron
expression, impersonating the user who owns it.

- **Code-declared jobs**: a procedure can declare its own schedule in its
  `cronMeta`. They are synced on startup, run as the seeded admin and are
  read-only (the API refuses to edit them). The content sync (`Sincronizar
  contenido`) is one; its outcome shows per repository in `/admin/content`.
- **Manual jobs**: created by admins through the `v1.cron` endpoints (try them
  at `/scalar`), choosing a handler and a payload that matches its input
  schema. There is no web interface for jobs.
- Each run is stored with its result or error, and `cron.watchRuns` streams
  run changes over SSE.

The scheduler is single-instance by design: run one backend replica.

## Logging

`packages/logger` gives every workspace the same pino logger: pretty output in
dev, JSON lines in production. Every HTTP request gets a request id that all
its log lines carry; the backend logs each one when it completes, with its
status, latency and user. Logs go to stdout only: there is no log shipping,
tracing or observability UI.

## Project Structure

```txt
doc/
├── apps/
│   ├── frontend/       # Astro app (TypeScript, Bun)
│   ├── backend/        # Hono + oRPC API, cron scheduler and git server (TypeScript, Bun)
│   └── gateway/        # Caddy: public HTTP entry point (not a workspace)
├── packages/           # Shared TypeScript libraries (bun workspaces, @nonete/*)
│   ├── api/            # oRPC contract + handlers, versioned per-feature
│   ├── auth/           # Better Auth config and permissions
│   ├── content/        # Content contract, catalog loader, editor schemas, clones and git hosting
│   ├── cron/           # Scheduler and cron job service
│   ├── db/             # Drizzle schema, migrations, seed
│   ├── env/            # @t3-oss/env-core validated env access
│   ├── logger/         # Shared pino logger
│   └── config/         # Shared tsconfig base
├── docs/               # human/ guides (Spanish), diagrams/ HTML sources, img/ exported SVGs
├── openspec/           # Capability specs (openspec/specs) and change proposals
└── scripts/
    ├── setup-dev.sh    # Generates the local root .env with real secrets
    └── bootstrap.sh    # Interactive installer: .env + docker compose (prod)
```

The frontend groups code by domain under `apps/frontend/src/features/<domain>/`
(one folder per use case: `overview`, `detail`…), with reusable UI in
`src/components/ui` (shadcn) and `src/components/shared`. Page identity
(title, label, icon, nav placement) is declared once in
`src/lib/app-surfaces.ts`.

Imports: `@nonete/<pkg>` between workspaces, `#…` subpath imports (each
package's `package.json` `imports`) inside a package, and `@/…` inside an app.

## Getting Started

Requirements: [Bun](https://bun.sh) 1.4.2, `git`, `openssl`, Docker (for the
dev PostgreSQL and the containerized stacks) and a PostgreSQL database for
development (see [Database](#database)).

```bash
git clone https://github.com/Nonetss/doc.git
cd doc
bun install
bun run setup:dev   # writes the root .env with real secrets and the admin seed
bun run dev         # Docker dev stack at https://localhost:4321
```

Then sign in as the admin `setup:dev` printed and register a content
repository at `/admin/content`. The example content repository is
`https://git.noneweb.online/nonete/documentacion`.

### Configuration

The whole repo is configured from one `.env` at the repo root; every app,
package, script and compose file reads it, and `packages/env` validates it on
startup. `.env.example` documents every variable with its default. The ones
that matter most:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | Better Auth base URL (the public origin, like `CORS_ORIGIN`) and signing secret |
| `CORS_ORIGIN` | The public origin the browser uses |
| `BACKEND_URL` | Where the frontend reaches the backend |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The admin seeded on startup |
| `OIDC_*` | Optional OIDC sign-in |

Content repositories are not configured in `.env`: they are database rows
managed at `/admin/content`. `setup:dev` leaves an existing `.env` untouched
unless you pass `--force`, and prints the admin credentials it generated.

### Database

Development runs its own PostgreSQL 17. `bun run dev` starts it as the stack's
`db` service and points the backend at it; for native dev, `bun run
postgres:start` publishes the same database on `localhost:5432`, the
`DATABASE_URL` of `.env.example`. Both keep their data in the `db_data` volume,
so they share it; `bun run dev:down -v` deletes it. There is no manual schema
step: on startup the backend applies the committed migrations from
`packages/db/src/migrations/` and creates the admin user from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. After changing the schema in `packages/db/src/schema/`,
generate a migration with `bun run db:generate`, review it, commit it and
restart the backend.

### Run everything

```bash
bun run dev        # Docker dev stack with hot reload (PostgreSQL and the gateway included); Ctrl+C stops
bun run dev:local  # the same apps natively through Turbo; also run `bun run gateway`
                   # plus `bun run postgres:start`
```

- App: [https://localhost:4321](https://localhost:4321), the dev gateway (HTTPS + HTTP/2) and the only port dev exposes. It routes `/rpc`, `/api`, `/git`, `/scalar` and `/openapi.json` to the backend and everything else to `astro dev`, exactly like production.
- API docs: [https://localhost:4321/scalar](https://localhost:4321/scalar) (admin session)
- Behind the gateway: the backend on `:3000` and `astro dev` on `:4320`. In the Docker dev stack they are only on its private network. In native dev they are host processes on those ports, but sign-in only works through `:4321`.

#### Trust the local certificate (once)

The dev gateway signs `https://localhost:4321` with Caddy's local certificate
authority, kept in the `doc-dev_gateway_data` Docker volume so it survives
restarts. After the gateway has started once:

```bash
bun run dev:cert   # writes caddy-local-root.crt (git-ignored) at the repo root
```

Import that file as a trusted certificate authority in your browser (Chrome:
`chrome://certificate-manager` → custom/local certificates → import as a
trusted authority; Firefox: Settings → Privacy & Security → Certificates →
View Certificates → Authorities → Import, trusting it for websites) and reload.
Removing the volume (`bun run dev:down -v`) creates a new CA that has to be
imported again.

### Develop in Docker (hot reload)

```bash
bun run dev        # build, start and watch; Ctrl+C stops
bun run dev:down   # remove the dev containers
```

`compose.dev.yml` runs the frontend (`astro dev` on `:4320`) and the backend
(`bun --hot`) from `apps/*/Dockerfile.dev`, the gateway with
`apps/gateway/Caddyfile.dev` and `db` (PostgreSQL). As in production, **only the gateway publishes a port**
(`https://localhost:4321`). The apps and PostgreSQL stay on the stack's private
network and reach each other by service name: compose overrides `BACKEND_URL` and
`DATABASE_URL`, and everything else comes from the root `.env` unchanged.
`docker compose watch` copies your edits into the containers:

| You edit | What happens |
|---|---|
| `apps/*/src`, `apps/frontend/public`, the `packages/*/src` the frontend uses | synced, hot reload picks it up |
| the `packages/*/src` the backend uses | synced, the backend restarts (`bun --hot` doesn't reload them) |
| `apps/frontend/astro.config.mjs`, `apps/gateway/Caddyfile.dev`, `apps/gateway/routes.caddy` | synced, that service restarts |
| `package.json`, `bun.lock` | the affected images rebuild |

- It publishes `4321`, which native dev's gateway also uses: run one or the other, not both.
- The frontend's Vite dependency cache lives in the `frontend_vite_cache` volume, so restarts don't re-optimize; `bun run dev:down -v` resets it (and the gateway's CA).
- Requires Docker Compose ≥ 2.23.1 (`watch`).

## Deployment

### Docker Compose (local, builds from source)

- Config: `compose.yml` builds `frontend`, `backend` and `gateway` from their own `apps/*/Dockerfile`, and runs `db` (PostgreSQL). Only the gateway publishes a port: the site is at `http://localhost:${FRONTEND_PORT:-4444}`.
- Build images: `bun run docker:build`
- Start: `bun run docker:up`
- Logs: `bun run docker:logs`
- Stop: `bun run docker:down`

Environment variables come from the root `.env` (`env_file:`), with
container-networking values (service hostnames, ports, the database URL)
overridden in the compose file.

### Docker Compose (production, prebuilt images)

- Config: `compose.prod.yml` pulls the prebuilt `frontend`, `backend` and `gateway` images, plus `db` (Postgres)
- Images are built by `.github/workflows/docker-build.yml` on pushes to `main`, which rebuilds only the images whose code changed, natively for `amd64` and `arm64`, and pushes them to the GitHub Container Registry as multi-arch images. On the Gitea remote, `.gitea/workflows/docker-build.yml` does the same against the Gitea container registry (needs a `TOKEN` repo secret with `write:package`)
- Only the gateway publishes a port (`FRONTEND_PORT`, default `4444`): it serves the site, the backend API and the hosted git repositories on one origin. A reverse proxy in front of the stack targets that port
- One `.env` next to `compose.prod.yml` supplies every service's configuration. It belongs to the deployment directory, not to a dev checkout
- Volumes: `db_data` (PostgreSQL), `content_data` (disposable clones, rebuilt by the next sync) and `hosted_data` (the hosted repositories: back it up)

For a fresh server, `scripts/bootstrap.sh` is a standalone installer: it
prompts for the public URL and admin credentials, generates `.env`, downloads
`compose.prod.yml` if missing, and can start the stack:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/doc/main/scripts/bootstrap.sh | bash
```

Session cookies are `Secure`, so outside `localhost` the stack must be served
over https for sign-in to work.

## Checks and Formatting

- `bun run check`: Biome format + lint
- `bun run format`: Biome format only
- `bun run check-types`: TypeScript (tsc / astro check)
- `bun run test`: the unit tests of `packages/api`, `packages/content`, `packages/cron` and `apps/frontend` (`bun test`, no database or network needed)
- `bun run tailwind:check`: Tailwind class linting (`tailwint`)

There are no git hooks.

## Available Scripts

- `bun run dev`: Start the Docker dev stack with hot reload (`compose.dev.yml`); `dev:down` removes it
- `bun run dev:local`: Start all applications natively through Turbo (needs `bun run gateway` for `https://localhost:4321`)
- `bun run dev:frontend` / `dev:backend`: Start a single app
- `bun run gateway`: Start the dev gateway in front of the native apps (`https://localhost:4321`)
- `bun run dev:cert`: Export the dev gateway's local CA root to `caddy-local-root.crt`, to trust in the browser
- `bun run build`: Build all applications
- `bun run setup:dev`: Generate the local root `.env`
- `bun run postgres:start` / `postgres:stop`: Only the dev PostgreSQL container on `127.0.0.1:5432` (`db-native`), for native dev
- `bun run db:push` / `db:generate` / `db:migrate` / `db:studio`: Drizzle schema commands
- `bun run icons:catalog`: Regenerate the Lucide icon catalog used by the entity icon picker
- `bun run check` / `bun run format`: Biome formatting and linting
- `bun run test`: Unit tests
- `bun run tailwind:check` / `tailwind:fix`: Tailwind class linting
- `bun run docker:build` / `docker:up` / `docker:down` / `docker:logs`: Local Docker Compose (`compose.yml`)

## Working on the repo

- **Spec first.** Changes go through OpenSpec: `openspec new change <name>`,
  then proposal → specs and design → tasks → implementation, and finally the
  specs are synced and the change archived (`/opsx:propose`, `/opsx:apply`,
  `/opsx:archive` in Claude Code).
- **Commits** follow Conventional Commits: `type(scope): short imperative summary`
  (`feat(frontend): …`, `fix(api): …`, `docs(openspec): …`).
- **Migrations** are generated, reviewed and committed by hand; coding agents
  never generate or edit them.
- **Before writing** a component, hook or procedure, look for an existing one
  in `components/ui`, `components/shared`, `src/hooks`, `src/lib` and the API
  routers.

## Documentation

**Start with [`VISION.md`](VISION.md) and [`docs/human/`](docs/human/README.md).**
The first explains what the platform is for and where it is going; the second
is the human-oriented guide to how it works: architecture, local development,
configuration, the API, auth, the frontend, cron jobs, Docker, the
conventions and the content repositories. Both are in Spanish. The rest of
this section lists the reference material they build on.

Every capability (auth, admin, crons, content, logging, Docker, …) has a
spec under `openspec/specs/`; finished changes are kept in
`openspec/changes/archive/`. Read those for the authoritative description of
expected behavior before changing code in an area you're unfamiliar with;
`openspec validate --specs --strict` checks they stay well-formed.

- `docs/human/`: the human documentation (Spanish), one file per topic; its diagrams are `docs/diagrams/*.html` sources exported to `docs/img/*.svg`
- `AGENTS.md`: normative conventions for contributors and coding agents
- `.agents/skills/stack/`: the project skill (workspaces, commands, env, Docker, API layering and frontend structure)
- `DESIGN.md` / `PRODUCT.md`: visual system and product context, used by the `impeccable` design skill
